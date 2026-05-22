import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const AnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState({ applications: 0, hired: 0, pending: 0, rejected: 0, roles: {} });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data, error } = await supabase.from('vista_applications').select('status, jobType');
        if (error) throw error;
        const roleCounts = {};
        let hired = 0, pending = 0, rejected = 0, total = data.length;
        data.forEach(item => {
          // role breakdown
          const role = item.jobType || item.position || 'Other';
          roleCounts[role] = (roleCounts[role] || 0) + 1;
          // status counts
          if (item.status === 'Hired') hired++;
          else if (item.status === 'Pending') pending++;
          else if (item.status === 'Rejected') rejected++;
        });
        setMetrics({ applications: total, hired, pending, rejected, roles: roleCounts });
      } catch (e) {
        console.error('Analytics fetch error', e);
      }
    };
    fetchMetrics();
  }, []);

  const barData = {
    labels: Object.keys(metrics.roles),
    datasets: [
      {
        label: 'Applications per Role',
        data: Object.values(metrics.roles),
        backgroundColor: 'rgba(249,115,22,0.6)',
        borderColor: 'rgba(249,115,22,1)',
        borderWidth: 1,
      },
    ],
  };

  const pieData = {
    labels: ['Hired', 'Pending', 'Rejected'],
    datasets: [
      {
        data: [metrics.hired, metrics.pending, metrics.rejected],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        hoverOffset: 4,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-brandBlueDark font-sans text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <h1 className="text-4xl font-black text-center font-display">HR Analytics Dashboard</h1>
        <section className="grid md:grid-cols-2 gap-8">
          <div className="bg-[#0c1226]/60 p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-black mb-4 text-center">Applications by Role</h2>
            <Bar data={barData} options={{ maintainAspectRatio: false }} height={300} />
          </div>
          <div className="bg-[#0c1226]/60 p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-black mb-4 text-center">Status Overview</h2>
            <Pie data={pieData} options={{ maintainAspectRatio: false }} height={300} />
          </div>
        </section>
        <section className="text-center text-lg font-bold">
          Total Applications: <span className="text-orange-500">{metrics.applications}</span>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AnalyticsDashboard;
