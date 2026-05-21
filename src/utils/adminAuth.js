
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Creates a new system user in Supabase Auth using a temporary client.
 * This prevents the current admin session from being overwritten.
 * 
 * @param {string} email - The email of the new user.
 * @param {string} password - The password for the new user.
 * @returns {Promise<Object>} - The created user object or throws an error.
 */
export const createSystemUser = async (email, password) => {
    // 1. Create a temporary client with 'inMemory' persistence
    // This ensures no tokens are saved to localStorage, preserving the admin's session.
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false, // CRITICAL: Do not persist tokens
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    // 2. Sign up the user
    // Note: If 'Enable Email Confirmations' is ON, this user won't be able to login until verified.
    // If OFF, they can login immediately.
    const { data, error } = await tempClient.auth.signUp({
        email,
        password,
    });

    if (error) {
        if (error.message.includes("Signups not allowed")) {
            throw new Error("Creation Failed: 'Enable Signups' must be ON in Supabase Auth settings to add users automatically.");
        }
        throw error;
    }

    if (data?.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("User already exists in Auth system");
    }

    return data.user;
};
