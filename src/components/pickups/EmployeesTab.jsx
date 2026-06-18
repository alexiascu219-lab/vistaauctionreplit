import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Users,
  ShieldCheck,
  Check,
  KeyRound,
  Power,
  ChevronDown,
  Briefcase,
} from 'lucide-react';
import Toast from '../Toast';
import {
  listEmployees,
  createEmployee,
  listSubmanagers,
  createSubmanager,
  updateSubmanager,
} from '../../lib/pickupsApi';
import { REQUEST_TYPES, PERMISSION_ACTIONS } from '../../config/pickupsConfig';

const cardCls = 'pickups-card rounded-3xl p-6 sm:p-7';
const fieldCls =
  'w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-400';
const labelCls = 'block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5';

const emptyPermissions = () => {
  const p = {};
  REQUEST_TYPES.forEach((t) => {
    p[t.id] = { view: false, approve: false, deny: false, respond: false };
  });
  p.manage_employees = false;
  p.manage_lunch_slots = false;
  return p;
};

// Reusable permission matrix editor
const PermissionMatrix = ({ value, onChange }) => {
  const toggle = (typeId, action) => {
    const next = JSON.parse(JSON.stringify(value));
    next[typeId] = next[typeId] || {};
    next[typeId][action] = !next[typeId][action];
    if (action !== 'view' && next[typeId][action]) next[typeId].view = true; // acting implies viewing
    onChange(next);
  };
  const toggleManage = () => onChange({ ...value, manage_employees: !value.manage_employees });

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-[1.4fr_repeat(4,1fr)] bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-400">
        <div className="px-3 py-2.5">Request type</div>
        {PERMISSION_ACTIONS.map((a) => (
          <div key={a.key} className="px-2 py-2.5 text-center">
            {a.label}
          </div>
        ))}
      </div>
      {REQUEST_TYPES.map((t) => (
        <div key={t.id} className="grid grid-cols-[1.4fr_repeat(4,1fr)] border-t border-slate-100 items-center">
          <div className="px-3 py-2.5 text-xs font-black text-slate-700">{t.title}</div>
          {PERMISSION_ACTIONS.map((a) => {
            const on = !!value?.[t.id]?.[a.key];
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => toggle(t.id, a.key)}
                className="px-2 py-2.5 flex justify-center"
              >
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                    on ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-transparent'
                  }`}
                >
                  <Check size={14} />
                </span>
              </button>
            );
          })}
        </div>
      ))}
      <label className="flex items-center justify-between gap-3 px-3 py-3 border-t border-slate-100 cursor-pointer">
        <span className="text-xs font-black text-slate-700">Manage employees &amp; logins</span>
        <input type="checkbox" checked={!!value.manage_employees} onChange={toggleManage} className="w-5 h-5 accent-emerald-500" />
      </label>
      <label className="flex items-center justify-between gap-3 px-3 py-3 border-t border-slate-100 cursor-pointer">
        <span className="text-xs font-black text-slate-700">Manage lunch slots &amp; times</span>
        <input
          type="checkbox"
          checked={!!value.manage_lunch_slots}
          onChange={() => onChange({ ...value, manage_lunch_slots: !value.manage_lunch_slots })}
          className="w-5 h-5 accent-emerald-500"
        />
      </label>
    </div>
  );
};

const EmployeesTab = ({ session }) => {
  const token = session.token;
  const [toast, setToast] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add-employee form
  const [form, setForm] = useState({ name: '', position: '', notes: '' });
  const [withLogin, setWithLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [permissions, setPermissions] = useState(emptyPermissions());
  const [saving, setSaving] = useState(false);

  // Editing a sub-manager
  const [editingId, setEditingId] = useState(null);
  const [editPerms, setEditPerms] = useState(null);
  const [resetPw, setResetPw] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      const [emp, sm] = await Promise.all([listEmployees(token), listSubmanagers(token)]);
      setEmployees(Array.isArray(emp) ? emp : []);
      setSubs(Array.isArray(sm) ? sm : []);
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.name.trim()) return setToast({ message: 'Employee name is required', type: 'error' });
    if (withLogin) {
      if (!loginForm.username.trim()) return setToast({ message: 'Login username is required', type: 'error' });
      if (loginForm.password.length < 6) return setToast({ message: 'Password must be at least 6 characters', type: 'error' });
    }
    setSaving(true);
    try {
      const emp = await createEmployee(token, form);
      if (withLogin) {
        await createSubmanager(token, {
          name: form.name,
          username: loginForm.username,
          password: loginForm.password,
          permissions,
          employeeId: emp.id,
        });
      }
      setToast({ message: withLogin ? 'Employee + login created' : 'Employee added', type: 'success' });
      setForm({ name: '', position: '', notes: '' });
      setLoginForm({ username: '', password: '' });
      setPermissions(emptyPermissions());
      setWithLogin(false);
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (sub) => {
    setEditingId(sub.id);
    setEditPerms({ ...emptyPermissions(), ...sub.permissions });
    setResetPw('');
  };

  const saveEdit = async (sub) => {
    setSavingEdit(true);
    try {
      await updateSubmanager(token, sub.id, { permissions: editPerms, newPassword: resetPw || undefined });
      setToast({ message: 'Login updated', type: 'success' });
      setEditingId(null);
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (sub) => {
    try {
      await updateSubmanager(token, sub.id, { active: !sub.active });
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Add employee */}
      <div className={cardCls}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <UserPlus size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg">Add employee</h3>
            <p className="text-sm text-slate-500 font-medium">Builds your roster for future autofill.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Full name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Position</label>
            <input
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="e.g. Wave Picker"
              className={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={fieldCls} />
          </div>
        </div>

        {/* Optional login */}
        <label className="flex items-center gap-3 mt-5 cursor-pointer select-none">
          <input type="checkbox" checked={withLogin} onChange={(e) => setWithLogin(e.target.checked)} className="w-5 h-5 accent-orange-500" />
          <span className="text-sm font-black text-slate-700">Also create a sub-manager login for this employee</span>
        </label>

        <AnimatePresence initial={false}>
          {withLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className={labelCls}>Login username *</label>
                    <input
                      value={loginForm.username}
                      autoCapitalize="none"
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      className={fieldCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Temporary password *</label>
                    <input
                      type="text"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="min 6 characters"
                      className={fieldCls}
                    />
                  </div>
                </div>
                <label className={labelCls}>Permissions</label>
                <PermissionMatrix value={permissions} onChange={setPermissions} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={submit}
          disabled={saving}
          className="mt-5 px-6 py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Check size={15} /> {saving ? 'Saving…' : withLogin ? 'Create employee + login' : 'Add employee'}
        </button>
      </div>

      {/* Sub-manager logins */}
      <div className={cardCls}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <h3 className="font-black text-slate-900 text-lg">Sub-manager logins</h3>
        </div>

        {loading ? (
          <p className="text-slate-400 font-semibold text-sm">Loading…</p>
        ) : subs.length === 0 ? (
          <p className="text-slate-400 font-semibold text-sm">No sub-manager logins yet.</p>
        ) : (
          <div className="space-y-3">
            {subs.map((sub) => {
              const isEditing = editingId === sub.id;
              const grants = REQUEST_TYPES.flatMap((t) =>
                PERMISSION_ACTIONS.filter((a) => sub.permissions?.[t.id]?.[a.key]).map((a) => `${t.short} ${a.label}`),
              );
              if (sub.permissions?.manage_employees) grants.push('Manage employees');
              return (
                <div key={sub.id} className="rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black">
                      {sub.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm">{sub.name}</span>
                        <span className="text-xs text-slate-400 font-bold">@{sub.username}</span>
                        {!sub.active && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate">
                        {grants.length ? grants.join(' · ') : 'No permissions'}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleActive(sub)}
                      title={sub.active ? 'Disable' : 'Enable'}
                      className={`p-2 rounded-lg transition-colors ${
                        sub.active ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      <Power size={16} />
                    </button>
                    <button
                      onClick={() => (isEditing ? setEditingId(null) : openEdit(sub))}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <ChevronDown size={18} className={`transition-transform ${isEditing ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isEditing && editPerms && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 space-y-4">
                          <PermissionMatrix value={editPerms} onChange={setEditPerms} />
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                              <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                              <input
                                type="text"
                                value={resetPw}
                                onChange={(e) => setResetPw(e.target.value)}
                                placeholder="Reset password (optional)"
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-400"
                              />
                            </div>
                            <button
                              onClick={() => saveEdit(sub)}
                              disabled={savingEdit}
                              className="px-6 py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                              {savingEdit ? 'Saving…' : 'Save changes'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Employee roster */}
      <div className={cardCls}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users size={20} />
          </div>
          <h3 className="font-black text-slate-900 text-lg">Employee roster ({employees.length})</h3>
        </div>
        {loading ? (
          <p className="text-slate-400 font-semibold text-sm">Loading…</p>
        ) : employees.length === 0 ? (
          <p className="text-slate-400 font-semibold text-sm">No employees yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {employees.map((e) => (
              <div key={e.id} className="rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                  <Briefcase size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 text-sm truncate">{e.name}</p>
                  <p className="text-xs text-slate-500 font-medium truncate">{e.position || '—'}</p>
                </div>
                {e.has_login && (
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Login
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default EmployeesTab;
