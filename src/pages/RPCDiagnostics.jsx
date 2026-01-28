import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const RPCDiagnostics = () => {
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState({});

    const runTest = async (testName, rpcCall) => {
        setLoading(prev => ({ ...prev, [testName]: true }));
        try {
            const result = await rpcCall();
            setResults(prev => ({
                ...prev,
                [testName]: {
                    success: true,
                    data: result.data,
                    error: result.error
                }
            }));
        } catch (err) {
            setResults(prev => ({
                ...prev,
                [testName]: {
                    success: false,
                    error: err.message
                }
            }));
        } finally {
            setLoading(prev => ({ ...prev, [testName]: false }));
        }
    };

    const tests = [
        {
            name: 'Test 1: TEXT Return',
            id: 'test_text',
            call: () => supabase.rpc('test_rpc_text')
        },
        {
            name: 'Test 2: JSONB Return',
            id: 'test_jsonb',
            call: () => supabase.rpc('test_rpc_jsonb')
        },
        {
            name: 'Test 3: TABLE Return',
            id: 'test_table',
            call: () => supabase.rpc('test_rpc_table')
        },
        {
            name: 'Test 4: SETOF Return',
            id: 'test_setof',
            call: () => supabase.rpc('test_rpc_setof')
        },
        {
            name: 'Test 5: With Params (JSONB)',
            id: 'test_params',
            call: () => supabase.rpc('test_rpc_with_params', { p_email: 'test@example.com' })
        },
        {
            name: 'Test 6: Hello World Secure',
            id: 'test_hello',
            call: () => supabase.rpc('test_secure_hello')
        },
        {
            name: 'Test 7: V6 Debug (Known Working)',
            id: 'test_v6',
            call: () => supabase.rpc('get_applicant_debug_v6', {
                p_email: 'test@example.com',
                p_otp_code: '123456'
            })
        }
    ];

    const runAllTests = async () => {
        for (const test of tests) {
            await runTest(test.id, test.call);
            await new Promise(resolve => setTimeout(resolve, 500)); // Delay between tests
        }
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'monospace', backgroundColor: '#1a1a1a', color: '#00ff00', minHeight: '100vh' }}>
            <h1 style={{ borderBottom: '2px solid #00ff00', paddingBottom: '10px' }}>
                RPC Diagnostics Suite
            </h1>

            <div style={{ marginTop: '20px', marginBottom: '30px' }}>
                <button
                    onClick={runAllTests}
                    style={{
                        padding: '15px 30px',
                        fontSize: '16px',
                        backgroundColor: '#00ff00',
                        color: '#1a1a1a',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Run All Tests
                </button>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
                {tests.map(test => (
                    <div
                        key={test.id}
                        style={{
                            border: '1px solid #333',
                            padding: '20px',
                            borderRadius: '8px',
                            backgroundColor: '#0a0a0a'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: '#00ff00' }}>{test.name}</h3>
                            <button
                                onClick={() => runTest(test.id, test.call)}
                                disabled={loading[test.id]}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: loading[test.id] ? '#666' : '#00cc00',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: loading[test.id] ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {loading[test.id] ? 'Testing...' : 'Run Test'}
                            </button>
                        </div>

                        {results[test.id] && (
                            <div style={{
                                marginTop: '10px',
                                padding: '15px',
                                backgroundColor: results[test.id].success ? '#001a00' : '#1a0000',
                                border: `2px solid ${results[test.id].success ? '#00ff00' : '#ff0000'}`,
                                borderRadius: '5px'
                            }}>
                                <div style={{
                                    fontWeight: 'bold',
                                    marginBottom: '10px',
                                    color: results[test.id].success ? '#00ff00' : '#ff0000'
                                }}>
                                    {results[test.id].success ? 'SUCCESS' : 'FAILED'}
                                </div>

                                {results[test.id].error && (
                                    <div style={{ marginBottom: '10px' }}>
                                        <strong style={{ color: '#ff6b6b' }}>Error:</strong>
                                        <pre style={{
                                            marginTop: '5px',
                                            padding: '10px',
                                            backgroundColor: '#2a0000',
                                            borderRadius: '3px',
                                            overflow: 'auto',
                                            color: '#ff6b6b'
                                        }}>
                                            {JSON.stringify(results[test.id].error, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {results[test.id].data && (
                                    <div>
                                        <strong style={{ color: '#00ff00' }}>Data:</strong>
                                        <pre style={{
                                            marginTop: '5px',
                                            padding: '10px',
                                            backgroundColor: '#002200',
                                            borderRadius: '3px',
                                            overflow: 'auto',
                                            color: '#00ff00'
                                        }}>
                                            {JSON.stringify(results[test.id].data, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '40px', padding: '20px', border: '2px solid #00ff00', borderRadius: '8px' }}>
                <h2>Summary</h2>
                <div style={{ marginTop: '15px' }}>
                    <div>Total Tests: {tests.length}</div>
                    <div style={{ color: '#00ff00' }}>
                        Passed: {Object.values(results).filter(r => r.success).length}
                    </div>
                    <div style={{ color: '#ff0000' }}>
                        Failed: {Object.values(results).filter(r => !r.success).length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RPCDiagnostics;
