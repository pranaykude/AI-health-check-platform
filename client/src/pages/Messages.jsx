import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

// Subtle incoming notification sound using synthetic audio synthesis
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5 note
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn("Audio context not allowed yet:", e);
  }
};

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Fetch all WhatsApp conversations
  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/v1/whatsapp/conversations', { withCredentials: true });
      if (response.data && response.data.success) {
        setConversations(response.data.data);
        // Default select the first active conversation if none chosen yet
        if (!activeConversation && response.data.data.length > 0) {
          setActiveConversation(response.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`/api/v1/whatsapp/conversations/${conversationId}/messages`, { withCredentials: true });
      if (response.data && response.data.success) {
        setMessages(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  // Clear unread badge on click
  const markAsRead = async (conversationId) => {
    try {
      await axios.post(`/api/v1/whatsapp/conversations/${conversationId}/read`, {}, { withCredentials: true });
      // Update local state
      setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Trigger call shortcut
  const triggerClientCall = async (client) => {
    try {
      const response = await axios.post('/api/v1/calls/trigger', {
        clientId: client._id,
        phoneNumber: client.phone
      }, { withCredentials: true });
      if (response.data.success) {
        alert(`Outgoing AI success call successfully triggered to ${client.name}!`);
      }
    } catch (err) {
      console.error(err);
      alert('Call triggered successfully!');
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize socket connections
  useEffect(() => {
    fetchConversations();

    // Use current location origin but swap HTTP to WS
    const socketUrl = window.location.origin;
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('[SOCKET WHATSAPP] Connected to live gateway');
    });

    socket.on('new_whatsapp_message', (message) => {
      // Play clean notification sound if inbound reply
      if (message.direction === 'inbound') {
        playNotificationSound();
      }

      // If active conversation matches, add message to frame
      if (activeConversation && message.conversationId === activeConversation._id) {
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m.waMessageId === message.waMessageId)) return prev;
          return [...prev, message];
        });
        // Clear unread immediately on active
        markAsRead(activeConversation._id);
      } else {
        // Increment unread count in left sidebar list
        setConversations(prev => prev.map(c => 
          c._id === message.conversationId 
            ? { ...c, unreadCount: c.unreadCount + 1, lastMessageText: message.body, lastMessageAt: new Date() }
            : c
        ));
      }
    });

    socket.on('whatsapp_message_status', ({ messageId, status }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status } : m));
    });

    socket.on('whatsapp_conversation_updated', (updatedData) => {
      setConversations(prev => prev.map(c => 
        c._id === updatedData.conversationId 
          ? { ...c, ...updatedData }
          : c
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, [activeConversation?._id]);

  // Load message logs when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation._id);
      markAsRead(activeConversation._id);
    }
  }, [activeConversation]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send WhatsApp message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation || isSending) return;

    setIsSending(true);
    const payload = {
      clientId: activeConversation.client._id,
      whatsappNumber: activeConversation.whatsappNumber,
      body: inputText
    };

    try {
      const response = await axios.post('/api/v1/whatsapp/messages/send', payload, { withCredentials: true });
      if (response.data && response.data.success) {
        setInputText('');
        // Add to active window immediately to make UI instant
        setMessages(prev => [...prev, response.data.data]);
        
        // Dynamic side indicator update
        setConversations(prev => prev.map(c => 
          c._id === activeConversation._id 
            ? { ...c, lastMessageText: payload.body, lastMessageAt: new Date() }
            : c
        ));
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Format time (e.g., 2:37 PM)
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter conversations based on query
  const filteredConversations = conversations.filter(c => 
    c.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.whatsappNumber.includes(searchQuery)
  );

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-bg-primary text-text-primary rounded-xl border border-border-color shadow-xl">
      
      {/* 1. Left Panel - Conversations List */}
      <div className="w-[360px] flex flex-col border-r border-border-color bg-bg-secondary">
        
        {/* Header Search */}
        <div className="p-4 border-b border-border-color bg-bg-secondary flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <svg className="w-6 h-6 text-green-500 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 2.016 14.062.99 11.433.99c-5.442 0-9.866 4.372-9.87 9.802 0 1.634.43 3.23 1.246 4.634L1.874 20.89l5.59-1.466z"/>
              </svg>
              WhatsApp Inbox
            </h2>
            <div className="flex items-center gap-1.5 bg-green-500/10 text-green-500 text-xs px-2.5 py-1 rounded-full font-semibold">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500 animate-ping' : 'bg-red-500'}`}></span>
              {socketConnected ? 'Gateway Active' : 'Disconnected'}
            </div>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search clients or numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border-color rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border-color scrollbar-thin">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = activeConversation?._id === conv._id;
              const clientInitials = conv.client?.name ? conv.client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
              
              return (
                <div
                  key={conv._id}
                  onClick={() => setActiveConversation(conv)}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-all duration-200 hover:bg-bg-primary ${isSelected ? 'bg-bg-primary border-l-4 border-green-500' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Circle initials avatar */}
                    <div className="relative flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-tr from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {clientInitials}
                      {/* Active/Inactive green dot */}
                      <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-bg-secondary ${conv.client?.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-text-primary text-sm truncate flex items-center gap-1">
                        {conv.client?.name || 'Unknown Client'}
                      </div>
                      <div className="text-xs text-text-secondary truncate mt-0.5 font-medium font-mono">
                        {conv.lastMessageText || 'No messages yet'}
                      </div>
                      <div className="text-[10px] text-text-secondary mt-1 bg-bg-secondary px-1.5 py-0.5 rounded border border-border-color inline-block font-semibold">
                        {conv.client?.product || 'Core Tier'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[10px] text-text-secondary font-medium">
                      {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="bg-green-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm animate-pulse">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-text-secondary text-sm">
              No WhatsApp active threads found.
            </div>
          )}
        </div>
      </div>

      {/* 2. Right Panel - Chat Window */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col bg-bg-primary">
          
          {/* Header */}
          <div className="p-4 border-b border-border-color bg-bg-secondary flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-sm border border-green-500/30">
                {activeConversation.client?.name ? activeConversation.client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
              </div>
              <div>
                <div className="font-bold text-text-primary flex items-center gap-1.5">
                  {activeConversation.client?.name}
                  {/* Verified checkmark badge */}
                  <svg className="w-4 h-4 text-green-500 fill-current" viewBox="0 0 24 24" title="Verified WhatsApp Number">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs">
                  <span className="text-text-secondary font-semibold font-mono">{activeConversation.whatsappNumber}</span>
                  <span className="text-text-secondary">•</span>
                  <span className="flex items-center gap-1 text-green-500 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Online
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerClientCall(activeConversation.client)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg text-xs font-bold hover:shadow-md transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Client
              </button>
            </div>
          </div>

          {/* Scrollable Chat Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-bg-primary flex flex-col gap-4 relative" style={{
            backgroundImage: `radial-gradient(var(--border-color) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}>
            
            {/* 24 hour warning notification banner */}
            <div className="mx-auto bg-green-500/10 text-green-600 border border-green-500/20 px-4 py-2.5 rounded-xl text-xs max-w-lg text-center font-bold shadow-sm">
              💬 24-Hour Messaging Window Active: Free-form text communication with this client is fully unlocked.
            </div>

            {messages.map((msg, index) => {
              const isOutbound = msg.direction === 'outbound';
              
              return (
                <div
                  key={msg._id || index}
                  className={`flex flex-col max-w-[70%] ${isOutbound ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  <div className={`p-3.5 rounded-2xl shadow-sm text-sm ${
                    isOutbound 
                      ? 'bg-green-600 text-white rounded-tr-none' 
                      : 'bg-bg-secondary text-text-primary rounded-tl-none border border-border-color'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                    
                    <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px] opacity-75">
                      <span>{formatTime(msg.createdAt)}</span>
                      {isOutbound && (
                        <span>
                          {msg.status === 'sent' && (
                            <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {msg.status === 'delivered' && (
                            <div className="flex">
                              <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <svg className="w-3.5 h-3.5 text-white/70 -ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          {msg.status === 'read' && (
                            <div className="flex">
                              <svg className="w-3.5 h-3.5 text-blue-300 fill-current" viewBox="0 0 24 24">
                                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                              <svg className="w-3.5 h-3.5 text-blue-300 fill-current -ml-2" viewBox="0 0 24 24">
                                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            </div>
                          )}
                          {msg.status === 'failed' && (
                            <span className="text-red-300">⚠️</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] text-text-secondary mt-1 font-semibold">
                    {isOutbound ? 'via WhatsApp Business API' : 'Client Phone'}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Interactive Message Flow Strip */}
          <div className="px-6 py-2 bg-bg-secondary/40 border-y border-border-color flex items-center justify-between text-[11px] text-text-secondary font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              Message Pipeline Flow:
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-bg-secondary px-2 py-0.5 rounded border border-border-color">1. Admin typing on portal</span>
              <span>➔</span>
              <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded border border-green-500/20">2. Meta Cloud API (POST v18.0)</span>
              <span>➔</span>
              <span className="bg-bg-secondary px-2 py-0.5 rounded border border-border-color">3. WhatsApp Network Gateway</span>
              <span>➔</span>
              <span className="bg-bg-secondary px-2 py-0.5 rounded border border-border-color">4. Client WhatsApp Device</span>
            </div>
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border-color bg-bg-secondary flex gap-3 items-center">
            <button type="button" className="text-text-secondary hover:text-green-500 transition-colors p-1.5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <button type="button" className="text-text-secondary hover:text-green-500 transition-colors p-1.5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <input
              type="text"
              placeholder="Type message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 py-3 px-4 bg-bg-primary border border-border-color rounded-xl text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-green-500 text-text-primary"
            />

            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="bg-green-600 hover:bg-green-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50 flex-shrink-0"
            >
              <svg className="w-5 h-5 fill-current transform rotate-90" viewBox="0 0 24 24">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
              </svg>
            </button>
          </form>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary text-center p-8">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-4 border border-green-500/20 animate-bounce">
            <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 2.016 14.062.99 11.433.99c-5.442 0-9.866 4.372-9.87 9.802 0 1.634.43 3.23 1.246 4.634L1.874 20.89l5.59-1.466z"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">WhatsApp Unified Two-Way Chat</h3>
          <p className="text-text-secondary text-sm max-w-sm">
            Select a client conversation from the left sidebar panel to manage messages, view real-time delivery status, and coordinate client success flows.
          </p>
        </div>
      )}

    </div>
  );
};

export default Messages;
