import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getSupportMember, 
  updateSupportMember, 
  getAssignedClients 
} from '../api/supportMemberApi';
import { getCallHistory, initiateCall } from '../api/callApi';
import { updateClient } from '../api/clientApi';
import useAuth from '../hooks/useAuth';

export default function SupportMemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [member, setMember] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection for Client Context Panel
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientCallHistory, setClientCallHistory] = useState([]);
  const [loadingCallHistory, setLoadingCallHistory] = useState(false);
  const [callingClientId, setCallingClientId] = useState(null);

  // Status updating
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Escalation state
  const [updatingEscalation, setUpdatingEscalation] = useState(false);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProfileAndClients = useCallback(async () => {
    setLoading(true);
    try {
      const memberRes = await getSupportMember(id);
      setMember(memberRes.data.supportMember);

      const clientsRes = await getAssignedClients(id);
      const assignedList = clientsRes.data.assignedClients || [];
      setClients(assignedList);

      // Default select first client if any exist
      if (assignedList.length > 0 && !selectedClient) {
        setSelectedClient(assignedList[0]);
      }
    } catch (err) {
      showToast(err.message || 'Failed to retrieve profile information', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, selectedClient]);

  useEffect(() => {
    fetchProfileAndClients();
  }, [fetchProfileAndClients]);

  // Fetch selected client's call history
  const fetchClientCallHistory = useCallback(async (clientId) => {
    if (!clientId) return;
    setLoadingCallHistory(true);
    try {
      const res = await getCallHistory(1, '', 5, clientId);
      setClientCallHistory(res.data.calls || []);
    } catch (err) {
      console.error('Error fetching client call logs:', err);
    } finally {
      setLoadingCallHistory(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientCallHistory(selectedClient._id);
    }
  }, [selectedClient, fetchClientCallHistory]);

  const handleStatusToggle = async () => {
    if (!member) return;
    setUpdatingStatus(true);
    try {
      const nextStatusMap = {
        online: 'busy',
        busy: 'offline',
        offline: 'online'
      };
      const nextStatus = nextStatusMap[member.status] || 'online';
      const res = await updateSupportMember(member._id, { status: nextStatus });
      setMember(res.data.supportMember);
      showToast(`Status updated to ${nextStatus}`);
    } catch (err) {
      showToast('Failed to toggle status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleEscalationChange = async (level) => {
    if (!selectedClient) return;
    setUpdatingEscalation(true);
    try {
      // Save escalation level as client notes or metadata
      const updatedNotes = `${selectedClient.notes || ''}\n[ESCALATION: ${level} at ${new Date().toLocaleString()}]`.trim();
      await updateClient(selectedClient._id, { notes: updatedNotes });
      
      setSelectedClient(prev => ({
        ...prev,
        notes: updatedNotes
      }));
      showToast(`Escalation level set to ${level}`);
    } catch (err) {
      showToast('Failed to update escalation level', 'error');
    } finally {
      setUpdatingEscalation(false);
    }
  };

  const handleCallInitiate = async (clientId) => {
    setCallingClientId(clientId);
    try {
      await initiateCall(clientId);
      showToast('Outbound call request successfully sent to Twilio!');
      // Refresh call logs after a delay to show the queued call
      setTimeout(() => fetchClientCallHistory(clientId), 2000);
    } catch (err) {
      showToast(err.message || 'Call initiation failed', 'error');
    } finally {
      setCallingClientId(null);
    }
  };

  const getRoleLabel = (role) => {
    const roles = {
      support: 'Support Agent',
      senior_support: 'Senior Agent',
      technical_support: 'Tech Specialist',
      operations: 'Ops Lead',
      manager: 'Manager'
    };
    return roles[role] || role;
  };

  const getSentimentBadge = (sentiment) => {
    const sent = (sentiment || 'neutral').toLowerCase();
    if (sent === 'positive' || sent === 'happy') {
      return 'bg-success-50 border-success-200 text-success-600';
    }
    if (sent === 'negative' || sent === 'frustrated' || sent === 'upset') {
      return 'bg-danger-50 border-danger-200 text-danger-600';
    }
    return 'bg-warning-50 border-warning-200 text-warning-600';
  };

  if (loading && !member) {
    return (
      <div className="p-8 lg:p-10 flex items-center justify-center min-h-screen bg-bg-secondary">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-10 h-10 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-text-secondary font-medium">Loading workspace data...</span>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-8 lg:p-10 text-center min-h-screen bg-bg-secondary flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-text-primary">Workspace not found</h2>
        <button onClick={() => navigate('/support-team')} className="mt-4 px-6 py-2.5 bg-primary-600 text-white rounded-xl">
          Return to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-10 animate-fade-in bg-bg-secondary min-h-full">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl text-sm font-semibold shadow-2xl animate-slide-in border ${
            toast.type === 'error'
              ? 'bg-danger-50 border-danger-200 text-danger-600'
              : 'bg-success-50 border-success-200 text-success-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-danger-500' : 'bg-success-500'}`} />
            {toast.message}
          </div>
        </div>
      )}

      {/* Back navigation */}
      <button
        onClick={() => navigate('/support-team')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-primary-600 mb-6 group transition-colors cursor-pointer"
      >
        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Directory
      </button>

      {/* Profile Header Grid */}
      <div className="bg-white border border-border-primary rounded-2xl p-6 lg:p-8 shadow-sm mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 overflow-hidden flex items-center justify-center shadow-md">
              {member.avatar ? (
                <img src={member.avatar} alt={member.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-extrabold text-primary-700">
                  {member.fullName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Status light */}
            <span className={`absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full border-3 border-white ${
              member.status === 'online'
                ? 'bg-success-500 animate-pulse'
                : member.status === 'busy'
                ? 'bg-warning-500'
                : 'bg-secondary-400'
            }`} />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">{member.fullName}</h1>
            <p className="text-sm font-semibold text-text-secondary mt-1">
              {member.designation || getRoleLabel(member.role)}
              {member.department && <span className="text-text-tertiary"> · {member.department}</span>}
            </p>
            {member.skills && member.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {member.skills.map((s, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 bg-bg-secondary border border-border-primary rounded-lg text-[10px] font-bold text-text-secondary">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Connectivity status toggle */}
        <div className="flex flex-col sm:items-end gap-2">
          <span className="text-xs font-semibold text-text-tertiary">Live Status Override</span>
          <button
            onClick={handleStatusToggle}
            disabled={updatingStatus}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
              member.status === 'online'
                ? 'bg-success-50 border-success-200 text-success-600 hover:bg-success-100'
                : member.status === 'busy'
                ? 'bg-warning-50 border-warning-200 text-warning-600 hover:bg-warning-100'
                : 'bg-bg-secondary border-border-secondary text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            {updatingStatus ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <span className={`w-2 h-2 rounded-full ${
                member.status === 'online' ? 'bg-success-500' : member.status === 'busy' ? 'bg-warning-500' : 'bg-secondary-400'
              }`} />
            )}
            Status: {member.status.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Main split grid: Assignments vs Context Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Client list (Assigned checklist) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-border-primary rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border-primary pb-4 mb-4">
              <h2 className="text-lg font-bold text-text-primary">Client Assignments</h2>
              <span className="px-2.5 py-1 bg-primary-50 rounded-lg text-xs font-bold text-primary-600">
                {clients.length} Total
              </span>
            </div>

            {clients.length === 0 ? (
              <div className="py-12 text-center text-text-tertiary">
                <p className="font-semibold text-sm">No clients assigned</p>
                <p className="text-xs mt-1">Assignments are managed by administrators.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {clients.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => setSelectedClient(c)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                      selectedClient?._id === c._id
                        ? 'bg-primary-50 border-primary-300 shadow-sm shadow-primary-500/5'
                        : 'bg-bg-primary hover:bg-bg-secondary border-border-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className={`font-bold text-sm ${selectedClient?._id === c._id ? 'text-primary-700' : 'text-text-primary'}`}>
                        {c.name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.status === 'active' ? 'bg-success-50 text-success-600' : 'bg-secondary-100 text-secondary-500'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-text-secondary font-mono">
                      <span>{c.phone}</span>
                      <span className="font-sans text-text-tertiary">{c.product || 'No product'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Premium Client Context Panel (Step 3) */}
        <div className="lg:col-span-8">
          {selectedClient ? (
            <div className="bg-white border border-border-primary rounded-2xl p-6 lg:p-8 shadow-sm space-y-8">
              
              {/* Header inside Panel */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-primary pb-6 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest">Client Context Workspace</span>
                  <h2 className="text-2xl font-extrabold text-text-primary mt-1">{selectedClient.name}</h2>
                  <p className="text-xs text-text-tertiary mt-1 font-mono">ID: {selectedClient._id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Outbound call button */}
                  <button
                    onClick={() => handleCallInitiate(selectedClient._id)}
                    disabled={callingClientId === selectedClient._id}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                      callingClientId === selectedClient._id
                        ? 'bg-primary-50 border border-primary-200 text-primary-400 cursor-wait'
                        : 'bg-success-600 hover:bg-success-500 text-white shadow-success-600/10 hover:scale-102'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {callingClientId === selectedClient._id ? 'Calling Client...' : 'Initiate Outbound Call'}
                  </button>
                </div>
              </div>

              {/* Client Profile details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-bg-secondary p-5 rounded-2xl border border-border-primary">
                <div>
                  <span className="text-xs font-bold text-text-tertiary block">Email Address</span>
                  <span className="font-medium text-sm text-text-primary break-all mt-0.5 block">
                    {selectedClient.email || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-text-tertiary block">Outbound Telephony Phone</span>
                  <span className="font-mono text-sm text-text-primary mt-0.5 block">
                    {selectedClient.phone}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-text-tertiary block">Product Segment</span>
                  <span className="font-medium text-sm text-text-primary mt-0.5 block">
                    {selectedClient.product || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-text-tertiary block">Primary Language</span>
                  <span className="font-medium text-sm text-text-primary mt-0.5 block">
                    {selectedClient.language === 'en' ? 'English (en-US)' : 'Hindi (hi-IN)'}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-xs font-bold text-text-tertiary block">Geographic Address</span>
                  <span className="font-medium text-sm text-text-primary mt-0.5 block">
                    {selectedClient.address || '—'}
                  </span>
                </div>
              </div>

              {/* Step 3: Sentiment Reports & Escalations Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Sentiment Analytics */}
                <div className="bg-bg-primary border border-border-primary p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-text-primary border-b border-border-primary pb-2 mb-3">
                    Sentiment & Health Report
                  </h3>
                  
                  {clientCallHistory.length > 0 && clientCallHistory[0].sentiment ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Recent Call Sentiment</span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getSentimentBadge(clientCallHistory[0].sentiment)}`}>
                          {clientCallHistory[0].sentiment.toUpperCase()}
                        </span>
                      </div>

                      {clientCallHistory[0].satisfactionScore !== undefined && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-text-secondary">
                            <span>Client Satisfaction Score</span>
                            <span className="font-bold">{clientCallHistory[0].satisfactionScore} / 10</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-bg-tertiary h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary-500 h-full transition-all"
                              style={{ width: `${(clientCallHistory[0].satisfactionScore || 5) * 10}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {clientCallHistory[0].businessImpact && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">Business Churn Impact</span>
                          <span className="font-bold text-text-primary uppercase">{clientCallHistory[0].businessImpact}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-text-tertiary">
                      No call history sentiment calculated yet. Trigger a call to fetch real-time sentiment metrics.
                    </div>
                  )}
                </div>

                {/* Escalation Control */}
                <div className="bg-bg-primary border border-border-primary p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary border-b border-border-primary pb-2 mb-3">
                      Escalation Handler
                    </h3>
                    <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                      Escalate this client's profile if their sentiment deteriorates, requiring immediate human follow-ups.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-text-tertiary uppercase block">Assigned Escalation Level</label>
                    <select
                      onChange={(e) => handleEscalationChange(e.target.value)}
                      disabled={updatingEscalation}
                      className="w-full px-3 py-2 bg-white border border-border-primary rounded-xl text-xs font-semibold focus:outline-none appearance-none cursor-pointer"
                      defaultValue={selectedClient.notes?.includes('[ESCALATION: High') ? 'High' : selectedClient.notes?.includes('[ESCALATION: Critical') ? 'Critical' : 'Normal'}
                    >
                      <option value="Normal">Normal — Under AI Surveillance</option>
                      <option value="High">High — Needs Operations Review</option>
                      <option value="Critical">Critical — Require Immediate Callback</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* AI call summaries & Transcription block */}
              <div className="bg-bg-primary border border-border-primary p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-text-primary border-b border-border-primary pb-2 mb-3">
                  AI Context Summary & Issues Captured
                </h3>

                {clientCallHistory.length > 0 && clientCallHistory[0].summary ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-text-tertiary uppercase block mb-1">AI Summary</span>
                      <p className="text-xs text-text-secondary leading-relaxed bg-bg-secondary p-3.5 rounded-xl border border-border-primary">
                        {clientCallHistory[0].summary}
                      </p>
                    </div>

                    {clientCallHistory[0].issues && clientCallHistory[0].issues.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-text-tertiary uppercase block mb-1">Issues Flags</span>
                        <div className="flex flex-wrap gap-1.5">
                          {clientCallHistory[0].issues.map((issue, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-[10px] font-bold text-red-600">
                              {issue}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {clientCallHistory[0].actionItems && clientCallHistory[0].actionItems.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-text-tertiary uppercase block mb-1">Action Items Assigned</span>
                        <ul className="list-disc list-inside text-xs text-text-secondary space-y-1 pl-1">
                          {clientCallHistory[0].actionItems.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-text-tertiary bg-bg-secondary rounded-xl border border-dashed border-border-primary">
                    No active call logs found or AI summaries generated. Initiate a call to trigger the telecommunication pipeline.
                  </div>
                )}
              </div>

              {/* Client historical communication logs (Step 2) */}
              <div className="bg-bg-primary border border-border-primary p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border-primary pb-2 mb-3">
                  <h3 className="text-sm font-bold text-text-primary">Communication History</h3>
                  <span className="text-xs text-text-tertiary font-medium">Last 5 interactions</span>
                </div>

                {loadingCallHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="w-6 h-6 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : clientCallHistory.length === 0 ? (
                  <p className="text-xs text-text-tertiary text-center py-6">
                    No historical logs recorded.
                  </p>
                ) : (
                  <div className="divide-y divide-border-primary">
                    {clientCallHistory.map((call) => (
                      <div key={call.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              call.status === 'recorded' || call.status === 'completed'
                                ? 'bg-success-500'
                                : call.status === 'failed'
                                ? 'bg-danger-500'
                                : 'bg-primary-500'
                            }`} />
                            <span className="text-xs font-bold text-text-primary capitalize">{call.status}</span>
                            <span className="text-[10px] text-text-tertiary">· {new Date(call.date).toLocaleString()}</span>
                          </div>
                          {call.summary && (
                            <p className="text-xs text-text-secondary line-clamp-1 mt-1 pl-4">
                              {call.summary}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {call.duration && (
                            <span className="text-xs font-mono text-text-tertiary">
                              {call.duration}s
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white border border-border-primary rounded-2xl p-16 text-center shadow-sm flex flex-col items-center justify-center min-h-[500px]">
              <div className="w-20 h-20 bg-bg-secondary rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-text-primary">No Client Selected</h3>
              <p className="text-text-secondary mt-1">Select a client on the left column to view their live Context panel.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
