import { useState, useEffect, useCallback } from 'react';
import { getCallHistory } from '../api/callApi';
import CallDetailModal from '../components/CallDetailModal';

export default function Calls() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState(null);
  const [selectedCallId, setSelectedCallId] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCallHistory(page, statusFilter);
      setLogs(res.data.calls);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch call logs');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchLogs();
    // Poll every 5 seconds to show real-time updates during active calls
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': 
      case 'recorded': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'in-progress': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'ringing': return 'bg-sky-50 text-sky-600 border-sky-200';
      case 'initiated': return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case 'failed': return 'bg-red-50 text-red-600 border-red-200';
      case 'queued': return 'bg-gray-100 text-gray-500 border-gray-300';
      case 'processing': return 'bg-blue-100 text-blue-600 border-blue-300';
      case 'calling': return 'bg-sky-100 text-sky-600 border-sky-300';
      default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const isLiveStatus = (status) => ['in-progress', 'ringing', 'initiated', 'processing', 'calling'].includes(status);

  const getSentimentBadge = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-success-500';
      case 'negative': return 'bg-danger-500';
      default: return 'bg-amber-500';
    }
  };

  return (
    <div className="p-8 lg:p-10 animate-fade-in bg-bg-primary min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">AI Call Analytics</h1>
          <p className="text-lg text-text-secondary mt-2">
            Detailed insights, transcripts, and sentiment analysis for every interaction
            {pagination.total !== undefined && (
              <span className="text-text-tertiary"> · {pagination.total} records</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-white border border-border-primary rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 cursor-pointer min-w-[160px] shadow-sm"
          >
            <option value="">All Interactions</option>
            <option value="recorded">Recorded & Analyzed</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="calling">In Call</option>
          </select>
          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-text-secondary bg-white border border-border-primary rounded-xl hover:bg-bg-secondary transition-all duration-200 shadow-sm active:scale-95"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger-50 border border-danger-200 text-danger-600 rounded-xl text-sm animate-shake">
          {error}
        </div>
      )}

      <div className="bg-white border border-border-primary rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary bg-bg-secondary/30">
                <th className="text-left px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-widest">Client</th>
                <th className="text-left px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-widest">Sentiment</th>
                <th className="text-left px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-widest">AI Summary Preview</th>
                <th className="text-left px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-widest text-center">Duration</th>
                <th className="text-left px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-widest text-center">Status</th>
                <th className="text-left px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-secondary">
              {loading && logs.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6"><div className="h-4 bg-bg-tertiary rounded w-32"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-bg-tertiary rounded w-20"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-bg-tertiary rounded w-64"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-bg-tertiary rounded w-12 mx-auto"></div></td>
                    <td className="px-6 py-6"><div className="h-6 bg-bg-tertiary rounded-lg w-20 mx-auto"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-bg-tertiary rounded w-16"></div></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-bg-secondary flex items-center justify-center">
                        <svg className="w-10 h-10 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <p className="text-text-secondary font-bold text-xl">No Analytics Available</p>
                      <p className="text-text-tertiary text-sm">Once calls are recorded and analyzed, insights will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-bg-secondary/50 transition-all duration-200 group">
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-text-primary text-base">{log.clientName}</span>
                        <span className="text-xs font-mono text-text-tertiary mt-0.5">{log.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getSentimentBadge(log.sentiment)}`} />
                        <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">{log.sentiment || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 max-w-md">
                      <p className="text-sm text-text-secondary line-clamp-1 italic group-hover:line-clamp-none transition-all">
                        {log.summary ? `"${log.summary}"` : 'No summary generated yet.'}
                      </p>
                      {log.issues?.length > 0 && (
                        <div className="flex gap-1.5 mt-2 overflow-hidden">
                          {log.issues.slice(0, 2).map((issue, idx) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-danger-50 text-danger-600 rounded-md border border-danger-100 whitespace-nowrap">
                              {issue}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-6 text-center font-bold text-text-secondary">
                      {log.duration || 0}s
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusColor(log.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'recorded' || log.status === 'completed' ? 'bg-emerald-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'}`} />
                        {isLiveStatus(log.status) ? 'LIVE' : log.status}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <button
                        onClick={() => setSelectedCallId(log.id)}
                        className="p-2 text-text-tertiary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all active:scale-90"
                        title="View Full Analysis"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-8 py-6 border-t border-border-primary bg-bg-secondary/10">
            <p className="text-sm font-medium text-text-tertiary">
              Showing page <span className="text-text-primary">{pagination.page}</span> of <span className="text-text-primary">{pagination.pages}</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-6 py-2.5 text-sm font-bold text-text-secondary bg-white border border-border-primary rounded-xl hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md active:scale-95"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.pages}
                className="px-6 py-2.5 text-sm font-bold text-text-secondary bg-white border border-border-primary rounded-xl hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md active:scale-95"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call Detail Modal */}
      {selectedCallId && (
        <CallDetailModal 
          callId={selectedCallId} 
          onClose={() => setSelectedCallId(null)} 
        />
      )}
    </div>
  );
}
