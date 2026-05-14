import { useEffect, useState, useRef } from 'react';
import { getCallDetail } from '../api/callApi';
import { format } from 'date-fns';

export default function CallDetailModal({ callId, onClose }) {
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('transcript');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!callId) return;

    let interval;
    async function fetchDetail() {
      try {
        const res = await getCallDetail(callId);
        const callData = res.data.call;
        setCall(callData);
        setError(null);

        // If call is still in-progress or ringing, keep polling for live updates
        if (['in-progress', 'ringing', 'initiated', 'processing'].includes(callData?.status)) {
          interval = setInterval(async () => {
            try {
              const r = await getCallDetail(callId);
              setCall(r.data.call);
              if (['recorded', 'completed', 'failed'].includes(r.data.call?.status)) {
                clearInterval(interval);
              }
            } catch (_) {}
          }, 3000);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch details');
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
    return () => clearInterval(interval);
  }, [callId]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [call?.messages]);

  if (!callId) return null;

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-amber-600 bg-amber-50 border-amber-200';
    }
  };

  const getSentimentIcon = (sentiment) => {
    if (sentiment === 'positive') return '😊';
    if (sentiment === 'negative') return '😟';
    return '😐';
  };

  const getStatusDot = (status) => {
    if (['in-progress', 'ringing', 'initiated'].includes(status)) {
      return <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse inline-block" />;
    }
    if (status === 'recorded') return <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />;
    if (status === 'failed') return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
    return <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />;
  };

  const isLive = call && ['in-progress', 'ringing', 'initiated', 'processing'].includes(call.status);

  const tabs = [
    { id: 'transcript', label: 'Live Transcript' },
    { id: 'insights', label: 'AI Insights' },
    { id: 'issues', label: `Issues${call?.issues?.length > 0 ? ` (${call.issues.length})` : ''}` },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
              {call?.clientName?.charAt(0) || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{call?.clientName || 'Loading...'}</h2>
                {call && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${isLive ? 'text-sky-600 bg-sky-50 border-sky-200' : call.status === 'recorded' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                    {getStatusDot(call.status)}
                    {isLive ? 'LIVE' : call.status?.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 font-mono mt-0.5">{call?.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {call?.duration > 0 && (
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Duration</div>
                <div className="text-sm font-bold text-gray-700">{call.duration}s</div>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-8 flex-shrink-0 bg-white">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-gray-400 animate-pulse text-sm">Loading conversation data...</p>
            </div>
          ) : error ? (
            <div className="m-8 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-center text-sm">
              {error}
            </div>
          ) : (
            <>
              {/* ── TRANSCRIPT TAB ── */}
              {activeTab === 'transcript' && (
                <div className="p-6">
                  {isLive && (
                    <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-sky-50 border border-sky-200 rounded-2xl">
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                      <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Call in Progress — Updating Live</span>
                    </div>
                  )}
                  
                  {call.messages && call.messages.length > 0 ? (
                    <div className="space-y-4">
                      {call.messages.filter(m => m.role !== 'system').map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === 'assistant' ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black shadow-sm ${
                            msg.role === 'assistant'
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {msg.role === 'assistant' ? 'AI' : call.clientName?.charAt(0) || 'C'}
                          </div>
                          {/* Bubble */}
                          <div className={`max-w-[72%] ${msg.role === 'assistant' ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${msg.role === 'assistant' ? 'text-right text-blue-400' : 'text-gray-400'}`}>
                              {msg.role === 'assistant' ? 'Alex (AI)' : call.clientName}
                              {msg.timestamp && ` · ${format(new Date(msg.timestamp), 'h:mm a')}`}
                            </div>
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                              msg.role === 'assistant'
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-tr-sm shadow-md shadow-blue-200'
                                : 'bg-gray-100 text-gray-800 rounded-tl-sm border border-gray-200'
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="font-medium">No conversation recorded yet.</p>
                      {isLive && <p className="text-xs">Messages will appear as the call progresses.</p>}
                    </div>
                  )}

                  {/* Recording */}
                  {call.recordingUrl && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Call Recording</p>
                      <audio controls className="w-full h-10">
                        <source src={call.recordingUrl} type="audio/wav" />
                      </audio>
                    </div>
                  )}
                </div>
              )}

              {/* ── INSIGHTS TAB ── */}
              {activeTab === 'insights' && (
                <div className="p-6 space-y-6">
                  {call.status !== 'recorded' && call.status !== 'completed' ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                      {isLive ? (
                        <>
                          <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                          <p className="font-medium text-sm">AI insights will generate after the call ends.</p>
                        </>
                      ) : (
                        <>
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <p className="font-medium text-sm">Analysis not yet available.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Sentiment + Score Row */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                          <div className="text-3xl mb-1">{getSentimentIcon(call.sentiment)}</div>
                          <div className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block ${getSentimentColor(call.sentiment)}`}>
                            {call.sentiment || 'neutral'}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">Sentiment</div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                          <div className="text-3xl font-black text-blue-600 mb-1">{call.satisfactionScore || 5}<span className="text-sm text-gray-400">/10</span></div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(call.satisfactionScore || 5) * 10}%` }} />
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">Satisfaction</div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                          <div className={`text-xl font-black mb-1 ${call.businessImpact === 'high' ? 'text-red-500' : call.businessImpact === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {call.businessImpact?.toUpperCase() || 'MEDIUM'}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">Business Impact</div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">AI Business Summary</h3>
                        <p className="text-gray-700 leading-relaxed text-sm italic">"{call.summary || 'No summary generated.'}"</p>
                      </div>

                      {/* Action Items */}
                      {call.actionItems?.length > 0 && (
                        <div>
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Next Action Steps</h3>
                          <div className="space-y-2">
                            {call.actionItems.map((item, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <div className="w-5 h-5 rounded-full bg-amber-400 flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white mt-0.5">{i+1}</div>
                                <span className="text-sm text-gray-700">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── ISSUES TAB ── */}
              {activeTab === 'issues' && (
                <div className="p-6">
                  {call.status !== 'recorded' && call.status !== 'completed' ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="font-medium text-sm">{isLive ? 'Issues will appear after the call ends.' : 'Analysis not yet available.'}</p>
                    </div>
                  ) : call.issues?.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{call.issues.length} Issue{call.issues.length > 1 ? 's' : ''} Identified</span>
                      </div>
                      {call.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 bg-red-50 border border-red-100 rounded-2xl">
                          <div className="w-6 h-6 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white mt-0.5">{i+1}</div>
                          <div>
                            <p className="text-sm font-semibold text-red-800">{issue}</p>
                          </div>
                        </div>
                      ))}

                      {/* Feedback Summary */}
                      {call.summary && (
                        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Client Feedback Summary</p>
                          <p className="text-sm text-gray-600 italic">"{call.summary}"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="font-bold text-emerald-600">No Issues Reported</p>
                      <p className="text-xs">The client didn't raise any concerns during this call.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400">
            {call?.date && `Call on ${format(new Date(call.date), 'MMM d, yyyy · h:mm a')}`}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-all shadow-lg active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
