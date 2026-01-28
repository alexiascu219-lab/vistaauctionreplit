import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const SecurityAudit = () => {
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(false);

    const runSecurityAudit = async () => {
        setLoading(true);
        const auditResults = {};

        // Test 1: Can anonymous users directly read vista_applications?
        try {
            const { data, error } = await supabase
                .from('vista_applications')
                .select('*')
                .limit(1);

            auditResults.directAppAccess = {
                blocked: !data || data.length === 0,
                error: error?.message,
                data: data
            };
        } catch (err) {
            auditResults.directAppAccess = { blocked: true, error: err.message };
        }

        // Test 2: Can anonymous users directly read vista_otp_codes?
        try {
            const { data, error } = await supabase
                .from('vista_otp_codes')
                .select('*')
                .limit(1);

            auditResults.directOTPAccess = {
                blocked: !data || data.length === 0,
                error: error?.message,
                data: data
            };
        } catch (err) {
            auditResults.directOTPAccess = { blocked: true, error: err.message };
        }

        // Test 3: Can the secure RPC be called?
        try {
            const { data, error } = await supabase.rpc('verify_applicant_status', {
                p_email: 'test@test.com',
                p_otp_code: '000000'
            });

            auditResults.rpcAccess = {
                accessible: !error,
                error: error?.message,
                response: data
            };
        } catch (err) {
            auditResults.rpcAccess = { accessible: false, error: err.message };
        }

        setResults(auditResults);
        setLoading(false);
    };

    const getSecurityScore = () => {
        if (!results.directAppAccess) return null;

        const scores = {
            appBlocked: results.directAppAccess?.blocked ? 1 : 0,
            otpBlocked: results.directOTPAccess?.blocked ? 1 : 0,
            rpcWorks: results.rpcAccess?.accessible ? 1 : 0
        };

        const total = scores.appBlocked + scores.otpBlocked + scores.rpcWorks;
        const max = 3;

        return {
            score: total,
            max,
            percentage: Math.round((total / max) * 100),
            perfect: total === max
        };
    };

    const score = getSecurityScore();

    return (
        <div style={{ padding: '40px', fontFamily: 'system-ui', backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Security Audit
                </h1>
                <p style={{ color: '#999', marginBottom: '30px' }}>
                    Verifying RLS policies and data access controls
                </p>

                <button
                    onClick={runSecurityAudit}
                    disabled={loading}
                    style={{
                        padding: '15px 40px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        marginBottom: '40px',
                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                    }}
                >
                    {loading ? 'Running Audit...' : 'Run Security Audit'}
                </button>

                {score && (
                    <div style={{
                        padding: '30px',
                        background: score.perfect
                            ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                            : 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
                        borderRadius: '15px',
                        marginBottom: '30px',
                        textAlign: 'center',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
                            {score.perfect ? 'Success' : 'Warning'}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '5px' }}>
                            Security Score: {score.score}/{score.max}
                        </div>
                        <div style={{ fontSize: '1.2rem', opacity: 0.9 }}>
                            {score.perfect
                                ? 'All security checks passed'
                                : 'Security vulnerabilities detected'}
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gap: '20px' }}>
                    {/* Test 1: Direct App Access */}
                    {results.directAppAccess && (
                        <div style={{
                            padding: '25px',
                            background: '#1a1a1a',
                            borderRadius: '12px',
                            border: `3px solid ${results.directAppAccess.blocked ? '#10b981' : '#ef4444'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.3rem' }}>
                                    Test 1: Direct Table Access (vista_applications)
                                </h3>
                                <span style={{
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    background: results.directAppAccess.blocked ? '#10b981' : '#ef4444'
                                }}>
                                    {results.directAppAccess.blocked ? 'BLOCKED' : 'EXPOSED'}
                                </span>
                            </div>
                            <p style={{ color: '#999', marginBottom: '10px' }}>
                                {results.directAppAccess.blocked
                                    ? 'Anonymous users CANNOT directly read application data'
                                    : 'WARNING: Application data is publicly readable!'}
                            </p>
                            {results.directAppAccess.error && (
                                <pre style={{
                                    background: '#0a0a0a',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    overflow: 'auto',
                                    fontSize: '0.85rem',
                                    color: '#10b981'
                                }}>
                                    Expected Error: {results.directAppAccess.error}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Test 2: Direct OTP Access */}
                    {results.directOTPAccess && (
                        <div style={{
                            padding: '25px',
                            background: '#1a1a1a',
                            borderRadius: '12px',
                            border: `3px solid ${results.directOTPAccess.blocked ? '#10b981' : '#ef4444'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.3rem' }}>
                                    Test 2: Direct Table Access (vista_otp_codes)
                                </h3>
                                <span style={{
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    background: results.directOTPAccess.blocked ? '#10b981' : '#ef4444'
                                }}>
                                    {results.directOTPAccess.blocked ? 'BLOCKED' : 'EXPOSED'}
                                </span>
                            </div>
                            <p style={{ color: '#999', marginBottom: '10px' }}>
                                {results.directOTPAccess.blocked
                                    ? 'Anonymous users CANNOT directly read OTP codes'
                                    : 'CRITICAL: OTP codes are publicly readable!'}
                            </p>
                            {results.directOTPAccess.error && (
                                <pre style={{
                                    background: '#0a0a0a',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    overflow: 'auto',
                                    fontSize: '0.85rem',
                                    color: '#10b981'
                                }}>
                                    Expected Error: {results.directOTPAccess.error}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Test 3: RPC Access */}
                    {results.rpcAccess && (
                        <div style={{
                            padding: '25px',
                            background: '#1a1a1a',
                            borderRadius: '12px',
                            border: `3px solid ${results.rpcAccess.accessible ? '#10b981' : '#ef4444'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.3rem' }}>
                                    Test 3: Secure RPC Access
                                </h3>
                                <span style={{
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    background: results.rpcAccess.accessible ? '#10b981' : '#ef4444'
                                }}>
                                    {results.rpcAccess.accessible ? 'WORKING' : 'FAILED'}
                                </span>
                            </div>
                            <p style={{ color: '#999', marginBottom: '10px' }}>
                                {results.rpcAccess.accessible
                                    ? 'Secure RPC is callable (proper authentication flow)'
                                    : 'RPC is not accessible - check function permissions'}
                            </p>
                            {results.rpcAccess.response && (
                                <pre style={{
                                    background: '#0a0a0a',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    overflow: 'auto',
                                    fontSize: '0.85rem',
                                    color: '#999'
                                }}>
                                    {JSON.stringify(results.rpcAccess.response, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '40px', padding: '20px', background: '#1a1a1a', borderRadius: '12px', borderLeft: '4px solid #667eea' }}>
                    <h3 style={{ marginTop: 0, color: '#667eea' }}>📚 Security Requirements</h3>
                    <ul style={{ color: '#999', lineHeight: '1.8' }}>
                        <li>Anonymous users access should be restricted</li>
                        <li>Direct table access should be handled via RLS</li>
                        <li>OTP codes should be blocked from direct queries</li>
                        <li>Secure RPC should be accessible for verification</li>
                        <li>All data access must flow through valid RPC calls</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SecurityAudit;
