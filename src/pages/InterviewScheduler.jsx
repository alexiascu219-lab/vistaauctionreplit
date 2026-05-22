import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import InterviewCalendar from '../components/InterviewCalendar';
import { CheckCircle, XCircle, Calendar } from 'lucide-react';

/**
 * Page used by HR staff to schedule an interview for a candidate.
 * It receives a candidate id via query string (e.g. /schedule-interview?appId=123)
 * and writes the selected date back to the `vista_applications` table.
 */
const InterviewScheduler = () => {
  const params = new URLSearchParams(window.location.search);
  const appId = params.get('appId') || '';
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | done | error

  const saveDate = async e => {
    e.preventDefault();
    if (!appId || !date) return;
    setStatus('saving');
    const { error } = await supabase
      .from('vista_applications')
      .update({ interviewDate: date, status: 'Interviewing' })
      .eq('id', appId);
    if (error) {
      console.error('Interview save error', error);
      setStatus('error');
    } else {
      setStatus('done');
    }
  };

  return (
    <div className="min-h-screen bg-brandBlueDark font-sans text-white">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-black text-center mb-6 font-display">Schedule Interview</h1>
        {status === 'done' ? (
          <div className="glass-panel p-8 rounded-2xl text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <p className="text-lg font-bold">Interview date saved!</p>
          </div>
        ) : (
          <form onSubmit={saveDate} className="glass-panel p-8 rounded-2xl space-y-6">
            <InterviewCalendar label="Select interview date" value={date} onChange={setDate} />
            <button
              type="submit"
              disabled={!date || status === 'saving'}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl transition-colors flex items-center justify-center"
            >
              {status === 'saving' ? 'Saving…' : 'Save Interview'}
            </button>
            {status === 'error' && (
              <p className="text-red-400 text-center mt-2">Failed to save – try again.</p>
            )}
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default InterviewScheduler;
