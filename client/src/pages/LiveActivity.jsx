import React, { useState, useEffect } from 'react';
import { getJobs } from '../services/jobService';
import { format } from 'date-fns';

const LiveActivity = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      if (jobs.length === 0) setLoading(true);
      const response = await getJobs();
      // Handle response structure
      const data = response.data || response || [];
      setJobs(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError('Failed to sync with background worker.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-success-100 text-success-700 border-success-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'active':
        return 'bg-primary-100 text-primary-700 border-primary-200';
      case 'waiting':
        return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'delayed':
        return 'bg-secondary-100 text-secondary-700 border-secondary-200';
      default:
        return 'bg-secondary-50 text-secondary-600 border-secondary-100';
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto animate-fade-in">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight italic">
            LIVE <span className="text-primary-500 not-italic">ACTIVITY</span>
          </h1>
          <p className="text-secondary-500 mt-2 font-medium">Real-time call processing and execution logs.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchJobs}
            disabled={loading}
            className="group px-5 py-2.5 bg-white border border-secondary-200 rounded-2xl text-secondary-700 font-bold hover:bg-secondary-50 transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 transition-transform group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            REFRESH STATUS
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-8 p-5 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-2xl flex items-center gap-4 shadow-md">
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-2xl shadow-secondary-200/40 border border-secondary-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary-50/30 border-b border-secondary-100">
                <th className="px-8 py-6 text-xs font-bold text-secondary-400 uppercase tracking-[0.2em]">Job ID</th>
                <th className="px-8 py-6 text-xs font-bold text-secondary-400 uppercase tracking-[0.2em]">Process State</th>
                <th className="px-8 py-6 text-xs font-bold text-secondary-400 uppercase tracking-[0.2em]">Payload</th>
                <th className="px-8 py-6 text-xs font-bold text-secondary-400 uppercase tracking-[0.2em]">Attempts</th>
                <th className="px-8 py-6 text-xs font-bold text-secondary-400 uppercase tracking-[0.2em] text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-50">
              {loading && jobs.length === 0 ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-5 bg-secondary-100 rounded w-24"></div></td>
                    <td className="px-8 py-6"><div className="h-7 bg-secondary-100 rounded-full w-20"></div></td>
                    <td className="px-8 py-6"><div className="h-5 bg-secondary-100 rounded w-48"></div></td>
                    <td className="px-8 py-6"><div className="h-5 bg-secondary-100 rounded w-8"></div></td>
                    <td className="px-8 py-6"><div className="h-5 bg-secondary-100 rounded w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-32 text-center text-secondary-300">
                    <div className="flex flex-col items-center gap-4">
                      <span className="text-xl font-bold tracking-tight">Queue is empty</span>
                      <p className="text-sm">Direct processing is active. New calls will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-primary-50/20 transition-all group">
                    <td className="px-8 py-6">
                      <div className="font-mono text-xs font-bold text-secondary-400">
                        #{job.id}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold border shadow-sm ${getStatusColor(job.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${job.status === 'completed' ? 'bg-success-500' : job.status === 'failed' ? 'bg-red-500' : 'bg-primary-500 animate-pulse'}`}></span>
                        {job.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs font-bold text-secondary-700">
                        {job.data?.phone || 'Internal Task'}
                      </div>
                      <div className="text-[10px] text-secondary-400 font-medium truncate max-w-[200px]">
                        ID: {job.data?.clientId?._id || job.data?.clientId || 'N/A'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-secondary-800 tabular-nums">
                          {job.attempts || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="text-xs font-bold text-secondary-500">
                        {job.timestamp ? format(new Date(job.timestamp), 'HH:mm:ss') : '--:--'}
                      </div>
                      <div className="text-[10px] font-medium text-secondary-300 italic">
                        {job.timestamp ? format(new Date(job.timestamp), 'MMM dd') : ''}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LiveActivity;
