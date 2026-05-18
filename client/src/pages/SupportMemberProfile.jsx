import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import * as supportApi from '../api/supportMemberApi';
import * as callApi from '../api/callApi';
import * as chatApi from '../api/chatApi';

export default function SupportMemberProfile() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [assignedClients, setAssignedClients] = useState([]);
  const [allCalls, setAllCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Client selection for Step 3 Context Panel
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientCalls, setClientCalls] = useState([]);
  const [selectedCallDetails, setSelectedCallDetails] = useState(null);

  // Active Tab inside Client Context Panel (summary, transcripts, escalations, chat, notes)
  const [activeTab, setActiveTab] = useState('summary');

  // Real-Time Socket/Chat States (Step 1, 3, 4)
  const [clientRooms, setClientRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [socket, setSocket] = useState(null);
  const [typingUsers, setTypingUsers] = useState({}); // supportMemberId -> name
  const [isTypingLocal, setIsTypingLocal] = useState(false);

  // Secure Internal Private Notes (Step 5)
  const [internalNotes, setInternalNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState('general'); // general, escalation, billing, technical
  const [savingNote, setSavingNote] = useState(false);

  const messageEndRef = useRef(null);

  useEffect(() => {
    fetchMemberData();
  }, [id]);

  // Connect to real-time websocket coordination gateway on load
  useEffect(() => {
    if (!member) return;

    // Connect using current HTTP host or environment config
    const socketUrl = import.meta.env.VITE_API_URL || '';
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[SOCKET] Webchat gateway link established');
      newSocket.emit('auth', { supportMemberId: member._id });
    });

    // Handle new message arrival
    newSocket.on('new_message', (msg) => {
      // Only append if the message belongs to the currently active chat room
      setMessages((prev) => {
        if (prev.some(p => p._id === msg._id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    });

    // Handle incoming typing indicators
    newSocket.on('typing_status', ({ conversationId, supportMemberId, fullName, isTyping }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [supportMemberId]: isTyping ? fullName : null
      }));
    });

    // Handle online agent updates
    newSocket.on('presence_update', ({ supportMemberId, status }) => {
      if (member && member._id === supportMemberId) {
        setMember(prev => ({ ...prev, status }));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [member?._id]);

  const fetchMemberData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch support member
      const memberRes = await supportApi.getSupportMember(id);
      setMember(memberRes.data);

      // 2. Fetch assigned clients list
      const clientsRes = await supportApi.getAssignedClients(id);
      const clientsList = clientsRes.data || [];
      setAssignedClients(clientsList);

      // 3. Fetch all system calls to match for history/sentiment
      const callsRes = await callApi.getCallHistory(1, '', 200);
      const callsList = callsRes.data?.calls || [];
      setAllCalls(callsList);

      // Auto-select first client if available
      if (clientsList.length > 0) {
        handleSelectClient(clientsList[0], callsList);
      }
    } catch (err) {
      setError(err.message || 'Failed to load support member profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = async (client, callsList = allCalls) => {
    setSelectedClient(client);
    setSelectedCallDetails(null);
    setSelectedRoom(null);
    setMessages([]);
    
    // Filter calls for this client
    const filtered = callsList.filter(call => {
      const callClientId = typeof call.clientId === 'object' ? call.clientId._id : call.clientId;
      return callClientId === client._id;
    });
    setClientCalls(filtered);

    // Fetch client-specific real-time chat channels
    try {
      const roomsRes = await chatApi.getClientConversations(client._id);
      setClientRooms(roomsRes.data || []);
      // Auto-select standard API room
      if (roomsRes.data && roomsRes.data.length > 0) {
        handleSelectRoom(roomsRes.data[0]);
      }
    } catch (err) {
      console.error('Failed loading room channels', err);
    }

    // Fetch secure client remarks/notes
    try {
      const notesRes = await chatApi.getInternalNotes(client._id);
      setInternalNotes(notesRes.data || []);
    } catch (err) {
      console.error('Failed loading internal notes', err);
    }
  };

  const handleSelectRoom = async (room) => {
    if (socket && selectedRoom) {
      socket.emit('leave_room', { conversationId: selectedRoom._id });
    }

    setSelectedRoom(room);
    setMessages([]);

    if (socket) {
      socket.emit('join_room', { conversationId: room._id });
    }

    try {
      const messagesRes = await chatApi.getMessages(room._id);
      setMessages(messagesRes.data || []);
      scrollToBottom();
      
      // Mark read
      await chatApi.markRead(room._id);
    } catch (err) {
      console.error('Error fetching room message history', err);
    }
  };

  const handleMessageChange = (e) => {
    setNewMessageText(e.target.value);
    
    if (socket && selectedRoom && member) {
      if (!isTypingLocal && e.target.value.trim().length > 0) {
        setIsTypingLocal(true);
        socket.emit('typing', { conversationId: selectedRoom._id, isTyping: true, fullName: member.fullName });
      } else if (e.target.value.trim().length === 0) {
        setIsTypingLocal(false);
        socket.emit('typing', { conversationId: selectedRoom._id, isTyping: false, fullName: member.fullName });
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !socket || !selectedRoom) return;

    // Reset local typing indicator
    setIsTypingLocal(false);
    socket.emit('typing', { conversationId: selectedRoom._id, isTyping: false, fullName: member.fullName });

    // Send via socket
    socket.emit('send_message', {
      conversationId: selectedRoom._id,
      message: newMessageText,
      attachments: []
    });

    setNewMessageText('');
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || savingNote) return;

    setSavingNote(true);
    try {
      const noteRes = await chatApi.createInternalNote(selectedClient._id, {
        note: newNoteText,
        type: newNoteType
      });
      setInternalNotes(prev => [noteRes.data, ...prev]);
      setNewNoteText('');
      setNewNoteType('general');
    } catch (err) {
      alert(err.message || 'Failed to save secure notes');
    } finally {
      setSavingNote(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleShowCallDetails = (call) => {
    setSelectedCallDetails(call);
  };

  const handleInitiateCall = async (clientId) => {
    if (!window.confirm('Are you sure you want to trigger an outbound AI call to this client now?')) {
      return;
    }
    try {
      await callApi.initiateCall(clientId);
      alert('Outbound voice call process triggered successfully!');
      setTimeout(async () => {
        const callsRes = await callApi.getCallHistory(1, '', 200);
        const callsList = callsRes.data?.calls || [];
        setAllCalls(callsList);
        if (selectedClient) {
          handleSelectClient(selectedClient, callsList);
        }
      }, 3000);
    } catch (err) {
      alert(err.message || 'Failed to trigger outbound call');
    }
  };

  const getSentimentStats = () => {
    if (clientCalls.length === 0) return { positive: 0, neutral: 0, negative: 0 };
    let pos = 0, neu = 0, neg = 0;
    clientCalls.forEach(c => {
      const s = c.sentiment?.toLowerCase() || '';
      if (s.includes('pos')) pos++;
      else if (s.includes('neg') || s.includes('fail') || s.includes('escalate')) neg++;
      else neu++;
    });
    const total = clientCalls.length;
    return {
      positive: Math.round((pos / total) * 100),
      neutral: Math.round((neu / total) * 100),
      negative: Math.round((neg / total) * 100)
    };
  };

  const sentimentStats = getSentimentStats();
  const escalatedCalls = clientCalls.filter(c => c.issues && c.issues.length > 0);

  // Filter typing list to avoid rendering undefined strings
  const activeTypers = Object.values(typingUsers).filter(Boolean);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-secondary">
        <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-8">
        <div className="bg-danger-50 border border-danger-100 text-danger-700 p-5 rounded-2xl text-center font-medium shadow-sm">
          ⚠️ {error || 'Support Specialist not found'}
        </div>
        <div className="mt-4 text-center">
          <Link to="/support-team" className="text-primary-600 font-bold hover:underline">
            &larr; Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <Link to="/support-team" className="flex items-center gap-1.5 text-text-tertiary hover:text-text-primary font-bold text-sm transition-all group">
          <svg className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Support Directory
        </Link>
      </div>

      {/* Profile Card Header */}
      <div className="bg-white border border-border-primary rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        {/* Accent status bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${
          member.status === 'online' ? 'bg-success-500' :
          member.status === 'busy' ? 'bg-warning-500' :
          'bg-slate-300'
        }`}></div>

        <div className="relative">
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={member.fullName}
              className="w-24 h-24 rounded-2xl object-cover shadow-md border border-border-primary"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-3xl uppercase border border-primary-200 shadow-inner">
              {member.fullName.charAt(0)}
            </div>
          )}
          <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white shadow-md flex items-center justify-center ${
            member.status === 'online' ? 'bg-success-500' :
            member.status === 'busy' ? 'bg-warning-500' :
            'bg-slate-400'
          }`}>
            {member.status === 'online' && <span className="absolute w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>}
          </span>
        </div>

        <div className="flex-1 min-w-0 text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row md:items-center gap-2.5">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">{member.fullName}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border self-center md:self-auto capitalize ${
              member.status === 'online' ? 'bg-success-50 border-success-100 text-success-700' :
              member.status === 'busy' ? 'bg-warning-50 border-warning-100 text-warning-700' :
              'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              ● {member.status}
            </span>
          </div>
          <p className="text-sm font-bold text-text-tertiary uppercase tracking-wider">
            {member.designation || 'Specialist'} &bull; <span className="text-primary-700">{member.department || 'Success'}</span>
          </p>

          {member.skills && member.skills.length > 0 && (
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 pt-1">
              {member.skills.map((s, i) => (
                <span key={i} className="bg-bg-secondary text-text-secondary border border-border-primary px-2.5 py-0.5 rounded-lg text-xs font-semibold">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Corporate stats side block */}
        <div className="bg-bg-secondary border border-border-primary p-4 rounded-2xl flex gap-6 text-center md:text-left">
          <div>
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Assignments</p>
            <h4 className="text-2xl font-bold text-text-primary mt-1">{assignedClients.length}</h4>
          </div>
          <div className="w-px bg-border-primary"></div>
          <div>
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Live Calls</p>
            <h4 className="text-2xl font-bold text-text-primary mt-1">
              {allCalls.filter(c => c.clientId && assignedClients.some(ac => ac._id === (typeof c.clientId === 'object' ? c.clientId._id : c.clientId))).length}
            </h4>
          </div>
        </div>
      </div>

      {/* Split Workspace View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Active assignments list (Master) */}
        <div className="lg:col-span-4 bg-white border border-border-primary rounded-3xl p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-text-primary border-b border-border-primary pb-3">
            Corporate Client Directory ({assignedClients.length})
          </h2>
          {assignedClients.length === 0 ? (
            <div className="py-12 text-center text-text-tertiary space-y-2">
              <svg className="w-12 h-12 mx-auto text-text-tertiary opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h5 className="font-bold text-text-secondary text-sm">No clients assigned</h5>
              <p className="text-xs">Use the support workspace to assign corporate clients to this agent.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {assignedClients.map((client) => {
                const isSelected = selectedClient?._id === client._id;
                return (
                  <div
                    key={client._id}
                    onClick={() => handleSelectClient(client)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${
                      isSelected 
                        ? 'bg-primary-50/50 border-primary-300 shadow-sm' 
                        : 'bg-white border-border-primary hover:border-primary-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <h4 className={`text-sm font-bold text-text-primary truncate ${isSelected ? 'text-primary-700' : ''}`}>
                        {client.name}
                      </h4>
                      <p className="text-xs text-text-tertiary font-semibold truncate mt-0.5">
                        📦 {client.product || 'Enterprise Care'}
                      </p>
                    </div>
                    <svg className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${
                      isSelected ? 'text-primary-600 translate-x-1' : 'group-hover:translate-x-1'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Client Context Panel (Detail) */}
        <div className="lg:col-span-8 bg-white border border-border-primary rounded-3xl p-6 shadow-sm min-h-[70vh] flex flex-col justify-between">
          {!selectedClient ? (
            <div className="m-auto text-center py-20 text-text-tertiary max-w-sm space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-500 mx-auto border border-primary-100 shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text-primary">Corporate Customer Success Panel</h3>
              <p className="text-sm">Select one of the assigned clients from the left directory to display their custom AI telemetry, summaries, and escalated activities.</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div>
                {/* 1. Client Context Mini-Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-primary pb-5 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-text-primary tracking-tight">{selectedClient.name}</h2>
                    <p className="text-xs text-text-tertiary font-semibold mt-1">
                      📞 {selectedClient.phone} &bull; 📧 {selectedClient.email || 'No email registered'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInitiateCall(selectedClient._id)}
                      className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-primary-500/10 transition-all active:scale-95 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Trigger outbound call
                    </button>
                  </div>
                </div>

                {/* 2. Client Analytics Dashboard Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                  {/* Sentiment Progress Card */}
                  <div className="bg-bg-secondary border border-border-primary p-4 rounded-2xl space-y-2 shadow-inner">
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">AI Sentiment Profile</p>
                    {clientCalls.length === 0 ? (
                      <p className="text-xs text-text-tertiary">No interaction telemetry</p>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-success-600">Pos ({sentimentStats.positive}%)</span>
                          <span className="text-danger-600">Neg ({sentimentStats.negative}%)</span>
                        </div>
                        {/* Tri-color Progress Bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                          <div style={{ width: `${sentimentStats.positive}%` }} className="bg-success-500 h-full"></div>
                          <div style={{ width: `${sentimentStats.neutral}%` }} className="bg-slate-400 h-full"></div>
                          <div style={{ width: `${sentimentStats.negative}%` }} className="bg-danger-500 h-full"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Call Volume Statistics */}
                  <div className="bg-bg-secondary border border-border-primary p-4 rounded-2xl space-y-1 shadow-inner">
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Call interactions</p>
                    <h3 className="text-xl font-black text-text-primary mt-0.5">{clientCalls.length} calls</h3>
                    <p className="text-[10px] text-text-tertiary font-bold">Total voice engagements</p>
                  </div>

                  {/* Last Interactions Tracker */}
                  <div className="bg-bg-secondary border border-border-primary p-4 rounded-2xl space-y-1 shadow-inner">
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Last call date</p>
                    <h3 className="text-base font-bold text-text-primary truncate mt-0.5">
                      {selectedClient.lastCallAt 
                        ? new Date(selectedClient.lastCallAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                        : 'Never contacted'}
                    </h3>
                    <p className="text-[10px] text-text-tertiary font-bold">Telephony timestamp</p>
                  </div>
                </div>

                {/* 3. Navigation Tabs within Context */}
                <div className="flex flex-wrap border-b border-border-primary mt-6">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                      activeTab === 'summary' 
                        ? 'border-primary-500 text-primary-600' 
                        : 'border-transparent text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    AI Call Logs ({clientCalls.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('escalations')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                      activeTab === 'escalations' 
                        ? 'border-danger-500 text-danger-600' 
                        : 'border-transparent text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    Escalations & Issues ({escalatedCalls.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('chat'); scrollToBottom(); }}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                      activeTab === 'chat' 
                        ? 'border-primary-500 text-primary-600' 
                        : 'border-transparent text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    💬 Real-Time Chat Channels
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                      activeTab === 'notes' 
                        ? 'border-primary-500 text-primary-600' 
                        : 'border-transparent text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    📝 Secure Staff Notes ({internalNotes.length})
                  </button>
                </div>

                {/* 4. Tab Contents */}
                <div className="pt-4 flex-1">
                  {/* TAB 1: CALL LOGS */}
                  {activeTab === 'summary' && (
                    <div className="space-y-4">
                      {clientCalls.length === 0 ? (
                        <p className="text-sm text-text-tertiary text-center py-8">No AI Call interaction logs found for this client.</p>
                      ) : (
                        <div className="space-y-3">
                          {clientCalls.map((call) => (
                            <div
                              key={call.id}
                              className="border border-border-primary rounded-2xl p-4 transition-all hover:border-primary-200 bg-white"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-primary pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${
                                    call.status === 'recorded' ? 'bg-success-500' :
                                    call.status === 'failed' ? 'bg-danger-500' :
                                    'bg-primary-500 animate-pulse'
                                  }`}></span>
                                  <span className="text-xs font-bold text-text-primary capitalize">{call.status}</span>
                                  <span className="text-xs text-text-tertiary">
                                    {new Date(call.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                                  call.sentiment?.toLowerCase() === 'positive' ? 'bg-success-50 border-success-100 text-success-700' :
                                  call.sentiment?.toLowerCase() === 'negative' ? 'bg-danger-50 border-danger-100 text-danger-700' :
                                  'bg-slate-50 border-slate-100 text-slate-700'
                                }`}>
                                  {call.sentiment || 'neutral'}
                                </span>
                              </div>

                              <div className="mt-3 space-y-2">
                                {call.summary ? (
                                  <p className="text-xs font-medium text-text-secondary leading-relaxed bg-bg-secondary p-3 rounded-xl border border-border-primary">
                                    🤖 <strong>AI Summary:</strong> {call.summary}
                                  </p>
                                ) : (
                                  <p className="text-xs italic text-text-tertiary">Call in queue or completed without recording transcript.</p>
                                )}

                                {/* Action items & playback */}
                                <div className="flex flex-wrap gap-2 pt-1.5 items-center justify-between">
                                  {call.actionItems && call.actionItems.length > 0 && (
                                    <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md">
                                      📝 {call.actionItems.length} Action Items
                                    </span>
                                  )}
                                  
                                  {call.recordingUrl && (
                                    <audio 
                                      src={call.recordingUrl} 
                                      controls 
                                      className="h-7 w-44 scale-95 opacity-80 hover:opacity-100 transition-opacity" 
                                    />
                                  )}

                                  <button
                                    onClick={() => handleShowCallDetails(call)}
                                    className="text-xs text-primary-600 hover:text-primary-700 font-bold ml-auto hover:underline cursor-pointer"
                                  >
                                    View Full Analysis &rarr;
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: ESCALATIONS */}
                  {activeTab === 'escalations' && (
                    <div className="space-y-4">
                      {escalatedCalls.length === 0 ? (
                        <div className="bg-success-50 border border-success-100 text-success-700 p-5 rounded-2xl text-center text-sm font-semibold">
                          🎉 Perfect Health score. No AI issues or escalations registered for this account!
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {escalatedCalls.map((call) => (
                            <div
                              key={call.id}
                              className="border border-danger-100 rounded-2xl p-4 bg-danger-50/20 space-y-2"
                            >
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-danger-700 uppercase tracking-wide">⚠️ AI Escalation Event</span>
                                <span className="text-text-tertiary">
                                  {new Date(call.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs text-text-primary font-bold">Issues Identified:</p>
                                <ul className="list-disc pl-4 text-xs text-text-secondary space-y-1">
                                  {call.issues.map((issue, idx) => (
                                    <li key={idx} className="font-medium text-danger-800">{issue}</li>
                                  ))}
                                </ul>
                              </div>
                              {call.actionItems && call.actionItems.length > 0 && (
                                <div className="space-y-1 mt-2 pt-2 border-t border-danger-100/50">
                                  <p className="text-xs text-text-primary font-bold">Recommended Mitigation Steps:</p>
                                  <ul className="list-decimal pl-4 text-xs text-text-secondary space-y-1">
                                    {call.actionItems.map((item, idx) => (
                                      <li key={idx} className="font-medium">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: REAL-TIME SUCCESS CHAT (Step 3 & 4) */}
                  {activeTab === 'chat' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 border border-border-primary rounded-3xl overflow-hidden bg-bg-secondary h-[50vh]">
                      {/* Left: Chat Rooms list */}
                      <div className="md:col-span-4 border-r border-border-primary bg-white p-3 space-y-2 overflow-y-auto">
                        <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider px-2.5 pb-1">
                          Rooms Channels
                        </h4>
                        {clientRooms.map((room) => {
                          const isActive = selectedRoom?._id === room._id;
                          return (
                            <button
                              key={room._id}
                              onClick={() => handleSelectRoom(room)}
                              className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all transition-colors truncate block cursor-pointer ${
                                isActive 
                                  ? 'bg-primary-50 text-primary-700 border border-primary-200' 
                                  : 'hover:bg-bg-secondary text-text-secondary border border-transparent'
                              }`}
                            >
                              {room.name}
                            </button>
                          );
                        })}
                      </div>

                      {/* Right: Message Workspace */}
                      <div className="md:col-span-8 flex flex-col justify-between h-full bg-white relative">
                        {selectedRoom ? (
                          <>
                            {/* Room Header */}
                            <div className="px-4 py-3 border-b border-border-primary flex items-center justify-between bg-bg-secondary">
                              <div>
                                <h4 className="text-xs font-bold text-text-primary tracking-tight">
                                  {selectedRoom.name}
                                </h4>
                                <p className="text-[9px] text-text-tertiary font-medium mt-0.5">
                                  Topic: {selectedRoom.roomTopic || 'client discussion'}
                                </p>
                              </div>
                            </div>

                            {/* Message Log */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[30vh]">
                              {messages.length === 0 ? (
                                <p className="text-[11px] text-text-tertiary italic text-center py-6">
                                  No messages. Send a message to start collaboration!
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {messages.map((msg) => {
                                    const isSelf = msg.sender?._id === member._id || msg.sender === member._id;
                                    return (
                                      <div 
                                        key={msg._id} 
                                        className={`flex gap-2.5 max-w-[85%] ${isSelf ? 'ml-auto flex-row-reverse' : ''}`}
                                      >
                                        <div className="flex flex-col space-y-1">
                                          {/* Sender header */}
                                          {!isSelf && (
                                            <span className="text-[9px] font-bold text-text-tertiary uppercase">
                                              {msg.sender?.fullName || 'Success Agent'} &bull; {msg.sender?.designation || 'Specialist'}
                                            </span>
                                          )}
                                          <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                                            isSelf
                                              ? 'bg-primary-600 border-primary-500 text-white rounded-tr-none'
                                              : 'bg-bg-secondary border-border-primary text-text-primary rounded-tl-none'
                                          }`}>
                                            {msg.message}
                                          </div>
                                          <span className="text-[8px] text-text-tertiary self-end">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <div ref={messageEndRef} />
                                </div>
                              )}
                            </div>

                            {/* Typing Indicators & Message Input Form */}
                            <div className="p-3 border-t border-border-primary bg-bg-secondary">
                              {/* Animated Typing indicators */}
                              {activeTypers.length > 0 && (
                                <div className="text-[10px] text-text-tertiary font-semibold pb-1.5 animate-pulse">
                                  ✍️ {activeTypers.join(', ')} is typing...
                                </div>
                              )}
                              
                              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={newMessageText}
                                  onChange={handleMessageChange}
                                  placeholder="Type internal team message..."
                                  className="flex-1 bg-white border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                />
                                <button
                                  type="submit"
                                  className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                </button>
                              </form>
                            </div>
                          </>
                        ) : (
                          <div className="m-auto text-center p-6 text-text-tertiary max-w-xs space-y-2">
                            <svg className="w-10 h-10 mx-auto opacity-40 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <h5 className="font-bold text-sm text-text-secondary">Select Chat Channel</h5>
                            <p className="text-[11px]">Choose a client-specific discussion room from the left index panel to start real-time success chat.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: SECURE STAFF INTERNAL NOTES (Step 5) */}
                  {activeTab === 'notes' && (
                    <div className="space-y-6">
                      {/* Notes Submit Form */}
                      <form onSubmit={handleSaveNote} className="bg-bg-secondary border border-border-primary p-4 rounded-2xl space-y-4 shadow-inner">
                        <div>
                          <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                            Create Secure Private Note
                          </label>
                          <textarea
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            rows={3}
                            placeholder="Add private logs, onboarding obstacles, billing flags or technical metrics..."
                            className="w-full bg-white border border-border-primary rounded-xl px-4 py-2.5 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-secondary">Note Category:</span>
                            <select
                              value={newNoteType}
                              onChange={(e) => setNewNoteType(e.target.value)}
                              className="px-3 py-1.5 bg-white border border-border-primary rounded-xl text-xs font-semibold text-text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                              <option value="general">General Success Note</option>
                              <option value="escalation">Emergency Escalation Remark</option>
                              <option value="billing">Billing Operations Record</option>
                              <option value="technical">Technical Integration Flag</option>
                            </select>
                          </div>
                          <button
                            type="submit"
                            disabled={!newNoteText.trim() || savingNote}
                            className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-primary-500/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {savingNote ? 'Saving Secure Note...' : 'Save Private Annotation'}
                          </button>
                        </div>
                      </form>

                      {/* Notes Log */}
                      <div className="space-y-3">
                        {internalNotes.length === 0 ? (
                          <div className="text-center py-8 text-text-tertiary italic text-xs">
                            No internal notes recorded. Use the form above to add a private note.
                          </div>
                        ) : (
                          internalNotes.map((note) => (
                            <div
                              key={note._id}
                              className={`border rounded-2xl p-4 transition-all bg-white relative overflow-hidden ${
                                note.type === 'escalation' ? 'border-danger-100 bg-danger-50/10' :
                                note.type === 'billing' ? 'border-warning-100 bg-warning-50/10' :
                                note.type === 'technical' ? 'border-primary-100 bg-primary-50/10' :
                                'border-border-primary hover:border-primary-200'
                              }`}
                            >
                              <div className="flex justify-between items-center gap-2 border-b border-border-primary/50 pb-2 mb-2">
                                <div className="flex items-center gap-2">
                                  {note.author?.avatar ? (
                                    <img
                                      src={note.author.avatar}
                                      alt={note.author.fullName}
                                      className="w-5 h-5 rounded-full object-cover border border-border-primary"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-700">
                                      {note.author?.fullName?.charAt(0) || 'S'}
                                    </div>
                                  )}
                                  <span className="text-[10px] font-bold text-text-primary">
                                    {note.author?.fullName || 'Success Agent'} ({note.author?.role || 'Staff'})
                                  </span>
                                  <span className="text-[9px] text-text-tertiary">
                                    &bull; {new Date(note.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase border ${
                                  note.type === 'escalation' ? 'bg-danger-50 border-danger-100 text-danger-700' :
                                  note.type === 'billing' ? 'bg-warning-50 border-warning-100 text-warning-700' :
                                  note.type === 'technical' ? 'bg-primary-50 border-primary-100 text-primary-700' :
                                  'bg-slate-50 border-slate-100 text-slate-700'
                                }`}>
                                  {note.type}
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed text-text-secondary whitespace-pre-line font-medium">
                                {note.note}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULL CALL ANALYSIS DIALOG (MODAL) */}
      {selectedCallDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-border-primary animate-scale-in">
            {/* Header */}
            <div className="p-6 border-b border-border-primary flex items-center justify-between bg-bg-secondary">
              <div>
                <h3 className="text-lg font-bold text-text-primary">AI Telemetric Call Audit</h3>
                <p className="text-xs text-text-tertiary font-semibold mt-0.5">
                  Call Date: {new Date(selectedCallDetails.date).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedCallDetails(null)}
                className="text-text-tertiary hover:text-text-primary p-2 hover:bg-bg-tertiary rounded-xl transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable details contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Top Meta info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-bg-secondary p-3 rounded-xl border border-border-primary text-center">
                  <p className="text-[10px] font-bold text-text-tertiary uppercase">Sentiment</p>
                  <span className="text-xs font-bold text-primary-700 capitalize mt-1 inline-block">
                    {selectedCallDetails.sentiment || 'neutral'}
                  </span>
                </div>
                <div className="bg-bg-secondary p-3 rounded-xl border border-border-primary text-center">
                  <p className="text-[10px] font-bold text-text-tertiary uppercase">Score</p>
                  <span className="text-xs font-bold text-text-primary mt-1 inline-block">
                    ⭐ {selectedCallDetails.satisfactionScore || 5} / 10
                  </span>
                </div>
                <div className="bg-bg-secondary p-3 rounded-xl border border-border-primary text-center">
                  <p className="text-[10px] font-bold text-text-tertiary uppercase">Duration</p>
                  <span className="text-xs font-semibold text-text-primary mt-1 inline-block">
                    ⏱️ {selectedCallDetails.duration} seconds
                  </span>
                </div>
                <div className="bg-bg-secondary p-3 rounded-xl border border-border-primary text-center">
                  <p className="text-[10px] font-bold text-text-tertiary uppercase">Impact</p>
                  <span className="text-xs font-bold text-warning-700 capitalize mt-1 inline-block">
                    {selectedCallDetails.businessImpact || 'Medium'}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-text-secondary uppercase">AI summary analysis</h4>
                <p className="text-xs font-medium text-text-primary leading-relaxed bg-bg-secondary border border-border-primary p-4 rounded-2xl">
                  {selectedCallDetails.summary || 'No summary generated.'}
                </p>
              </div>

              {/* Action items */}
              {selectedCallDetails.actionItems && selectedCallDetails.actionItems.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-text-secondary uppercase">Action Items & Deliverables</h4>
                  <ul className="list-decimal pl-4 text-xs text-text-secondary space-y-1 bg-bg-secondary border border-border-primary p-4 rounded-2xl">
                    {selectedCallDetails.actionItems.map((item, idx) => (
                      <li key={idx} className="font-semibold text-text-primary">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transcript */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-text-secondary uppercase">Conversation Transcript</h4>
                <div className="bg-bg-secondary border border-border-primary p-4 rounded-2xl max-h-48 overflow-y-auto space-y-3 font-mono text-[11px] leading-relaxed">
                  {selectedCallDetails.transcript ? (
                    selectedCallDetails.transcript.split('\n').map((line, idx) => {
                      const isClient = line.startsWith('Client:');
                      return (
                        <p key={idx} className={`${isClient ? 'text-primary-700' : 'text-text-secondary font-semibold'}`}>
                          {line}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-text-tertiary italic">Transcript not recorded or processing.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="p-6 border-t border-border-primary bg-bg-secondary rounded-b-3xl flex justify-end">
              <button
                onClick={() => setSelectedCallDetails(null)}
                className="px-6 py-2.5 bg-white border border-border-primary hover:bg-bg-tertiary text-text-secondary font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
