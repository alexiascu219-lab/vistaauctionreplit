import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { CheckCircle, XCircle } from 'lucide-react';

// Simple admin page for assigning roles (Recruiter, Manager, Admin)
// Assumes a Supabase table `users` with columns: id (uuid), email (text), full_name (text), role (text)

const AccessControl = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) console.error('Users fetch error', error);
    else setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    // Subscribe to changes (optional)
    const channel = supabase
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const updateRole = async (userId, newRole) => {
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    if (error) console.error('Role update error', error);
    else fetchUsers();
  };

  return (
    <div className="min-h-screen bg-brandBlueDark font-sans text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-center mb-8 font-display">User Access Control</h1>
        {loading ? (
          <p className="text-center">Loading…</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/20">
                <th className="p-3 text-left font-bold">Name</th>
                <th className="p-3 text-left font-bold">Email</th>
                <th className="p-3 text-left font-bold">Role</th>
                <th className="p-3 text-left font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-white/10 hover:bg-[#0c1226]/40">
                  <td className="p-3">{u.full_name || u.email}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 capitalize">{u.role || 'none'}</td>
                  <td className="p-3">
                    <select
                      value={u.role || ''}
                      onChange={e => updateRole(u.id, e.target.value)}
                      className="bg-[#0c1226]/60 border border-white/20 rounded-xl px-2 py-1 text-white"
                    >
                      <option value="">Select role</option>
                      <option value="recruiter">Recruiter</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AccessControl;
