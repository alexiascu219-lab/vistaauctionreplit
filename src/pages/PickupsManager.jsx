import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Inbox, Users, UserCog, LogOut } from 'lucide-react';
import PickupsHeader from '../components/PickupsHeader';
import RequestsQueue from '../components/pickups/RequestsQueue';
import EmployeesTab from '../components/pickups/EmployeesTab';
import ProfileTab from '../components/pickups/ProfileTab';
import { getSession, refreshMe, mergeProfile, logout } from '../lib/pickupsApi';
import { canManageEmployees } from '../config/pickupsConfig';

const PickupsManager = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(getSession());
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('requests');

  // Validate the session against the server on load and refresh permissions.
  useEffect(() => {
    const s = getSession();
    if (!s?.token) {
      navigate('/pickups/login', { replace: true });
      return;
    }
    let cancelled = false;
    refreshMe(s.token)
      .then((profile) => {
        if (cancelled) return;
        setSession(mergeProfile(profile));
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) navigate('/pickups/login', { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const signOut = useCallback(async () => {
    await logout(session?.token);
    navigate('/pickups/login', { replace: true });
  }, [session, navigate]);

  if (!ready || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <PickupsHeader />
        <div className="flex justify-center pt-48">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-slate-200 border-t-orange-500" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'requests', label: 'Requests', icon: Inbox, show: true },
    { id: 'employees', label: 'Employees', icon: Users, show: canManageEmployees(session) },
    { id: 'profile', label: 'Profile', icon: UserCog, show: true },
  ].filter((t) => t.show);

  // If a sub-manager lost access to the active tab, fall back to requests.
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'requests';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PickupsHeader />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        {/* Title row */}
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-display tracking-tight">Dashboard</h1>
            <p className="text-slate-500 font-medium mt-1">
              {session.role === 'admin' ? 'Admin' : 'Sub-manager'} · {session.name}
            </p>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* Tab bar */}
        <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm mb-8">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${
                  active ? 'text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="pickups-tab"
                    className="absolute inset-0 bg-slate-900 rounded-xl"
                    transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon size={15} /> {t.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'requests' && <RequestsQueue session={session} />}
          {activeTab === 'employees' && <EmployeesTab session={session} />}
          {activeTab === 'profile' && <ProfileTab session={session} onUpdated={setSession} />}
        </div>
      </div>
    </div>
  );
};

export default PickupsManager;
