import emailjs from 'emailjs-com';
import { supabase } from '../supabaseClient';
import { MANAGER_SESSION_KEY } from '../config/pickupsConfig';

// EmailJS credentials (same configured service used by the HR portal).
const EMAILJS = {
  SERVICE_ID: 'service_2l8vhyj',
  TEMPLATE_ID: 'template_9hirkpm',
  PUBLIC_KEY: 'dLGF3GCwXh_sPPMei',
};

// ---- Session storage -------------------------------------------------------
export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(MANAGER_SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setSession(session) {
  localStorage.setItem(MANAGER_SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(MANAGER_SESSION_KEY);
}

// Merge fresh profile fields into the stored session (keeps token + authed).
export function mergeProfile(profile) {
  const current = getSession() || {};
  const next = { ...current, ...profile, authed: true };
  setSession(next);
  return next;
}

// ---- RPC helper ------------------------------------------------------------
// Supabase RPCs in this module return either the value or an { error } object.
export async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message || 'Request failed');
  if (data && typeof data === 'object' && data.error) throw new Error(data.error);
  return data;
}

// ---- Auth ------------------------------------------------------------------
export async function login(username, password) {
  const data = await rpc('pickups_manager_login', { p_username: username, p_password: password });
  const session = { authed: true, ...data };
  setSession(session);
  return session;
}

export async function refreshMe(token) {
  return rpc('pickups_me', { p_token: token });
}

export async function logout(token) {
  try {
    await rpc('pickups_logout', { p_token: token });
  } catch {
    /* ignore network errors on logout */
  }
  clearSession();
}

// ---- Profile + 2FA ---------------------------------------------------------
export function updateProfile(token, currentPassword, { name, username, password, code } = {}) {
  return rpc('pickups_update_profile', {
    p_token: token,
    p_current_password: currentPassword,
    p_new_name: name ?? null,
    p_new_username: username ?? null,
    p_new_password: password ?? null,
    p_code: code ?? null,
  });
}

export function request2fa(token, currentPassword, purpose, email) {
  return rpc('pickups_request_2fa', {
    p_token: token,
    p_current_password: currentPassword,
    p_purpose: purpose,
    p_email: email ?? null,
  });
}

export function enable2fa(token, currentPassword, email, code) {
  return rpc('pickups_set_2fa', {
    p_token: token,
    p_current_password: currentPassword,
    p_email: email,
    p_code: code,
  });
}

export function disable2fa(token, currentPassword) {
  return rpc('pickups_disable_2fa', { p_token: token, p_current_password: currentPassword });
}

// Send a 6-digit code to an email via EmailJS.
export async function send2faEmail({ email, name, code }) {
  return emailjs.send(
    EMAILJS.SERVICE_ID,
    EMAILJS.TEMPLATE_ID,
    {
      to_email: email,
      to_name: name || 'Manager',
      subject: 'Your Vista Pickups verification code',
      status: 'Verification',
      message: `Your Vista Pickups verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    },
    EMAILJS.PUBLIC_KEY,
  );
}

// ---- Employees + sub-managers ---------------------------------------------
export function listEmployees(token) {
  return rpc('pickups_list_employees', { p_token: token });
}

export function createEmployee(token, { name, position, notes }) {
  return rpc('pickups_create_employee', {
    p_token: token,
    p_name: name,
    p_position: position ?? null,
    p_notes: notes ?? null,
  });
}

export function listSubmanagers(token) {
  return rpc('pickups_list_submanagers', { p_token: token });
}

export function createSubmanager(token, { name, username, password, permissions, employeeId }) {
  return rpc('pickups_create_submanager', {
    p_token: token,
    p_name: name,
    p_username: username,
    p_password: password,
    p_permissions: permissions,
    p_employee_id: employeeId ?? null,
  });
}

export function updateSubmanager(token, subId, { permissions, active, newPassword } = {}) {
  return rpc('pickups_update_submanager', {
    p_token: token,
    p_sub_id: subId,
    p_permissions: permissions ?? null,
    p_active: active ?? null,
    p_new_password: newPassword ?? null,
  });
}
