import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("AuthContext: Initializing session...");

        // BOOT TIMEOUT: 1.5s balanced timeout (faster than original 5s, but reliable)
        const sessionCheck = supabase.auth.getSession();
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ data: { session: null }, timeout: true }), 1500));

        Promise.race([sessionCheck, timeoutPromise])
            .then((result) => {
                const { data: { session: initialSession }, timeout } = result;
                if (timeout) {
                    console.error("AuthContext: getSession timeout (2.5s). Proceeding with boot.");
                } else {
                    console.log("AuthContext: Session status:", initialSession ? "Active" : "None");
                }
                setSession(initialSession);
                setUser(initialSession?.user ?? null);
            })
            .catch(err => {
                console.error("AuthContext: getSession failed", err);
            })
            .finally(() => {
                setLoading(false);
            });

        // Listen for changes (login, logout, refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            try {
                setSession(newSession);

                // If we have a user, fetch their profile/role
                if (newSession?.user) {
                    console.log("AuthContext: Authentication detected, loading profile...");

                    const profilePromise = supabase
                        .from('vista_employees')
                        .select('*')
                        .eq('email', newSession.user.email)
                        .single();

                    // 10s timeout for profile fetch to prevent boot hang on slow connections
                    const profileTimeout = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("PROFILE_FETCH_TIMEOUT")), 10000)
                    );

                    try {
                        let { data: profile, error } = await Promise.race([profilePromise, profileTimeout]);

                        // RETRY LOGIC: If first attempt timed out, try one more time
                        if (error?.message === "PROFILE_FETCH_TIMEOUT") {
                            console.warn("AuthContext: Profile fetch timed out, retrying...");
                            await new Promise(r => setTimeout(r, 1000)); // Short delay before retry
                            const retryResult = await supabase
                                .from('vista_employees')
                                .select('*')
                                .eq('email', newSession.user.email)
                                .single();
                            profile = retryResult.data;
                            error = retryResult.error;
                        }

                        if (error && error.code !== 'PGRST116') {
                            console.error('AuthContext: Error fetching profile:', error);
                        }

                        // PROFILE SLIMMING: Only keep essential fields to minimize storage footprint
                        if (profile) {
                            console.log("AuthContext: Profile loaded for role:", profile.role);
                            const leanProfile = {
                                id: profile.id,
                                role: profile.role,
                                fullName: profile.fullName || profile.full_name || 'Vista User',
                                email: profile.email,
                                mfa_enabled: !!profile.mfa_enabled,
                                avatar_url: profile.avatar_url
                            };
                            console.log("AuthContext: Session state finalized.");
                            setUser({ ...newSession.user, ...leanProfile });
                        } else {
                            console.log("AuthContext: User profile mapping unavailable.");
                            // Attempt to use metadata if profile fetch failed
                            const metaRole = newSession.user.user_metadata?.role || 'authenticated';
                            setUser({ ...newSession.user, role: metaRole });
                        }
                    } catch (pErr) {
                        console.error("AuthContext: Profile fetch stalled or failed:", pErr.message);
                        // Fallback: Preserve existing role if confirmed, otherwise try metadata
                        setUser(prev => ({
                            ...newSession.user,
                            role: prev?.role || newSession.user.user_metadata?.role || 'authenticated',
                            fullName: prev?.fullName || newSession.user.user_metadata?.full_name
                        }));
                    }
                } else {
                    console.log("AuthContext: No active session.");
                    setUser(null);
                }
            } catch (error) {
                console.error("AuthContext: Auth State Change Error:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email, password) => {
        console.log("AuthContext: Login attempt initiated...");

        const loginPromise = supabase.auth.signInWithPassword({
            email,
            password,
        });

        // 10s safety timeout to prevent "Processing..." forever
        const loginTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("LOGIN_SYSTEM_STALLED")), 10000)
        );

        try {
            const { data, error } = await Promise.race([loginPromise, loginTimeout]);
            if (error) throw error;
            console.log("AuthContext: Login successful.");
            return data;
        } catch (err) {
            console.error("AuthContext: Login error:", err.message);
            throw err;
        }
    };

    const signup = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const loginWithPasskey = async (email) => {
        if (!email) throw new Error("Please enter your email first to use a Passkey.");

        try {
            // 1. Fetch the registered credential ID for this email
            const { data: profile, error: profileError } = await supabase
                .from('vista_employees')
                .select('passkey_credential_id')
                .eq('email', email)
                .single();

            if (profileError || !profile?.passkey_credential_id) {
                throw new Error("No Passkey found for this email. Please log in with a password first and register your device.");
            }

            // 2. Perform biometric verification
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    rpId: window.location.hostname,
                    allowCredentials: [{
                        id: new Uint8Array(profile.passkey_credential_id.match(/.{1,2}/g).map(byte => parseInt(byte, 16))),
                        type: 'public-key'
                    }],
                    userVerification: "required",
                }
            });

            if (assertion) {
                console.log("AuthContext: Passkey verified. Running login sequence...");
                const { data: fullProfile } = await supabase.from('vista_employees').select('*').eq('email', email).single();
                if (fullProfile) {
                    setUser(fullProfile);
                    setLoading(false);
                    return true;
                }
                throw new Error("Biometric verified, but account link failed.");
            }
        } catch (e) {
            console.error("Passkey Auth Error:", e);
            throw e;
        }
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const updateProfile = async (updates) => {
        try {
            const { error } = await supabase
                .from('vista_employees')
                .update(updates)
                .eq('id', user.id);
            if (error) throw error;

            // Refresh user state
            setUser(prev => ({ ...prev, ...updates }));
            return { success: true };
        } catch (error) {
            console.error("Update Profile Error:", error);
            throw error;
        }
    };

    const seedAdmin = async () => {
        const { data, error } = await supabase.auth.signUp({
            email: 'hr@vistaauction.com',
            password: 'vistahr'
        });
        if (error) console.error("Seed Error:", error.message);
        else console.log("Admin Seeded:", data);
        return { data, error };
    };

    const value = {
        user,
        session,
        loading,
        login,
        signup,
        loginWithPasskey,
        logout,
        updateProfile,
        seedAdmin
    };

    useEffect(() => {
        // When AuthProvider mounts, we can hide the index.html boot-loader
        const loader = document.getElementById('vista-boot-loader');
        if (loader) loader.style.display = 'none';
    }, []);

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-sans">
                    <div className="relative mb-8">
                        <div className="w-20 h-20 border-4 border-gray-100 border-t-orange-600 rounded-full animate-spin"></div>
                        <img src="/assets/logo-tag.png" alt="Vista" className="absolute inset-0 m-auto w-10 h-auto" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2">Connecting to Vista...</h2>
                    <p className="text-gray-400 text-sm font-bold tracking-widest uppercase bg-gray-100 px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">Secure Identity Verification</p>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
