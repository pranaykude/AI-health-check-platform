import React, { useState, useEffect } from 'react';
import { getCalls } from '../services/callService';
import { format } from 'date-fns';

const CallLogs = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchCallLogs();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchCallLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchCallLogs = async () => {
    try {
      // Only show loading on initial load or manual refresh
      if (calls.length === 0) setLoading(true);
      const response = await getCalls();
      // Handle different response structures
      const data = response.data?.calls || response.calls || response.data || response || [];
      setCalls(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch call logs:', err);
      setError('Something went wrong. Please try again later.');
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
      case 'in-progress':
      case 'calling':
      case 'processing':
      case 'initiated':
      case 'ringing':
        return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'queued':
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
            CALL <span className="text-primary-500 not-italic">LOGS</span>
          </h1>
          <p className="text-secondary-500 mt-2 font-medium">Real-time monitoring of AI voice interaction delivery.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-2">
            {calls.slice(0, 3).map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-600">
                {c.clientId?.name?.charAt(0) || '?'}
              </div>
            ))}
            {calls.length > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-secondary-100 flex items-center justify-center text-[10px] font-bold text-secondary-600">
                +{calls.length - 3}
              </div>
            )}
          </div>
          <button 
            onClick={fetchCallLogs}
            disabled={loading}
            className="group px-5 py-2.5 bg-white border border-secondary-200 rounded-2xl text-secondary-700 font-bold hover:bg-secondary-50 hover:border-primary-300 transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 transition-transform group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            REFRESH
          </button>
        </div>
      </header>

      {/* --- FILTERS SECTION --- */}
      <div className="mb-8 flex flex-wrap items-center gap-4 animate-slide-in">
        <div className="flex-1 min-w-[300px] relative group">
          <input 
            type="text" 
            placeholder="Search by client name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-secondary-200 rounded-2xl px-12 py-3.5 text-sm font-bold text-secondary-900 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm group-hover:border-secondary-300"
          />
          <svg className="w-5 h-5 text-secondary-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center bg-white border border-secondary-200 rounded-2xl p-1 shadow-sm">
          {['all', 'positive', 'neutral', 'negative'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSentiment(s)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filterSentiment === s 
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' 
                  : 'text-secondary-400 hover:text-secondary-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white border border-secondary-200 rounded-2xl px-5 py-3.5 text-[10px] font-black text-secondary-600 focus:outline-none focus:border-primary-500 transition-all shadow-sm cursor-pointer uppercase tracking-widest"
        >
          <option value="all">ALL STATUSES</option>
          <option value="completed">COMPLETED</option>
          <option value="failed">FAILED</option>
          <option value="in-progress">IN-PROGRESS</option>
        </select>
      </div>

      {error && (
        <div className="mb-8 p-5 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-2xl flex items-center gap-4 shadow-md animate-slide-in">
          <div className="bg-red-500 p-1.5 rounded-full text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-2xl shadow-secondary-200/40 border border-secondary-100 overflow-hidden backdrop-blur-sm bg-white/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary-50/30 border-b border-secondary-100">
                <th className="px-8 py-6 text-xs font-bold text-secondary-400 uppercase tracking-[0.2em]">Client Identity</th>
                <th className="px-8 py-6 text-xs font-bold text-secondary-400 uppercase tracking-[0.2em]">Live Status</th>
                <th className="px-8 py-6 text-xs font-bold text-secondary-400 uppercase tracking-[0.2em]">Interaction Time</th>
                <th className="px-8 py-6 text-xs font-bold text-secondary-400 uppercase tracking-[0.2em]">Duration</th>
                <th className="px-8 py-6 text-xs font-bold text-secondary-400 uppercase tracking-[0.2em] text-right">Metrics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-50">
              {loading && calls?.length === 0 ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-5 bg-secondary-100 rounded-lg w-40"></div></td>
                    <td className="px-8 py-6"><div className="h-7 bg-secondary-100 rounded-full w-24"></div></td>
                    <td className="px-8 py-6"><div className="h-5 bg-secondary-100 rounded-lg w-28"></div></td>
                    <td className="px-8 py-6"><div className="h-5 bg-secondary-100 rounded-lg w-16"></div></td>
                    <td className="px-8 py-6"><div className="h-8 bg-secondary-100 rounded-xl w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : calls?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-32 text-center text-secondary-300">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-secondary-50 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-secondary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <span className="text-xl font-bold tracking-tight">System holds no records</span>
                      <p className="text-sm">Initiate a call to see live processing logs here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                calls?.filter(call => {
                  const matchesSearch = (call.clientId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                      (call.phone || '').includes(searchTerm);
                  const matchesSentiment = filterSentiment === 'all' || call.sentiment?.toLowerCase() === filterSentiment;
                  const matchesStatus = filterStatus === 'all' || 
                                      (filterStatus === 'in-progress' && ['ringing', 'initiated', 'in-progress', 'calling', 'processing'].includes(call.status)) ||
                                      call.status?.toLowerCase() === filterStatus;
                  
                  return matchesSearch && matchesSentiment && matchesStatus;
                }).map((call) => (
                  <tr key={call._id} className="hover:bg-primary-50/20 transition-all group cursor-default">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-110 ${getStatusColor(call.status).split(' ')[0]} ${getStatusColor(call.status).split(' ')[1]}`}>
                          {call.clientId?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">
                            {call.clientId?.name || 'Unknown Client'}
                          </div>
                          <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider mt-0.5">
                            {call.clientId?.phone || call.phone || 'No Phone Registered'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold border shadow-sm ${getStatusColor(call.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${call.status === 'completed' ? 'bg-success-500' : call.status === 'failed' ? 'bg-red-500' : 'bg-warning-500 animate-pulse'}`}></span>
                        {call.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">
                        {call.startedAt || call.createdAt ? format(new Date(call.startedAt || call.createdAt), 'h:mm:ss a') : '--:--:--'}
                      </div>
                      <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider mt-1">
                        {call.startedAt || call.createdAt ? format(new Date(call.startedAt || call.createdAt), 'MMM do, yyyy') : 'Awaiting Connection'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-secondary-800 tabular-nums">
                          {call.duration || 0}s
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => {
                          setSelectedCall(call);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-secondary-50 text-secondary-400 hover:bg-primary-500 hover:text-white hover:shadow-lg hover:shadow-primary-200 transition-all active:scale-90"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-secondary-50/50 px-8 py-4 flex justify-between items-center text-[10px] font-bold text-secondary-400 uppercase tracking-widest border-t border-secondary-100">
          <span>System Status: Online</span>
          <span>Last Updated: {format(new Date(), 'HH:mm:ss')}</span>
        </div>
      </div>
      {/* --- CALL INSIGHTS MODAL --- */}
      {isModalOpen && selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-12 animate-fade-in">
          <div className="absolute inset-0 bg-secondary-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col lg:flex-row animate-slide-up">
            {/* Left Panel: Stats & Audio */}
            <div className="lg:w-80 bg-secondary-50 p-8 flex flex-col border-r border-secondary-100">
              <div className="flex-1">
                <div className="w-16 h-16 rounded-3xl bg-primary-500 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-primary-200 mb-6 mx-auto">
                  {selectedCall.clientId?.name?.charAt(0) || 'U'}
                </div>
                
                <h3 className="text-xl font-black text-secondary-900 text-center leading-tight mb-1">
                  {selectedCall.clientId?.name || 'Unknown Client'}
                </h3>
                <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest text-center mb-8">
                  {selectedCall.clientId?.phone || selectedCall.phone}
                </p>

                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-secondary-100 shadow-sm">
                    <p className="text-[9px] font-bold text-secondary-400 uppercase tracking-[0.15em] mb-2">Health Score</p>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-black text-primary-600 tabular-nums leading-none">
                        {selectedCall.satisfactionScore || 5}
                      </div>
                      <div className="flex-1 h-2 bg-secondary-50 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(selectedCall.satisfactionScore || 5) * 10}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-secondary-100 shadow-sm">
                    <p className="text-[9px] font-bold text-secondary-400 uppercase tracking-[0.15em] mb-2">Business Impact</p>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      selectedCall.businessImpact === 'high' ? 'bg-red-100 text-red-600' : 
                      selectedCall.businessImpact === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-success-100 text-success-600'
                    }`}>
                      {selectedCall.businessImpact || 'MEDIUM'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedCall.recordingUrl && (
                <div className="mt-8 pt-8 border-t border-secondary-200">
                  <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-4 text-center">CALL RECORDING</p>
                  <audio controls className="w-full h-10 rounded-xl" src={selectedCall.recordingUrl}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>

            {/* Right Panel: Content */}
            <div className="flex-1 flex flex-col h-full bg-white relative">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-8 w-10 h-10 rounded-full bg-secondary-50 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-900 transition-all z-10 flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                {/* Summary Section */}
                <section className="mb-12">
                  <h4 className="text-xs font-black text-primary-500 uppercase tracking-[0.25em] mb-4">AI Business Summary</h4>
                  <p className="text-secondary-700 font-bold leading-relaxed text-lg italic bg-primary-50/30 p-6 rounded-3xl border border-primary-100">
                    "{selectedCall.summary || 'No summary generated for this call.'}"
                  </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                  {/* Action Items */}
                  <section>
                    <h4 className="text-xs font-black text-warning-500 uppercase tracking-[0.25em] mb-4">Next Action Steps</h4>
                    <ul className="space-y-3">
                      {(selectedCall.actionItems?.length > 0 ? selectedCall.actionItems : ['Follow up call recommended']).map((item, i) => (
                        <li key={i} className="flex gap-3 text-sm font-bold text-secondary-600">
                          <span className="w-5 h-5 rounded-lg bg-warning-100 text-warning-600 flex-shrink-0 flex items-center justify-center text-[10px]">
                            {i+1}
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Issues Detected */}
                  <section>
                    <h4 className="text-xs font-black text-red-500 uppercase tracking-[0.25em] mb-4">Issues Identified</h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedCall.issues?.length > 0 ? selectedCall.issues : ['None Detected']).map((issue, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                          {issue}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Transcript Section */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-black text-secondary-400 uppercase tracking-[0.25em]">Interactive Transcript</h4>
                    <span className="text-[10px] font-black text-secondary-300 uppercase tracking-widest">Deepgram Nova-2 Verified</span>
                  </div>
                  
                  <div className="space-y-6 bg-secondary-50/30 rounded-3xl p-6 border border-secondary-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {selectedCall.messages && selectedCall.messages.length > 0 ? (
                      selectedCall.messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                            msg.role === 'user' 
                              ? 'bg-white border border-secondary-200 text-secondary-800 rounded-tl-none' 
                              : 'bg-primary-500 text-white rounded-tr-none'
                          }`}>
                            <div className={`text-[9px] font-black uppercase tracking-widest mb-1 opacity-60 ${msg.role === 'user' ? 'text-secondary-400' : 'text-primary-100'}`}>
                              {msg.role === 'user' ? (selectedCall.clientId?.name || 'Client') : 'Alex (AI)'} • {msg.timestamp ? format(new Date(msg.timestamp), 'h:mm a') : ''}
                            </div>
                            <p className="text-sm font-bold leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-3xl p-8 border border-secondary-100 font-mono text-[13px] leading-relaxed text-secondary-500 whitespace-pre-line">
                        {selectedCall.transcript || 'Recording is being processed for transcription...'}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallLogs;
