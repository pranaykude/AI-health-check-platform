import React, { useState, useEffect } from 'react';
import { fetchQueueHealth } from '../services/callService';

const QueueHealth = () => {
  const [queueData, setQueueData] = useState({
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval;
    const initialLoad = async () => {
      await loadData();
      if (!error) {
        interval = setInterval(loadData, 10000); // 10s interval
      }
    };
    
    initialLoad();
    return () => clearInterval(interval);
  }, [error]);

  const loadData = async () => {
    const data = await fetchQueueHealth();
    
    if (data) {
      setQueueData(data);
      setError(null);
    } else {
      setError('Monitoring Offline');
    }
    setLoading(false);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    loadData();
  };

  const StatCard = ({ label, value, color, icon }) => (
    <div className={`bg-white p-5 rounded-2xl border border-secondary-100 shadow-sm transition-all hover:shadow-md hover:border-${color}-200 group`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-${color}-50 text-${color}-600 text-[10px] font-bold uppercase tracking-wider`}>
          <span className={`w-1.5 h-1.5 rounded-full bg-${color}-500 ${label === 'Processing' ? 'animate-pulse' : ''}`}></span>
          Live
        </div>
      </div>
      <div className="text-2xl font-black text-secondary-900 tabular-nums">
        {loading ? '...' : value}
      </div>
      <div className="text-xs font-bold text-secondary-400 uppercase tracking-widest mt-1">
        {label === 'Waiting' ? 'Scheduled' : label}
      </div>
    </div>
  );

  return (
    <div className="relative">
      {error && (
        <div className="absolute -top-10 right-0 flex items-center gap-3 animate-fade-in">
          <div className="text-[11px] font-bold text-red-600 bg-red-50/80 backdrop-blur-sm px-3 py-1 rounded-full border border-red-100 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Sync Failed
          </div>
          <button 
            onClick={handleRetry}
            className="text-[11px] font-bold text-secondary-600 bg-white px-3 py-1 rounded-full border border-secondary-200 hover:border-primary-300 hover:text-primary-600 transition-colors shadow-sm cursor-pointer"
          >
            Retry Refresh
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      <StatCard 
        label="Waiting" 
        value={queueData.queued} 
        color="secondary" 
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        } 
      />
      <StatCard 
        label="Processing" 
        value={queueData.processing} 
        color="primary" 
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        } 
      />
      <StatCard 
        label="Completed" 
        value={queueData.completed} 
        color="success" 
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        } 
      />
      <StatCard 
        label="Failed" 
        value={queueData.failed} 
        color="red" 
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        } 
      />
      </div>
    </div>
  );
};


export default QueueHealth;
