import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Bell, X } from 'lucide-react';

/**
 * Simple notification center that shows recent events from a Supabase
 * table called `notifications`. The table should have columns:
 *   id (uuid), type (text), message (text), created_at (timestamp), read (boolean)
 * The component subscribes to realtime changes and updates the list.
 */
const NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Load initial notifications (last 20)
  useEffect(() => {
    supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications(data || []));

    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
        const newNotif = payload.new;
        setNotifications(prev => [newNotif, ...prev].slice(0, 20));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative ml-4">
      <button
        onClick={() => setOpen(!open)}
        className="text-white hover:text-orange-400 focus:outline-none"
        aria-label="notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-orange-600 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#0c1226]/80 backdrop-blur-2xl border border-white/20 rounded-xl shadow-lg z-50">
          <div className="flex justify-between items-center px-4 py-2 border-b border-white/10">
            <h3 className="text-sm font-black uppercase text-white">Notifications</h3>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {notifications.map(notif => (
              <li
                key={notif.id}
                className={`px-4 py-2 text-sm ${notif.read ? 'text-gray-400' : 'text-white font-bold'} border-b border-white/5`}
              >
                {notif.message}
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(notif.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
