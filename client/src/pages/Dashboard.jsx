import { useState, useEffect } from 'react';
import { getStats } from '../api/clientApi';
import { getQueueStats } from '../api/callApi';
import QueueHealth from '../components/QueueHealth';

function AnimatedCounter({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }

    let start = 0;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{display}</span>;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const statsRes = await getStats();
      setStats(statsRes.data);
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling for real-time stats
    return () => clearInterval(interval);
  }, []);

  const statCards = stats
    ? [
        {
          title: 'Total Clients',
          value: stats.total,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
          gradient: 'from-primary-600 to-primary-400',
          bgGlow: 'bg-primary-500/5',
          borderColor: 'border-primary-500/20',
          iconBg: 'bg-primary-500/10',
          iconColor: 'text-primary-400',
        },
        {
          title: 'Active',
          value: stats.active,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          gradient: 'from-success-500 to-success-400',
          bgGlow: 'bg-success-500/5',
          borderColor: 'border-success-500/20',
          iconBg: 'bg-success-500/10',
          iconColor: 'text-success-400',
        },
        {
          title: 'Inactive',
          value: stats.inactive,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ),
          gradient: 'from-surface-500 to-surface-400',
          bgGlow: 'bg-surface-500/5',
          borderColor: 'border-surface-600/30',
          iconBg: 'bg-surface-700/50',
          iconColor: 'text-surface-400',
        }
      ]
    : [];

  return (
    <div className="p-8 lg:p-10 animate-fade-in bg-bg-primary min-h-full">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight uppercase italic">Dashboard</h1>
          <p className="text-lg text-text-secondary mt-2">Real-time overview of your AI telephony platform</p>
        </div>
      </div>

      {/* TOP SECTION: Queue Health */}
      <div className="mb-12 bg-secondary-900/5 p-6 rounded-[2.5rem] border border-secondary-100/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-sm font-black text-secondary-900 flex items-center gap-2 uppercase tracking-[0.25em]">
            <span className="w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"></span>
            Call Processing Overview
            <span className="ml-auto text-[10px] font-bold bg-success-500 text-white px-2 py-0.5 rounded-full animate-pulse">Direct Processing Mode Active</span>
          </h2>
        </div>
        <QueueHealth />
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm mb-8 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button onClick={fetchData} className="px-4 py-1.5 text-xs font-medium bg-danger-100 hover:bg-danger-200 text-danger-700 rounded-lg">
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {loading && !stats ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-border-primary animate-pulse shadow-sm"></div>
          ))
        ) : (
          statCards?.map((card, index) => (
            <div
              key={card.title || index}
              className={`relative overflow-hidden rounded-2xl border ${card.borderColor} ${card.bgGlow} p-7 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg bg-white shadow-sm`}
            >
              <div className="relative">
                <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center mb-4 ${card.iconColor}`}>
                  {card.icon}
                </div>
                <p className="text-sm font-medium text-text-secondary mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-text-primary">
                  <AnimatedCounter value={card.value || 0} />
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Platform Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border-primary p-8 shadow-sm">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-6">System Connection</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border-secondary">
              <span className="text-text-primary font-medium">API Gateway</span>
              <span className="flex items-center gap-2 text-success-600 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border-secondary">
              <span className="text-text-primary font-medium">MongoDB (Call Logs)</span>
              <span className="flex items-center gap-2 text-success-600 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                Connected (No Redis)
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-text-primary font-medium">Direct Execution</span>
              <span className="flex items-center gap-2 text-success-600 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                Live
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-primary p-8 shadow-sm">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-6">Execution Overview</h3>
          <div className="space-y-6">
            <p className="text-xs text-text-tertiary leading-relaxed">
              Platform is operating within normal parameters. Real-time stats reflect calls processed in the current session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
