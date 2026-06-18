import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, AtSign, Lock, ShieldCheck, ShieldOff, Mail, KeyRound, Check, X } from 'lucide-react';
import Toast from '../Toast';
import {
  updateProfile,
  request2fa,
  enable2fa,
  disable2fa,
  send2faEmail,
  mergeProfile,
} from '../../lib/pickupsApi';
import { isAdmin } from '../../config/pickupsConfig';

const card = 'pickups-card rounded-3xl p-6 sm:p-7';
const label = 'block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5';
const field =
  'w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-400';
const btn =
  'px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2';

const ProfileTab = ({ session, onUpdated }) => {
  const token = session.token;
  const [toast, setToast] = useState(null);

  // Account details
  const [name, setName] = useState(session.name || '');
  const [username, setUsername] = useState(session.username || '');
  const [accountPw, setAccountPw] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  // Password change
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwCurrent, setPwCurrent] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // 2FA setup
  const [twofaEmail, setTwofaEmail] = useState('');
  const [twofaPw, setTwofaPw] = useState('');
  const [setupStage, setSetupStage] = useState('idle'); // idle | code
  const [setupCode, setSetupCode] = useState('');
  const [twofaBusy, setTwofaBusy] = useState(false);

  // Pending credential-change 2FA challenge
  const [pending, setPending] = useState(null); // { payload, currentPassword }
  const [pendingCode, setPendingCode] = useState('');
  const [pendingBusy, setPendingBusy] = useState(false);

  const apply = (profile) => {
    const merged = mergeProfile(profile);
    onUpdated?.(merged);
    return merged;
  };

  // Run a credential change, routing through the 2FA email flow if enabled.
  const runCredentialChange = async (payload, currentPassword, onDone) => {
    if (session.twofa_enabled) {
      const res = await request2fa(token, currentPassword, 'credential_change');
      await send2faEmail({ email: res.email, name: res.name, code: res.code });
      setPending({ payload, currentPassword, onDone });
      setPendingCode('');
      setToast({ message: `Verification code sent to ${res.email}`, type: 'success' });
    } else {
      const profile = await updateProfile(token, currentPassword, payload);
      apply(profile);
      onDone?.();
    }
  };

  const confirmPending = async () => {
    if (!pendingCode.trim()) return setToast({ message: 'Enter the code from your email', type: 'error' });
    setPendingBusy(true);
    try {
      const profile = await updateProfile(token, pending.currentPassword, { ...pending.payload, code: pendingCode.trim() });
      apply(profile);
      pending.onDone?.();
      setPending(null);
      setToast({ message: 'Saved', type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setPendingBusy(false);
    }
  };

  const saveAccount = async () => {
    if (!accountPw) return setToast({ message: 'Enter your current password to save', type: 'error' });
    const usernameChanged = username.trim().toLowerCase() !== session.username;
    setSavingAccount(true);
    try {
      await runCredentialChange(
        { name, username: usernameChanged ? username : null },
        accountPw,
        () => {
          setAccountPw('');
          if (!session.twofa_enabled) setToast({ message: 'Account updated', type: 'success' });
        },
      );
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setSavingAccount(false);
    }
  };

  const savePassword = async () => {
    if (!newPw || newPw.length < 6) return setToast({ message: 'New password must be at least 6 characters', type: 'error' });
    if (newPw !== confirmPw) return setToast({ message: 'Passwords do not match', type: 'error' });
    if (!pwCurrent) return setToast({ message: 'Enter your current password', type: 'error' });
    setSavingPw(true);
    try {
      await runCredentialChange({ password: newPw }, pwCurrent, () => {
        setNewPw('');
        setConfirmPw('');
        setPwCurrent('');
        if (!session.twofa_enabled) setToast({ message: 'Password updated', type: 'success' });
      });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setSavingPw(false);
    }
  };

  // 2FA setup flow
  const sendSetupCode = async () => {
    if (!twofaEmail.trim() || !twofaEmail.includes('@')) return setToast({ message: 'Enter a valid email', type: 'error' });
    if (!twofaPw) return setToast({ message: 'Enter your current password', type: 'error' });
    setTwofaBusy(true);
    try {
      const res = await request2fa(token, twofaPw, 'setup', twofaEmail.trim());
      await send2faEmail({ email: res.email, name: res.name, code: res.code });
      setSetupStage('code');
      setToast({ message: `Code sent to ${res.email}`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setTwofaBusy(false);
    }
  };

  const confirmSetup = async () => {
    if (!setupCode.trim()) return setToast({ message: 'Enter the code from your email', type: 'error' });
    setTwofaBusy(true);
    try {
      const profile = await enable2fa(token, twofaPw, twofaEmail.trim(), setupCode.trim());
      apply(profile);
      setSetupStage('idle');
      setSetupCode('');
      setTwofaPw('');
      setTwofaEmail('');
      setToast({ message: 'Two-factor authentication enabled', type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setTwofaBusy(false);
    }
  };

  const turnOff2fa = async () => {
    if (!twofaPw) return setToast({ message: 'Enter your current password to disable', type: 'error' });
    setTwofaBusy(true);
    try {
      const profile = await disable2fa(token, twofaPw);
      apply(profile);
      setTwofaPw('');
      setToast({ message: 'Two-factor authentication disabled', type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setTwofaBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Account details */}
      <div className={card}>
        <h3 className="font-black text-slate-900 text-lg mb-1">Account details</h3>
        <p className="text-sm text-slate-500 font-medium mb-5">Your display name and login username.</p>
        <div className="space-y-4">
          <div>
            <label className={label}>Display name</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Username</label>
            <div className="relative">
              <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={username}
                autoCapitalize="none"
                onChange={(e) => setUsername(e.target.value)}
                className={field}
              />
            </div>
          </div>
          <div>
            <label className={label}>Current password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="password"
                value={accountPw}
                onChange={(e) => setAccountPw(e.target.value)}
                placeholder="Confirm it's you"
                className={field}
              />
            </div>
          </div>
          <button onClick={saveAccount} disabled={savingAccount} className={btn}>
            {savingAccount ? 'Saving…' : 'Save changes'}
          </button>
          {session.twofa_enabled && (
            <p className="text-xs text-slate-400 font-medium">
              Changing your username will require a code from your 2FA email.
            </p>
          )}
        </div>
      </div>

      {/* Change password */}
      <div className={card}>
        <h3 className="font-black text-slate-900 text-lg mb-1">Change password</h3>
        <p className="text-sm text-slate-500 font-medium mb-5">Use at least 6 characters.</p>
        <div className="space-y-4">
          <div>
            <label className={label}>New password</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Confirm new password</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Current password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className={field} />
            </div>
          </div>
          <button onClick={savePassword} disabled={savingPw} className={btn}>
            {savingPw ? 'Updating…' : 'Update password'}
          </button>
          {session.twofa_enabled && (
            <p className="text-xs text-slate-400 font-medium">A code from your 2FA email is required.</p>
          )}
        </div>
      </div>

      {/* Two-factor — admins only */}
      {isAdmin(session) && (
        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-start gap-3 mb-1">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                session.twofa_enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">Two-factor authentication</h3>
              <p className="text-sm text-slate-500 font-medium">
                Add an email that must confirm any change to your username or password.
              </p>
            </div>
          </div>

          {session.twofa_enabled ? (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-600 mb-1">Enabled</p>
                <p className="font-bold text-slate-700 text-sm">{session.twofa_email}</p>
              </div>
              <div className="relative flex-1">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="password"
                  value={twofaPw}
                  onChange={(e) => setTwofaPw(e.target.value)}
                  placeholder="Current password"
                  className={field}
                />
              </div>
              <button
                onClick={turnOff2fa}
                disabled={twofaBusy}
                className="px-5 py-3 rounded-xl bg-white border border-red-200 text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                <ShieldOff size={14} /> Disable
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {setupStage === 'idle' ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="email"
                      value={twofaEmail}
                      onChange={(e) => setTwofaEmail(e.target.value)}
                      placeholder="2FA email address"
                      className={field}
                    />
                  </div>
                  <div className="relative flex-1">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="password"
                      value={twofaPw}
                      onChange={(e) => setTwofaPw(e.target.value)}
                      placeholder="Current password"
                      className={field}
                    />
                  </div>
                  <button onClick={sendSetupCode} disabled={twofaBusy} className={btn}>
                    {twofaBusy ? 'Sending…' : 'Send code'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                  <p className="text-sm text-slate-500 font-medium sm:self-center">
                    Enter the code we emailed to <span className="font-black text-slate-700">{twofaEmail}</span>
                  </p>
                  <div className="relative flex-1">
                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      value={setupCode}
                      onChange={(e) => setSetupCode(e.target.value)}
                      placeholder="6-digit code"
                      className={field}
                    />
                  </div>
                  <button onClick={confirmSetup} disabled={twofaBusy} className={btn}>
                    {twofaBusy ? 'Verifying…' : 'Enable 2FA'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pending 2FA code modal for credential changes */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-900 text-lg">Confirm with 2FA</h3>
                <button onClick={() => setPending(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-slate-500 font-medium mb-4">
                We emailed a 6-digit code to your 2FA address. Enter it to confirm this change.
              </p>
              <div className="relative mb-4">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  autoFocus
                  value={pendingCode}
                  onChange={(e) => setPendingCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmPending()}
                  placeholder="6-digit code"
                  className={field}
                />
              </div>
              <button onClick={confirmPending} disabled={pendingBusy} className={`${btn} w-full`}>
                <Check size={15} /> {pendingBusy ? 'Confirming…' : 'Confirm change'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ProfileTab;
