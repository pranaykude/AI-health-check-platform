import { useState, useRef, useEffect } from 'react';
import templates from '../config/emailTemplates.json';
import { sendRealEmail } from '../api/emailApi';

export default function Emails() {
  // Folder/View State Management
  const [activeView, setActiveView] = useState('templates');
  const [threeDotOpen, setThreeDotOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFolderType, setSearchFolderType] = useState('unread'); // unread, attachments, large

  // Folder data arrays (Empty by default for real-time usage)
  const [inbox, setInbox] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [deletedItems, setDeletedItems] = useState([]);
  const [sentItems, setSentItems] = useState([]);
  const [archive, setArchive] = useState([]);
  const [junkEmail, setJunkEmail] = useState([]);
  const [notes, setNotes] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);

  // Core Compose and Rich-Text Editor states
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('cs-team@orai-robotics.com');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [currentEditingDraftId, setCurrentEditingDraftId] = useState(null);

  // Selected Email state for folder reading panes
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const noteEditorRef = useRef(null);
  const noteFileInputRef = useRef(null);

  // Custom toolbar states
  const [fontFamily, setFontFamily] = useState('Segoe UI');
  const [fontSize, setFontSize] = useState('11');
  const [attachments, setAttachments] = useState([]);
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    insertUnorderedList: false,
    insertOrderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
  });

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync templates/drafts to rich-text editor on open
  useEffect(() => {
    if (composeOpen && editorRef.current) {
      const htmlContent = composeBody
        ? composeBody.replace(/\n/g, '<br />')
        : '';

      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }

      editorRef.current.focus();
      checkActiveStyles();
    }
  }, [composeOpen, composeBody]);

  // Select first email when changing views
  useEffect(() => {
    const list = getItemsForView(activeView);
    if (list && list.length > 0) {
      setSelectedEmail(list[0]);
    } else {
      setSelectedEmail(null);
    }
    setComposeOpen(false);
  }, [activeView, searchFolderType]);

  // Sync note editor content when switching notes
  useEffect(() => {
    if (activeView === 'notes' && noteEditorRef.current) {
      const activeNote = notes.find(n => n.id === activeNoteId);
      const currentHtml = activeNote ? activeNote.content : '';
      if (noteEditorRef.current.innerHTML !== currentHtml) {
        noteEditorRef.current.innerHTML = currentHtml || '';
      }
    }
  }, [activeNoteId, activeView]);

  // Sync active states on cursor/selection movement
  const checkActiveStyles = () => {
    if (typeof document !== 'undefined') {
      setActiveStyles({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
      });
    }
  };

  const runCommand = (command, value = null, targetRef = editorRef) => {
    if (targetRef.current) {
      targetRef.current.focus();
      document.execCommand(command, false, value);
    }
  };

  const handleNoteImageUpload = (e, noteId) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target.result;
        if (noteEditorRef.current) {
          noteEditorRef.current.focus();
          document.execCommand('insertImage', false, base64Url);
          // Manually update state since onInput might not trigger from execCommand
          setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: noteEditorRef.current.innerHTML, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) } : n));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const mapFontSize = (size) => {
    switch (size) {
      case '9': return '1';
      case '10': return '2';
      case '11': return '3';
      case '12': return '4';
      case '14': return '5';
      default: return '3';
    }
  };

  const handleFontFamilyChange = (font) => {
    setFontFamily(font);
    runCommand('fontName', font);
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    runCommand('fontSize', mapFontSize(size));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map((file) => ({
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      rawFile: file,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    showToast(`Attached ${files.length} file(s)`);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInsertLink = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    let selectedText = selection.toString().trim();

    const url = prompt("Enter the link URL:", "https://");
    if (!url) return;

    let cleanUrl = url;
    if (!/^https?:\/\//i.test(cleanUrl) && !/^mailto:/i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    if (!selectedText) {
      const displayText = prompt("Enter the display text:", url);
      if (displayText) {
        const anchorHtml = `<a href="${cleanUrl}" target="_blank" style="color: #6B5CF6; text-decoration: underline;">${displayText}</a>`;
        document.execCommand('insertHTML', false, anchorHtml);
      }
    } else {
      document.execCommand('createLink', false, cleanUrl);
    }
  };

  const getPlainTextFromHtml = (html) => {
    if (!html) return '';
    let text = html;

    text = text.replace(/<div[^>]*>/gi, '');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<p[^>]*>/gi, '');
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');

    text = text.replace(/<li[^>]*>/gi, '• ');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<ul[^>]*>/gi, '');
    text = text.replace(/<\/ul>/gi, '\n');
    text = text.replace(/<ol[^>]*>/gi, '');
    text = text.replace(/<\/ol>/gi, '\n');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    text = tempDiv.textContent || tempDiv.innerText || '';

    return text.trim();
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleTabClick = (index) => {
    setActiveTemplate(index);
    setComposeOpen(false);
  };

  const openCompose = (prefill = true) => {
    if (prefill) {
      const t = templates[activeTemplate];
      setComposeSubject(t.subject);
      setComposeBody(t.body);
      setComposeTo('');
    } else {
      setComposeSubject('');
      setComposeBody('');
      setComposeTo('');
    }
    setCurrentEditingDraftId(null);
    setComposeOpen(true);
    setAttachments([]);
  };

  const handleCopyBody = () => {
    const t = templates[activeTemplate];
    navigator.clipboard.writeText(t.body);
    showToast('Email body copied to clipboard!');
  };

  // Outlook Actions Folder logic
  const getItemsForView = (view) => {
    let list = [];
    switch (view) {
      case 'inbox':
        list = inbox;
        break;
      case 'drafts':
        list = drafts;
        break;
      case 'deleted':
        list = deletedItems;
        break;
      case 'sent':
        list = sentItems;
        break;
      case 'archive':
        list = archive;
        break;
      case 'junk':
        list = junkEmail;
        break;
      case 'outbox':
        list = outbox;
        break;
      case 'search':
        if (searchFolderType === 'unread') {
          list = inbox.filter(e => e.unread);
        } else if (searchFolderType === 'attachments') {
          list = [...inbox, ...sentItems].filter(e => e.attachments && e.attachments.length > 0);
        } else if (searchFolderType === 'large') {
          list = [...inbox, ...sentItems].filter(e => {
            if (!e.attachments || e.attachments.length === 0) return false;
            return e.attachments.some(a => a.size.includes('MB') && parseFloat(a.size) >= 1.0);
          });
        }
        break;
      default:
        list = [];
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => {
        const fromMatch = item.from ? item.from.toLowerCase().includes(q) : false;
        const fromNameMatch = item.fromName ? item.fromName.toLowerCase().includes(q) : false;
        const toMatch = item.to ? item.to.toLowerCase().includes(q) : false;
        const subjectMatch = item.subject ? item.subject.toLowerCase().includes(q) : false;
        const bodyMatch = item.body ? item.body.toLowerCase().includes(q) : false;
        return fromMatch || fromNameMatch || toMatch || subjectMatch || bodyMatch;
      });
    }

    return list;
  };

  const getFolderCount = (folderId) => {
    switch (folderId) {
      case 'inbox':
        return inbox.filter(e => e.unread).length;
      case 'drafts':
        return drafts.length;
      case 'deleted':
        return deletedItems.length;
      case 'sent':
        return sentItems.length;
      case 'archive':
        return archive.length;
      case 'junk':
        return junkEmail.filter(e => e.unread).length;
      case 'notes':
        return notes.length;
      case 'outbox':
        return outbox.length;
      default:
        return null;
    }
  };

  const handleSelectEmail = (email) => {
    setSelectedEmail(email);
    setComposeOpen(false);
    
    // Mark as read if clicked
    if (activeView === 'inbox' && email.unread) {
      setInbox(prev => prev.map(e => e.id === email.id ? { ...e, unread: false } : e));
    } else if (activeView === 'junk' && email.unread) {
      setJunkEmail(prev => prev.map(e => e.id === email.id ? { ...e, unread: false } : e));
    }
  };

  const handleReply = (email) => {
    setComposeTo(email.from || '');
    setComposeCc('cs-team@orai-robotics.com');
    setComposeSubject(`Re: ${email.subject}`);
    
    const cleanBody = email.body || '';
    const quoteBody = `<br /><br />-----Original Message-----<br /><b>From:</b> ${email.fromName || email.from}<br /><b>Sent:</b> ${email.date}<br /><b>To:</b> Pranay.k@orai-robotics.com<br /><b>Subject:</b> ${email.subject}<br /><br />${cleanBody.replace(/\n/g, '<br />')}`;
    
    setComposeBody(quoteBody);
    setCurrentEditingDraftId(null);
    setComposeOpen(true);
    setAttachments([]);
  };

  const handleEditDraft = (draftItem) => {
    setComposeTo(draftItem.to || '');
    setComposeCc(draftItem.cc || 'cs-team@orai-robotics.com');
    setComposeSubject(draftItem.subject || '');
    setComposeBody(draftItem.body || '');
    setAttachments(draftItem.attachments || []);
    setCurrentEditingDraftId(draftItem.id);
    setComposeOpen(true);
  };

  const handleDeleteItem = (item, sourceView) => {
    const deletedItem = {
      ...item,
      id: `deleted-${Date.now()}`,
      originalFolder: sourceView,
      deletedAt: new Date().toLocaleString()
    };
    
    setDeletedItems(prev => [deletedItem, ...prev]);

    if (sourceView === 'inbox') setInbox(prev => prev.filter(e => e.id !== item.id));
    else if (sourceView === 'drafts') setDrafts(prev => prev.filter(e => e.id !== item.id));
    else if (sourceView === 'sent') setSentItems(prev => prev.filter(e => e.id !== item.id));
    else if (sourceView === 'archive') setArchive(prev => prev.filter(e => e.id !== item.id));
    else if (sourceView === 'junk') setJunkEmail(prev => prev.filter(e => e.id !== item.id));
    else if (sourceView === 'outbox') setOutbox(prev => prev.filter(e => e.id !== item.id));
    else if (sourceView === 'search') {
      setInbox(prev => prev.filter(e => e.id !== item.id));
      setSentItems(prev => prev.filter(e => e.id !== item.id));
    }

    setSelectedEmail(null);
    showToast('Message moved to Deleted Items');
  };

  const handleRestoreItem = (item) => {
    const { originalFolder, deletedAt, ...rest } = item;
    const restoredItem = {
      ...rest,
      id: `restored-${Date.now()}`
    };

    if (originalFolder === 'inbox') setInbox(prev => [restoredItem, ...prev]);
    else if (originalFolder === 'drafts') setDrafts(prev => [restoredItem, ...prev]);
    else if (originalFolder === 'sent') setSentItems(prev => [restoredItem, ...prev]);
    else if (originalFolder === 'archive') setArchive(prev => [restoredItem, ...prev]);
    else if (originalFolder === 'junk') setJunkEmail(prev => [restoredItem, ...prev]);
    else if (originalFolder === 'outbox') setOutbox(prev => [restoredItem, ...prev]);
    else setInbox(prev => [restoredItem, ...prev]);

    setDeletedItems(prev => prev.filter(e => e.id !== item.id));
    setSelectedEmail(null);
    showToast(`Message restored to ${originalFolder || 'Inbox'}`);
  };

  const handlePermanentlyDeleteItem = (item) => {
    if (window.confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
      setDeletedItems(prev => prev.filter(e => e.id !== item.id));
      setSelectedEmail(null);
      showToast('Message permanently deleted');
    }
  };

  const handleArchiveItem = (item, sourceView) => {
    setArchive(prev => [item, ...prev]);
    
    if (sourceView === 'inbox') setInbox(prev => prev.filter(e => e.id !== item.id));
    else if (sourceView === 'junk') setJunkEmail(prev => prev.filter(e => e.id !== item.id));
    
    setSelectedEmail(null);
    showToast('Message archived');
  };

  const handleUnarchiveItem = (item) => {
    setInbox(prev => [item, ...prev]);
    setArchive(prev => prev.filter(e => e.id !== item.id));
    setSelectedEmail(null);
    showToast('Message returned to Inbox');
  };

  const handleMarkNotJunk = (item) => {
    setInbox(prev => [{ ...item, unread: false }, ...prev]);
    setJunkEmail(prev => prev.filter(e => e.id !== item.id));
    setSelectedEmail(null);
    showToast('Message marked as not junk and moved to Inbox');
  };

  const handleSendOutbox = (item) => {
    const sentItem = {
      ...item,
      id: `sent-${Date.now()}`,
      date: new Date().toLocaleString()
    };
    setSentItems(prev => [sentItem, ...prev]);
    setOutbox(prev => prev.filter(e => e.id !== item.id));
    setSelectedEmail(null);
    showToast('Outbox queue processed. Message dispatched successfully!');
  };

  const handleEmptyDeleted = () => {
    if (window.confirm('Are you sure you want to delete all items in Deleted Items permanently?')) {
      setDeletedItems([]);
      setSelectedEmail(null);
      showToast('Deleted Items folder emptied');
    }
  };

  const handleSaveDraft = () => {
    const bodyHtml = editorRef.current ? editorRef.current.innerHTML : composeBody;
    
    const draftItem = {
      id: currentEditingDraftId || `draft-${Date.now()}`,
      to: composeTo,
      cc: composeCc,
      subject: composeSubject || '(No Subject)',
      body: bodyHtml,
      date: 'Just now',
      attachments: [...attachments]
    };

    if (currentEditingDraftId) {
      setDrafts(prev => prev.map(d => d.id === currentEditingDraftId ? draftItem : d));
      showToast('Draft updated successfully');
    } else {
      setDrafts(prev => [draftItem, ...prev]);
      showToast('Saved to Drafts');
    }
    
    setComposeOpen(false);
    setCurrentEditingDraftId(null);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!composeTo.trim()) {
      showToast('Please specify a recipient in the "To" field.');
      return;
    }

    const bodyHtml = editorRef.current ? editorRef.current.innerHTML : composeBody;
    
    showToast('Sending email...');

    try {
      await sendRealEmail({
        to: composeTo,
        cc: composeCc,
        subject: composeSubject || '(No Subject)',
        bodyHtml: bodyHtml,
        attachments: attachments
      });

      // Save copy to Sent Items
      const sentItem = {
        id: `sent-${Date.now()}`,
        to: composeTo,
        subject: composeSubject || '(No Subject)',
        body: bodyHtml,
        date: new Date().toLocaleString(),
        attachments: [...attachments]
      };
      setSentItems(prev => [sentItem, ...prev]);

      // If we were editing a draft, remove it from drafts!
      if (currentEditingDraftId) {
        setDrafts(prev => prev.filter(d => d.id !== currentEditingDraftId));
        setCurrentEditingDraftId(null);
      }

      showToast('Email sent successfully!');
      
      // Reset compose state
      setComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setAttachments([]);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to send email. Check your RESEND_API_KEY.');
    }
  };

  // Sticky Notes logic
  const noteColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa']; // Yellow, Green, Blue, Pink, Orange
  
  const handleAddNote = () => {
    const newNote = {
      id: `note-${Date.now()}`,
      content: '',
      color: noteColors[Math.floor(Math.random() * noteColors.length)],
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setNotes(prev => [newNote, ...prev]);
    showToast('New sticky note created!');
  };

  const handleUpdateNote = (id, newContent) => {
    setNotes(prev => prev.map(n => n.id === id ? {
      ...n,
      content: newContent,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } : n));
  };

  const handleDeleteNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    showToast('Note deleted');
  };

  // SVG Icon Renderers
  const renderIcon = (iconName) => {
    const commonProps = "w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110 flex-shrink-0";
    switch (iconName) {
      case 'onboarding':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      case 'closure':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'payment':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'updates':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        );
      case 'ticket':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        );
      case 'proposal':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'meeting':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'newsletter':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderFolderIcon = (iconName, active = false) => {
    const commonProps = `w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-[#6B5CF6]' : 'text-text-secondary dark:text-slate-400'}`;
    switch (iconName) {
      case 'templates':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'inbox':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0L12 17l-8-4" />
          </svg>
        );
      case 'drafts':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        );
      case 'deleted':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case 'sent':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'archive':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      case 'history':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'junk':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
      case 'notes':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'outbox':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
          </svg>
        );
      case 'search':
        return (
          <svg className={commonProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderTextWithPills = (text) => {
    if (!text) return null;
    const parts = text.split(/(\[[^\]]+\])/);
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return (
          <span
            key={i}
            className="inline-block px-1.5 py-0.5 mx-0.5 rounded text-[10px] font-bold uppercase tracking-wider select-none bg-[var(--color-background-info)] text-[var(--color-text-info)] border border-[var(--color-border-primary)]"
          >
            {part}
          </span>
        );
      }
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  // View titles & subtitles
  const getTitleForView = (view) => {
    switch (view) {
      case 'templates': return 'ORAI Email Templates';
      case 'inbox': return 'ORAI Mail - Inbox';
      case 'drafts': return 'ORAI Mail - Drafts';
      case 'deleted': return 'ORAI Mail - Deleted Items';
      case 'sent': return 'ORAI Mail - Sent Items';
      case 'archive': return 'ORAI Mail - Archive';
      case 'history': return 'ORAI Mail - Conversation History';
      case 'junk': return 'ORAI Mail - Junk Email';
      case 'notes': return 'ORAI Mail - Notes';
      case 'outbox': return 'ORAI Mail - Outbox';
      case 'search': return 'ORAI Mail - Search Folders';
      default: return 'ORAI Email';
    }
  };

  const getSubtitleForView = (view) => {
    switch (view) {
      case 'templates': return 'Pre-built email templates for client communication';
      case 'inbox': return 'View and manage incoming customer emails';
      case 'drafts': return 'Continue writing or review your saved email drafts';
      case 'deleted': return 'Manage recently deleted messages and templates';
      case 'sent': return 'Review communications sent out from this platform';
      case 'archive': return 'Access your archived historical communications';
      case 'history': return 'Full customer interaction and outbound call activity logs';
      case 'junk': return 'Simulated junk filter and spam prevention audit';
      case 'notes': return 'Outlook-style interactive yellow sticky notes notepad';
      case 'outbox': return 'Queued and pending scheduled email dispatches';
      case 'search': return 'Dynamic smart filters and custom search queries';
      default: return 'Customer Success outreach panel';
    }
  };

  // Folder List Configuration
  const foldersList = [
    { id: 'templates', label: 'Templates', icon: 'templates' },
    { id: 'inbox', label: 'Inbox', icon: 'inbox' },
    { id: 'drafts', label: 'Drafts', icon: 'drafts' },
    { id: 'deleted', label: 'Deleted Items', icon: 'deleted' },
    { id: 'sent', label: 'Sent Items', icon: 'sent' },
    { id: 'archive', label: 'Archive', icon: 'archive' },
    { id: 'history', label: 'Conversation History', icon: 'history' },
    { id: 'junk', label: 'Junk Email', icon: 'junk' },
    { id: 'notes', label: 'Notes', icon: 'notes' },
    { id: 'outbox', label: 'Outbox', icon: 'outbox' },
    { id: 'search', label: 'Search Folders', icon: 'search' },
  ];

  const activeT = templates[activeTemplate];
  const activeListItems = getItemsForView(activeView);

  return (
    <div className="flex flex-col h-full animate-fade-in bg-bg-primary overflow-hidden">
      
      {/* Topbar containing dynamic header and Three-Dot dropdown */}
      <div className="px-8 py-5 border-b border-border-primary flex-shrink-0 flex items-center justify-between relative bg-bg-primary select-none">
        <div className="flex items-center gap-4">
          {activeView !== 'templates' && (
            <button
              onClick={() => setActiveView('templates')}
              className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
              title="Back to Templates"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-[18px] font-semibold text-text-primary tracking-tight flex items-center gap-2">
              <span>{getTitleForView(activeView)}</span>
              {activeView !== 'templates' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#6B5CF6]/10 text-[#6B5CF6]">
                  Outlook View
                </span>
              )}
            </h1>
            <p className="text-xs text-text-tertiary mt-1">{getSubtitleForView(activeView)}</p>
          </div>
        </div>

        {/* Three-Dot trigger */}
        <div className="relative">
          <button
            onClick={() => setThreeDotOpen(!threeDotOpen)}
            className={`p-2 hover:bg-bg-tertiary rounded-lg text-text-secondary hover:text-text-primary cursor-pointer transition-all border flex items-center justify-center gap-2 select-none h-10 ${
              threeDotOpen ? 'bg-bg-tertiary border-border-primary ring-2 ring-[#6B5CF6]/20' : 'border-border-secondary'
            }`}
            title="Outlook Folders"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            <span className="text-xs font-semibold pr-1">Outlook Folders</span>
          </button>

          {/* Premium Dropdown list matching Pranay.k@orai-robotics.com */}
          {threeDotOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setThreeDotOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-bg-secondary border border-border-secondary rounded-xl shadow-xl z-50 overflow-hidden animate-scale-in py-2">
                <div className="px-4 py-2.5 border-b border-border-primary flex items-center gap-2 select-none bg-bg-secondary dark:bg-bg-tertiary/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></div>
                  <span className="text-[11px] font-bold text-text-primary truncate font-sans">
                    Pranay.k@orai-robotics.com
                  </span>
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Active
                  </span>
                </div>

                <div className="max-h-96 overflow-y-auto py-1 font-sans">
                  {foldersList.map((folder) => {
                    const isActive = activeView === folder.id;
                    const folderCount = getFolderCount(folder.id);

                    return (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setActiveView(folder.id);
                          setThreeDotOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#6B5CF6]/10 text-[#6B5CF6] font-semibold'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      >
                        {renderFolderIcon(folder.id, isActive)}
                        <span className="truncate flex-1">{folder.label}</span>
                        {folderCount !== null && folderCount > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isActive
                              ? 'bg-[#6B5CF6]/20 text-[#6B5CF6]'
                              : 'bg-bg-tertiary text-text-tertiary'
                          }`}>
                            {folderCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Area depending on activeView */}
      {activeView === 'templates' ? (
        
        /* Default Templates View */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          
          {/* Left Column: Template Navigation List */}
          <aside className="flex flex-row overflow-x-auto w-full border-b border-border-primary lg:flex-col lg:w-60 lg:border-b-0 lg:border-r xl:w-64 bg-bg-secondary p-3 lg:p-4 gap-2 flex-shrink-0 transition-all duration-300">
            <div className="hidden lg:block text-[10px] font-black tracking-widest text-text-tertiary uppercase mb-2 px-2 text-left select-none">
              Templates
            </div>
            <div className="flex flex-row lg:flex-col gap-1.5 w-full">
              {templates.map((t, idx) => {
                const isActive = activeTemplate === idx;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTabClick(idx)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group w-auto lg:w-full select-none cursor-pointer ${isActive
                        ? 'bg-[var(--color-background-info)] text-[var(--color-text-info)] font-semibold'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                      }`}
                    title={t.label}
                  >
                    {renderIcon(t.icon)}
                    <span className="truncate flex-1 text-left">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Column: Active Template Preview or Compose Panel */}
          <section className="flex-1 flex flex-col overflow-hidden relative bg-bg-primary">
            {composeOpen ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-[#f3f3f3] dark:bg-bg-tertiary animate-fade-in">
                <style>{`
                  .outlook-editor[contenteditable]:empty::before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                    pointer-events: none;
                    display: block;
                  }
                  .dark .outlook-editor[contenteditable]:empty::before {
                    color: #64748b;
                  }
                `}</style>

                {/* Toolbar */}
                <div className="px-4 py-1.5 bg-[#fafafa] dark:bg-bg-primary border-b border-border-primary flex flex-wrap items-center gap-1 select-none flex-shrink-0">
                  <div className="flex items-center mr-2 pr-2 border-r border-border-primary gap-0.5">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => runCommand('undo')}
                      className="p-1 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                      title="Undo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => runCommand('redo')}
                      className="p-1 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                      title="Redo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m8-8l-6 6m6-6l-6-6" />
                      </svg>
                    </button>
                  </div>

                  <div className="relative mr-1">
                    <select
                      value={fontFamily}
                      onChange={(e) => handleFontFamilyChange(e.target.value)}
                      className="appearance-none bg-bg-secondary text-text-primary text-[11px] border border-border-secondary rounded px-2.5 py-1 pr-6 cursor-pointer font-medium select-none focus:outline-none"
                    >
                      <option value="Segoe UI">Segoe UI</option>
                      <option value="Calibri">Calibri</option>
                      <option value="Arial">Arial</option>
                    </select>
                    <span className="absolute right-1.5 top-2.5 pointer-events-none text-text-tertiary">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>

                  <div className="relative mr-2 pr-2 border-r border-border-primary">
                    <select
                      value={fontSize}
                      onChange={(e) => handleFontSizeChange(e.target.value)}
                      className="appearance-none bg-bg-secondary text-text-primary text-[11px] border border-border-secondary rounded px-2 py-1 pr-5 cursor-pointer font-medium select-none focus:outline-none"
                    >
                      <option value="9">9</option>
                      <option value="10">10</option>
                      <option value="11">11</option>
                      <option value="12">12</option>
                      <option value="14">14</option>
                    </select>
                    <span className="absolute right-3.5 top-2.5 pointer-events-none text-text-tertiary">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 mr-2 pr-2 border-r border-border-primary">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('bold'); checkActiveStyles(); }}
                      className={`p-1 rounded font-bold text-xs px-2 cursor-pointer transition-colors ${activeStyles.bold ? 'bg-[#6B5CF6]/15 text-[#6B5CF6] font-extrabold' : 'text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('italic'); checkActiveStyles(); }}
                      className={`p-1 rounded italic text-xs px-2 cursor-pointer transition-colors ${activeStyles.italic ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('underline'); checkActiveStyles(); }}
                      className={`p-1 rounded underline text-xs px-2 cursor-pointer transition-colors ${activeStyles.underline ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Underline"
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('strikeThrough'); checkActiveStyles(); }}
                      className={`p-1 rounded line-through text-xs px-1.5 cursor-pointer transition-colors ${activeStyles.strikeThrough ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:bg-bg-tertiary'
                        }`}
                      title="Strikethrough"
                    >
                      ab
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5 mr-2 pr-2 border-r border-border-primary">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('insertUnorderedList'); checkActiveStyles(); }}
                      className={`p-1 rounded cursor-pointer transition-colors ${activeStyles.insertUnorderedList ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Bullet List"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('insertOrderedList'); checkActiveStyles(); }}
                      className={`p-1 rounded cursor-pointer transition-colors ${activeStyles.insertOrderedList ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Numbered List"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h14M7 12h14M7 18h14M3 5v3h2m-2 4h3m-3 4h3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('justifyLeft'); checkActiveStyles(); }}
                      className={`p-1 rounded cursor-pointer transition-colors ${activeStyles.justifyLeft ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Align Left"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('justifyCenter'); checkActiveStyles(); }}
                      className={`p-1 rounded cursor-pointer transition-colors ${activeStyles.justifyCenter ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Align Center"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h14M4 18h10" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('justifyRight'); checkActiveStyles(); }}
                      className={`p-1 rounded cursor-pointer transition-colors ${activeStyles.justifyRight ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Align Right"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      className="p-1.5 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1 text-[11px] font-semibold transition-colors"
                      title="Attach file"
                    >
                      <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span>Attach</span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleInsertLink}
                      className="p-1.5 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1 text-[11px] font-semibold transition-colors"
                      title="Link"
                    >
                      <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span>Link</span>
                    </button>
                  </div>
                </div>

                {/* Form Pane */}
                <form onSubmit={handleSendEmail} className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-bg-secondary p-5">
                  <div className="flex items-center justify-between border-b border-border-primary pb-3 mb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-[#0078d4] hover:bg-[#005a9e] text-white rounded-md transition-all shadow-sm flex-shrink-0 select-none">
                        <button
                          type="submit"
                          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 hover:bg-black/10 rounded-l-md border-r border-white/20 transition-all cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span>Send</span>
                        </button>
                        <button
                          type="button"
                          className="px-2 py-2 hover:bg-black/10 rounded-r-md transition-all cursor-pointer h-full flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Save Draft Button inside Compose toolbar */}
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md border border-border-secondary transition-all cursor-pointer select-none font-semibold"
                        title="Save Draft"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        <span>Save Draft</span>
                      </button>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-bg-tertiary cursor-pointer transition-colors select-none text-xs font-medium text-text-secondary">
                        <span>From:</span>
                        <span className="font-semibold text-text-primary">Pranay.k@orai-robotics.com</span>
                        <svg className="w-3 h-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setComposeOpen(false);
                          setComposeTo('');
                          setComposeSubject('');
                          setComposeBody('');
                          setAttachments([]);
                          setCurrentEditingDraftId(null);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-tertiary hover:text-red-500 hover:bg-bg-secondary rounded border border-border-secondary hover:border-red-200 transition-all cursor-pointer"
                        title="Discard"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline font-semibold">Discard</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden border border-border-primary rounded-lg bg-white dark:bg-bg-primary shadow-inner">
                    <div className="px-4 py-2 space-y-0.5 bg-bg-tertiary/20 text-xs flex-shrink-0 border-b border-border-primary">
                      <div className="flex items-center py-2 border-b border-border-primary/50">
                        <button
                          type="button"
                          className="w-10 text-[11px] font-bold text-text-secondary bg-bg-secondary hover:bg-bg-tertiary border border-border-secondary rounded-md py-0.5 px-1 mr-2 select-none"
                        >
                          To
                        </button>
                        <input
                          type="email"
                          value={composeTo}
                          onChange={(e) => setComposeTo(e.target.value)}
                          placeholder="recipient@example.com"
                          className="flex-1 bg-transparent border-0 outline-none text-text-primary px-1 text-xs py-0.5 focus:ring-0 focus:outline-none"
                          required
                        />
                        <span className="text-[10px] text-text-tertiary select-none pr-1">Bcc</span>
                      </div>

                      <div className="flex items-center py-2 border-b border-border-primary/50">
                        <button
                          type="button"
                          className="w-10 text-[11px] font-bold text-text-secondary bg-bg-secondary hover:bg-bg-tertiary border border-border-secondary rounded-md py-0.5 px-1 mr-2 select-none"
                        >
                          Cc
                        </button>
                        <input
                          type="text"
                          value={composeCc}
                          onChange={(e) => setComposeCc(e.target.value)}
                          placeholder="cs-team@orai-robotics.com"
                          className="flex-1 bg-transparent border-0 outline-none text-text-primary px-1 text-xs py-0.5 focus:ring-0 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center py-2 border-b border-border-primary/50">
                        <input
                          type="text"
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          placeholder="Add a subject"
                          className="w-full bg-transparent border-0 outline-none text-text-primary font-semibold text-xs py-0.5 focus:ring-0 focus:outline-none placeholder-text-tertiary"
                          required
                        />
                      </div>

                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 py-2 select-none">
                          {attachments.map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-bg-secondary border border-border-secondary rounded-lg px-2.5 py-1 text-xs text-text-primary shadow-sm hover:bg-bg-tertiary transition-all"
                            >
                              <svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <div className="flex flex-col">
                                <span className="font-semibold truncate max-w-[150px]">{file.name}</span>
                                <span className="text-[9px] text-text-tertiary leading-none">{file.size}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttachment(idx)}
                                className="ml-1 text-text-tertiary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-0.5 rounded-full transition-all cursor-pointer"
                                title="Remove attachment"
                              >
                                <svg className="w-3.5 h-3.5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 p-5 bg-white dark:bg-bg-primary overflow-y-auto min-h-[200px]">
                      <div
                        ref={editorRef}
                        contentEditable
                        onKeyUp={checkActiveStyles}
                        onMouseUp={checkActiveStyles}
                        onInput={() => {
                          if (editorRef.current) {
                            setComposeBody(editorRef.current.innerHTML);
                          }
                          checkActiveStyles();
                        }}
                        className="outlook-editor w-full h-full bg-transparent border-0 outline-none text-text-primary leading-relaxed text-sm focus:ring-0 focus:outline-none overflow-y-auto min-h-[250px]"
                        style={{
                          fontFamily: fontFamily,
                          fontSize: fontSize === '11' ? '14px' : fontSize === '9' ? '12px' : fontSize === '10' ? '13px' : fontSize === '12' ? '16px' : fontSize === '14' ? '18px' : '14px'
                        }}
                        data-placeholder="Type your email content here..."
                      />
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {/* Preview Toolbar */}
                <div className="h-[42px] border-b border-border-primary px-5 flex items-center justify-between flex-shrink-0 bg-bg-primary select-none">
                  <span className="text-xs font-semibold text-text-primary uppercase tracking-wider select-none">
                    {activeT.label}
                  </span>

                  <button
                    onClick={() => openCompose(false)}
                    className="flex items-center gap-2 bg-[#6B5CF6] hover:bg-[#594ad4] text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-all active:scale-95 shadow-sm cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Create new mail
                  </button>
                </div>

                {/* Body details */}
                <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-6">
                  <div className="space-y-2">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[var(--color-background-info)] text-[var(--color-text-info)] select-none">
                      {activeT.category}
                    </span>
                    <h2 className="text-sm font-semibold text-text-primary">
                      {activeT.title}
                    </h2>
                    <p className="text-xs text-text-tertiary">
                      {activeT.description}
                    </p>
                  </div>

                  <div className="border border-border-primary rounded-xl overflow-hidden bg-bg-secondary shadow-sm">
                    <div className="bg-bg-tertiary/70 border-b border-border-primary p-4 space-y-2 text-xs">
                      <div className="flex items-center">
                        <span className="w-12 text-[10px] font-bold text-text-tertiary uppercase select-none">From</span>
                        <span className="text-text-secondary select-all font-medium">Pranay.k@orai-robotics.com</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-12 text-[10px] font-bold text-text-tertiary uppercase select-none">To</span>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--color-background-info)] text-[var(--color-text-info)] select-none">
                          [Client Email]
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-12 text-[10px] font-bold text-text-tertiary uppercase select-none">Cc</span>
                        <span className="text-text-secondary select-all font-medium">cs-team@orai-robotics.com</span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-12 text-[10px] font-bold text-text-tertiary uppercase mt-0.5 select-none">Subject</span>
                        <span className="text-text-primary font-semibold truncate">
                          {renderTextWithPills(activeT.subject)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-6 text-xs text-text-primary leading-relaxed border-b border-border-primary font-sans">
                      {renderTextWithPills(activeT.body)}
                    </div>

                    <div className="bg-bg-tertiary/40 px-5 py-3.5 flex items-center gap-3">
                      <button
                        onClick={() => openCompose(true)}
                        className="flex items-center gap-2 bg-[#6B5CF6] hover:bg-[#594ad4] text-white text-xs font-semibold px-4 py-2 rounded-md transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Use template
                      </button>

                      <button
                        onClick={handleCopyBody}
                        className="flex items-center gap-2 bg-transparent hover:bg-bg-tertiary border border-border-secondary text-text-secondary hover:text-text-primary text-xs font-medium px-4 py-2 rounded-md transition-all active:scale-95 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      ) : activeView === 'notes' ? (

        /* Outlook Sticky Notes 2-Column view */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-[#f4f5f7] dark:bg-bg-primary">
          {/* Left Column: Notes List */}
          <aside className="w-full lg:w-[320px] border-b lg:border-b-0 lg:border-r border-border-primary flex flex-col bg-white dark:bg-bg-secondary flex-shrink-0">
            <div className="p-4 border-b border-border-primary flex items-center justify-between bg-white dark:bg-bg-secondary select-none">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary text-sm">Notes</span>
                <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc] dark:bg-bg-primary">
              <div 
                onClick={() => {
                  const newNote = {
                    id: `note-${Date.now()}`,
                    content: '',
                    color: '#fef08a',
                    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                  };
                  setNotes([newNote, ...notes]);
                  setActiveNoteId(newNote.id);
                  showToast('New sticky note created!');
                }} 
                className="w-full flex items-center justify-center p-3 border-2 border-dashed border-border-secondary rounded-xl text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary transition-colors cursor-pointer mb-2"
              >
                 <span className="text-xs font-semibold">+ Add Note</span>
              </div>
              
              {notes.length === 0 ? (
                 <div className="text-center text-xs text-text-tertiary mt-10 px-4">No notes yet. Click the + icon to create one.</div>
              ) : (
                notes.map(note => {
                  const isActive = activeNoteId === note.id;
                  const plainText = getPlainTextFromHtml(note.content).trim();
                  return (
                    <div 
                      key={note.id}
                      onClick={() => setActiveNoteId(note.id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border shadow-sm ${isActive ? 'bg-[#fef08a] border-[#eab308] shadow-md dark:text-black' : 'bg-[#fef08a]/60 dark:bg-yellow-900/20 border-border-secondary hover:border-[#eab308]/50'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className={`text-xs line-clamp-2 leading-relaxed font-sans ${isActive ? 'text-gray-800' : 'text-text-primary'}`}>
                          {plainText || 'Take a note...'}
                        </p>
                        <span className={`text-[9px] font-medium whitespace-nowrap ml-2 ${isActive ? 'text-gray-600' : 'text-text-tertiary'}`}>
                          {note.date}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Column: Note Editor */}
          <section className="flex-1 p-6 lg:p-10 bg-[#f4f5f7] dark:bg-bg-primary overflow-y-auto flex justify-center items-start">
             {(() => {
                const activeNote = notes.find(n => n.id === activeNoteId);
                if (!activeNote) {
                   return (
                      <div className="flex flex-col items-center justify-center text-center mt-20 select-none animate-fade-in">
                        <svg className="w-16 h-16 text-text-tertiary/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-sm font-semibold text-text-primary">No Note Selected</h3>
                        <p className="text-xs text-text-tertiary mt-1">Select a note from the list or create a new one.</p>
                      </div>
                   );
                }
                
                return (
                   <div className="w-full max-w-4xl bg-[#fef08a] rounded-xl shadow-md min-h-[450px] flex flex-col relative animate-scale-in text-gray-800 font-sans">
                      {/* Top Bar with Three Dots and Actions */}
                      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                         <button 
                            onClick={() => {
                               setNotes(notes.filter(n => n.id !== activeNote.id));
                               setActiveNoteId(null);
                               showToast('Note deleted');
                            }}
                            className="p-1 hover:bg-black/5 rounded text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Note"
                         >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                         </button>
                         <button className="p-1 hover:bg-black/5 rounded text-gray-500 transition-colors cursor-pointer">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                            </svg>
                         </button>
                      </div>
                      
                      {/* Editor */}
                      <div className="flex-1 p-8 pr-16 mt-2 relative overflow-y-auto max-h-[60vh]">
                         <div 
                            ref={noteEditorRef}
                            contentEditable
                            onKeyUp={checkActiveStyles}
                            onMouseUp={checkActiveStyles}
                            onInput={(e) => {
                               const html = e.currentTarget.innerHTML;
                               setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, content: html, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) } : n));
                            }}
                            // Removed dangerouslySetInnerHTML to prevent cursor jumping
                            className="outlook-editor w-full h-full bg-transparent border-0 outline-none text-gray-800 leading-relaxed text-sm focus:ring-0 focus:outline-none min-h-full"
                            data-placeholder="Take a note..."
                         />
                      </div>
                      
                      {/* Footer Toolbar */}
                      <div className="px-6 py-4 flex items-center justify-between text-gray-600 select-none">
                         <div className="flex items-center gap-1">
                            <button 
                               onClick={() => { runCommand('bold', null, noteEditorRef); checkActiveStyles(); }} 
                               className={`p-2 rounded font-bold text-sm cursor-pointer hover:bg-black/5 transition-colors ${activeStyles.bold ? 'bg-black/10 text-black' : ''}`}
                            >B</button>
                            <button 
                               onClick={() => { runCommand('italic', null, noteEditorRef); checkActiveStyles(); }} 
                               className={`p-2 rounded italic text-sm cursor-pointer hover:bg-black/5 transition-colors ${activeStyles.italic ? 'bg-black/10 text-black' : ''}`}
                            >I</button>
                            <button 
                               onClick={() => { runCommand('underline', null, noteEditorRef); checkActiveStyles(); }} 
                               className={`p-2 rounded underline text-sm cursor-pointer hover:bg-black/5 transition-colors ${activeStyles.underline ? 'bg-black/10 text-black' : ''}`}
                            >U</button>
                            <button 
                               onClick={() => { runCommand('strikeThrough', null, noteEditorRef); checkActiveStyles(); }} 
                               className={`p-2 rounded line-through text-sm cursor-pointer hover:bg-black/5 transition-colors ${activeStyles.strikeThrough ? 'bg-black/10 text-black' : ''}`}
                            >ab</button>
                            
                            <div className="w-px h-5 bg-black/20 mx-2"></div>
                            
                            <button 
                               onClick={() => { runCommand('insertUnorderedList', null, noteEditorRef); checkActiveStyles(); }} 
                               className={`p-2 rounded cursor-pointer hover:bg-black/5 transition-colors ${activeStyles.insertUnorderedList ? 'bg-black/10 text-black' : ''}`}
                               title="Bullet List"
                            >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                               </svg>
                            </button>
                            
                            <div className="relative">
                               <input type="file" ref={noteFileInputRef} onChange={(e) => handleNoteImageUpload(e, activeNote.id)} className="hidden" accept="image/*" />
                               <button 
                                  onClick={() => noteFileInputRef.current && noteFileInputRef.current.click()} 
                                  className="p-2 rounded cursor-pointer hover:bg-black/5 transition-colors"
                                  title="Add Image"
                               >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                               </button>
                            </div>
                         </div>
                         <span className="text-[11px] font-medium text-gray-500">Modified: {activeNote.date}</span>
                      </div>
                   </div>
                );
             })()}
          </section>
        </div>

      ) : (
        
        /* Dynamic Folder Workspace (Inbox, Sent, Drafts, Deleted, etc.) */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-bg-primary">
          
          {/* Left Column of Folder: Email list and search */}
          <aside className="w-full lg:w-88 border-b border-border-primary lg:border-b-0 lg:border-r flex flex-col overflow-hidden bg-bg-secondary flex-shrink-0">
            
            {/* Folder Header containing details and smart search filters */}
            <div className="p-4 border-b border-border-primary flex flex-col gap-3 flex-shrink-0 bg-white dark:bg-bg-secondary select-none">
              
              {/* Search bar inside list */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeView}...`}
                  className="w-full bg-bg-tertiary border border-border-secondary rounded-lg px-3 py-1.5 pl-8 text-xs outline-none text-text-primary focus:border-[#6B5CF6] transition-colors placeholder-text-tertiary"
                />
                <svg className="w-3.5 h-3.5 text-text-tertiary absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Special Controls for Deleted Items and Search Folders */}
              {activeView === 'deleted' && deletedItems.length > 0 && (
                <button
                  onClick={handleEmptyDeleted}
                  className="w-full flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 transition-colors text-xs font-semibold py-1.5 rounded-lg border border-red-200/50 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Empty Folder
                </button>
              )}

              {activeView === 'search' && (
                <div className="flex gap-1 bg-bg-tertiary p-0.5 rounded-lg border border-border-secondary">
                  <button
                    onClick={() => setSearchFolderType('unread')}
                    className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded-md transition-all cursor-pointer ${
                      searchFolderType === 'unread'
                        ? 'bg-white dark:bg-bg-primary text-text-primary shadow-sm'
                        : 'text-text-tertiary hover:text-text-primary'
                    }`}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => setSearchFolderType('attachments')}
                    className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded-md transition-all cursor-pointer ${
                      searchFolderType === 'attachments'
                        ? 'bg-white dark:bg-bg-primary text-text-primary shadow-sm'
                        : 'text-text-tertiary hover:text-text-primary'
                    }`}
                  >
                    Files
                  </button>
                  <button
                    onClick={() => setSearchFolderType('large')}
                    className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded-md transition-all cursor-pointer ${
                      searchFolderType === 'large'
                        ? 'bg-white dark:bg-bg-primary text-text-primary shadow-sm'
                        : 'text-text-tertiary hover:text-text-primary'
                    }`}
                  >
                    Large ({'>'}1MB)
                  </button>
                </div>
              )}
            </div>

            {/* Email list viewport */}
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border-primary/50">
              {activeListItems.length === 0 ? (
                <div className="p-6 text-center select-none text-text-tertiary h-32 flex items-center justify-center text-xs">
                  {searchQuery ? 'No matching items found.' : 'This folder is empty.'}
                </div>
              ) : (
                activeListItems.map((item) => {
                  const isSelected = selectedEmail && selectedEmail.id === item.id;
                  const isUnread = item.unread;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectEmail(item)}
                      className={`p-4 text-left cursor-pointer transition-all flex flex-col gap-1 relative ${
                        isSelected
                          ? 'bg-white dark:bg-bg-primary border-l-4 border-[#6B5CF6] pl-3 shadow-inner'
                          : 'hover:bg-bg-tertiary'
                      }`}
                    >
                      {/* Badge if unread */}
                      {isUnread && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#6B5CF6] absolute top-5 right-4 shadow-sm" />
                      )}

                      <div className="flex items-center justify-between select-none">
                        <span className={`text-xs font-semibold truncate ${
                          isUnread ? 'text-[#6B5CF6] font-bold' : 'text-text-primary font-medium'
                        }`}>
                          {item.fromName || item.from || item.to || 'Draft'}
                        </span>
                        <span className="text-[9px] font-bold text-text-tertiary">
                          {item.date}
                        </span>
                      </div>

                      <div className={`text-[11px] truncate ${
                        isUnread ? 'text-text-primary font-semibold' : 'text-text-secondary'
                      }`}>
                        {item.subject}
                      </div>

                      <div className="text-[10px] text-text-tertiary truncate leading-normal mt-0.5">
                        {item.body ? getPlainTextFromHtml(item.body).substring(0, 80) : ''}
                      </div>

                      {/* Display attachment indicators */}
                      {item.attachments && item.attachments.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-text-tertiary select-none">
                          <svg className="w-3 h-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span>{item.attachments.length} attachment{item.attachments.length !== 1 && 's'}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Column of Folder: Active Compose Form or Reading Pane View */}
          <section className="flex-1 flex flex-col overflow-hidden relative bg-bg-primary">
            {composeOpen ? (
              
              /* Inline compose form take-over */
              <div className="flex-1 flex flex-col overflow-hidden bg-[#f3f3f3] dark:bg-bg-tertiary animate-fade-in">
                <div className="px-4 py-1.5 bg-[#fafafa] dark:bg-bg-primary border-b border-border-primary flex flex-wrap items-center gap-1 select-none flex-shrink-0">
                  <div className="flex items-center mr-2 pr-2 border-r border-border-primary gap-0.5">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => runCommand('undo')}
                      className="p-1 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                      title="Undo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => runCommand('redo')}
                      className="p-1 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                      title="Redo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m8-8l-6 6m6-6l-6-6" />
                      </svg>
                    </button>
                  </div>

                  <div className="relative mr-1">
                    <select
                      value={fontFamily}
                      onChange={(e) => handleFontFamilyChange(e.target.value)}
                      className="appearance-none bg-bg-secondary text-text-primary text-[11px] border border-border-secondary rounded px-2.5 py-1 pr-6 cursor-pointer font-medium select-none focus:outline-none"
                    >
                      <option value="Segoe UI">Segoe UI</option>
                      <option value="Calibri">Calibri</option>
                      <option value="Arial">Arial</option>
                    </select>
                    <span className="absolute right-1.5 top-2.5 pointer-events-none text-text-tertiary">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>

                  <div className="relative mr-2 pr-2 border-r border-border-primary">
                    <select
                      value={fontSize}
                      onChange={(e) => handleFontSizeChange(e.target.value)}
                      className="appearance-none bg-bg-secondary text-text-primary text-[11px] border border-border-secondary rounded px-2 py-1 pr-5 cursor-pointer font-medium select-none focus:outline-none"
                    >
                      <option value="9">9</option>
                      <option value="10">10</option>
                      <option value="11">11</option>
                      <option value="12">12</option>
                      <option value="14">14</option>
                    </select>
                    <span className="absolute right-3.5 top-2.5 pointer-events-none text-text-tertiary">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 mr-2 pr-2 border-r border-border-primary">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('bold'); checkActiveStyles(); }}
                      className={`p-1 rounded font-bold text-xs px-2 cursor-pointer transition-colors ${activeStyles.bold ? 'bg-[#6B5CF6]/15 text-[#6B5CF6] font-extrabold' : 'text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('italic'); checkActiveStyles(); }}
                      className={`p-1 rounded italic text-xs px-2 cursor-pointer transition-colors ${activeStyles.italic ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('underline'); checkActiveStyles(); }}
                      className={`p-1 rounded underline text-xs px-2 cursor-pointer transition-colors ${activeStyles.underline ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Underline"
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('strikeThrough'); checkActiveStyles(); }}
                      className={`p-1 rounded line-through text-xs px-1.5 cursor-pointer transition-colors ${activeStyles.strikeThrough ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:bg-bg-tertiary'
                        }`}
                      title="Strikethrough"
                    >
                      ab
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5 mr-2 pr-2 border-r border-border-primary">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('insertUnorderedList'); checkActiveStyles(); }}
                      className={`p-1 rounded cursor-pointer transition-colors ${activeStyles.insertUnorderedList ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Bullet List"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('insertOrderedList'); checkActiveStyles(); }}
                      className={`p-1 rounded cursor-pointer transition-colors ${activeStyles.insertOrderedList ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Numbered List"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h14M7 12h14M7 18h14M3 5v3h2m-2 4h3m-3 4h3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('justifyLeft'); checkActiveStyles(); }}
                      className={`p-1 rounded cursor-pointer transition-colors ${activeStyles.justifyLeft ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Align Left"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('justifyCenter'); checkActiveStyles(); }}
                      className={`p-1 rounded cursor-pointer transition-colors ${activeStyles.justifyCenter ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Align Center"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h14M4 18h10" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { runCommand('justifyRight'); checkActiveStyles(); }}
                      className={`p-1 rounded cursor-pointer transition-colors ${activeStyles.justifyRight ? 'bg-[#6B5CF6]/15 text-[#6B5CF6]' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      title="Align Right"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      className="p-1.5 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1 text-[11px] font-semibold transition-colors"
                      title="Attach file"
                    >
                      <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span>Attach</span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleInsertLink}
                      className="p-1.5 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1 text-[11px] font-semibold transition-colors"
                      title="Link"
                    >
                      <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span>Link</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSendEmail} className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-bg-secondary p-5">
                  <div className="flex items-center justify-between border-b border-border-primary pb-3 mb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-[#0078d4] hover:bg-[#005a9e] text-white rounded-md transition-all shadow-sm flex-shrink-0 select-none">
                        <button
                          type="submit"
                          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 hover:bg-black/10 rounded-l-md border-r border-white/20 transition-all cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span>Send</span>
                        </button>
                        <button
                          type="button"
                          className="px-2 py-2 hover:bg-black/10 rounded-r-md transition-all cursor-pointer h-full flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Save Draft Button inside Compose toolbar */}
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md border border-border-secondary transition-all cursor-pointer select-none font-semibold"
                        title="Save Draft"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        <span>Save Draft</span>
                      </button>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-bg-tertiary cursor-pointer transition-colors select-none text-xs font-medium text-text-secondary">
                        <span>From:</span>
                        <span className="font-semibold text-text-primary">Pranay.k@orai-robotics.com</span>
                        <svg className="w-3 h-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setComposeOpen(false);
                          setComposeTo('');
                          setComposeSubject('');
                          setComposeBody('');
                          setAttachments([]);
                          setCurrentEditingDraftId(null);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-tertiary hover:text-red-500 hover:bg-bg-secondary rounded border border-border-secondary hover:border-red-200 transition-all cursor-pointer"
                        title="Discard"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline font-semibold">Discard</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden border border-border-primary rounded-lg bg-white dark:bg-bg-primary shadow-inner">
                    <div className="px-4 py-2 space-y-0.5 bg-bg-tertiary/20 text-xs flex-shrink-0 border-b border-border-primary">
                      <div className="flex items-center py-2 border-b border-border-primary/50">
                        <button
                          type="button"
                          className="w-10 text-[11px] font-bold text-text-secondary bg-bg-secondary hover:bg-bg-tertiary border border-border-secondary rounded-md py-0.5 px-1 mr-2 select-none"
                        >
                          To
                        </button>
                        <input
                          type="email"
                          value={composeTo}
                          onChange={(e) => setComposeTo(e.target.value)}
                          placeholder="recipient@example.com"
                          className="flex-1 bg-transparent border-0 outline-none text-text-primary px-1 text-xs py-0.5 focus:ring-0 focus:outline-none"
                          required
                        />
                        <span className="text-[10px] text-text-tertiary select-none pr-1">Bcc</span>
                      </div>

                      <div className="flex items-center py-2 border-b border-border-primary/50">
                        <button
                          type="button"
                          className="w-10 text-[11px] font-bold text-text-secondary bg-bg-secondary hover:bg-bg-tertiary border border-border-secondary rounded-md py-0.5 px-1 mr-2 select-none"
                        >
                          Cc
                        </button>
                        <input
                          type="text"
                          value={composeCc}
                          onChange={(e) => setComposeCc(e.target.value)}
                          placeholder="cs-team@orai-robotics.com"
                          className="flex-1 bg-transparent border-0 outline-none text-text-primary px-1 text-xs py-0.5 focus:ring-0 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center py-2 border-b border-border-primary/50">
                        <input
                          type="text"
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          placeholder="Add a subject"
                          className="w-full bg-transparent border-0 outline-none text-text-primary font-semibold text-xs py-0.5 focus:ring-0 focus:outline-none placeholder-text-tertiary"
                          required
                        />
                      </div>

                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 py-2 select-none">
                          {attachments.map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-bg-secondary border border-border-secondary rounded-lg px-2.5 py-1 text-xs text-text-primary shadow-sm hover:bg-bg-tertiary transition-all"
                            >
                              <svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <div className="flex flex-col">
                                <span className="font-semibold truncate max-w-[150px]">{file.name}</span>
                                <span className="text-[9px] text-text-tertiary leading-none">{file.size}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttachment(idx)}
                                className="ml-1 text-text-tertiary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-0.5 rounded-full transition-all cursor-pointer"
                                title="Remove attachment"
                              >
                                <svg className="w-3.5 h-3.5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 p-5 bg-white dark:bg-bg-primary overflow-y-auto min-h-[200px]">
                      <div
                        ref={editorRef}
                        contentEditable
                        onKeyUp={checkActiveStyles}
                        onMouseUp={checkActiveStyles}
                        onInput={() => {
                          if (editorRef.current) {
                            setComposeBody(editorRef.current.innerHTML);
                          }
                          checkActiveStyles();
                        }}
                        className="outlook-editor w-full h-full bg-transparent border-0 outline-none text-text-primary leading-relaxed text-sm focus:ring-0 focus:outline-none overflow-y-auto min-h-[250px]"
                        style={{
                          fontFamily: fontFamily,
                          fontSize: fontSize === '11' ? '14px' : fontSize === '9' ? '12px' : fontSize === '10' ? '13px' : fontSize === '12' ? '16px' : fontSize === '14' ? '18px' : '14px'
                        }}
                        data-placeholder="Type your email content here..."
                      />
                    </div>
                  </div>
                </form>
              </div>
            ) : selectedEmail ? (
              
              /* Outlook Reading Pane View */
              <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary select-text font-sans">
                
                {/* Actions Toolbar for Emails */}
                <div className="px-6 py-2.5 bg-white dark:bg-bg-primary border-b border-border-primary flex items-center justify-between select-none flex-shrink-0 shadow-sm">
                  <div className="flex items-center gap-1">
                    
                    {/* Reply Action */}
                    {(activeView === 'inbox' || activeView === 'archive' || activeView === 'junk') && selectedEmail.from && (
                      <button
                        onClick={() => handleReply(selectedEmail)}
                        className="flex items-center gap-1.5 hover:bg-bg-tertiary rounded-lg text-xs font-semibold px-3 py-1.5 text-[#6B5CF6] hover:text-[#594ad4] transition-colors cursor-pointer border border-[#6B5CF6]/10"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <span>Reply</span>
                      </button>
                    )}

                    {/* Edit Draft Action */}
                    {activeView === 'drafts' && (
                      <button
                        onClick={() => handleEditDraft(selectedEmail)}
                        className="flex items-center gap-1.5 hover:bg-bg-tertiary rounded-lg text-xs font-semibold px-3 py-1.5 text-[#6B5CF6] hover:text-[#594ad4] transition-colors cursor-pointer border border-[#6B5CF6]/10"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>Edit Draft</span>
                      </button>
                    )}

                    {/* Send pending Outbox Action */}
                    {activeView === 'outbox' && (
                      <button
                        onClick={() => handleSendOutbox(selectedEmail)}
                        className="flex items-center gap-1.5 hover:bg-[#6B5CF6]/10 rounded-lg text-xs font-semibold px-3 py-1.5 text-[#6B5CF6] transition-colors cursor-pointer border border-[#6B5CF6]/20 bg-[#6B5CF6]/5 animate-pulse"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Send Now</span>
                      </button>
                    )}

                    {/* General Delete Action */}
                    {activeView !== 'deleted' && (
                      <button
                        onClick={() => handleDeleteItem(selectedEmail, activeView)}
                        className="flex items-center gap-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-xs font-semibold px-3 py-1.5 text-text-secondary transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    )}

                    {/* Restore Action in deleted items */}
                    {activeView === 'deleted' && (
                      <>
                        <button
                          onClick={() => handleRestoreItem(selectedEmail)}
                          className="flex items-center gap-1.5 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg text-xs font-semibold px-3 py-1.5 text-text-secondary transition-colors cursor-pointer border border-emerald-500/10"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.76" />
                          </svg>
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => handlePermanentlyDeleteItem(selectedEmail)}
                          className="flex items-center gap-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-xs font-semibold px-3 py-1.5 text-text-secondary transition-colors cursor-pointer border border-red-500/10"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete Permanently</span>
                        </button>
                      </>
                    )}

                    {/* Archive Actions */}
                    {(activeView === 'inbox' || activeView === 'junk') && (
                      <button
                        onClick={() => handleArchiveItem(selectedEmail, activeView)}
                        className="flex items-center gap-1.5 hover:bg-bg-tertiary rounded-lg text-xs font-semibold px-3 py-1.5 text-text-secondary transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        <span>Archive</span>
                      </button>
                    )}

                    {activeView === 'archive' && (
                      <button
                        onClick={() => handleUnarchiveItem(selectedEmail)}
                        className="flex items-center gap-1.5 hover:bg-bg-tertiary rounded-lg text-xs font-semibold px-3 py-1.5 text-text-secondary transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Move to Inbox</span>
                      </button>
                    )}

                    {/* Junk Email Mark Action */}
                    {activeView === 'junk' && (
                      <button
                        onClick={() => handleMarkNotJunk(selectedEmail)}
                        className="flex items-center gap-1.5 hover:bg-bg-tertiary rounded-lg text-xs font-semibold px-3 py-1.5 text-text-secondary transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Not Junk</span>
                      </button>
                    )}

                  </div>

                  {/* Right side stats metadata */}
                  <span className="text-[10px] font-bold text-text-tertiary select-none">
                    ORAI DISPATCH ROUTE · OUTLOOK SECURE
                  </span>
                </div>

                {/* Email details viewport */}
                <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-white dark:bg-bg-primary">
                  
                  {/* Email header card */}
                  <div className="flex items-start justify-between border-b border-border-primary pb-5 mb-5 select-none">
                    <div className="flex items-start gap-4">
                      
                      {/* Circle Initials Avatar */}
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold text-sm flex items-center justify-center flex-shrink-0">
                        {(selectedEmail.fromName || selectedEmail.from || selectedEmail.to || 'CS')[0].toUpperCase()}
                      </div>

                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-semibold text-text-primary text-sm">
                          {selectedEmail.fromName || selectedEmail.from || 'Saved Draft'}
                        </span>
                        <div className="text-text-tertiary font-medium">
                          {selectedEmail.from && (
                            <div>
                              <span>From: </span>
                              <span className="select-all font-semibold text-text-secondary">{selectedEmail.from}</span>
                            </div>
                          )}
                          {selectedEmail.to && (
                            <div>
                              <span>To: </span>
                              <span className="select-all font-semibold text-text-secondary">{selectedEmail.to}</span>
                            </div>
                          )}
                          {selectedEmail.cc && (
                            <div>
                              <span>Cc: </span>
                              <span className="select-all font-semibold text-text-secondary">{selectedEmail.cc}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-text-tertiary bg-bg-secondary px-2.5 py-1 rounded-md border border-border-primary">
                      {selectedEmail.date}
                    </span>
                  </div>

                  {/* Subject line heading */}
                  <h2 className="text-base font-bold text-text-primary mb-6 pr-12 select-text">
                    {selectedEmail.subject || '(No Subject)'}
                  </h2>

                  {/* Attachments rendering inside Reading Pane */}
                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <div className="mb-6 p-3 bg-bg-secondary rounded-lg border border-border-secondary select-none flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                        Attachments ({selectedEmail.attachments.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmail.attachments.map((file, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center gap-2 bg-white dark:bg-bg-primary border border-border-secondary rounded-lg px-2.5 py-1.5 text-xs text-text-primary shadow-sm hover:shadow transition-shadow"
                          >
                            <svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="font-semibold truncate max-w-[150px]">{file.name}</span>
                            <span className="text-[9px] text-text-tertiary">({file.size})</span>
                            <button
                              onClick={() => showToast(`Downloaded ${file.name}`)}
                              className="ml-2 p-0.5 hover:bg-bg-tertiary rounded text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                              title="Download attachment"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main Rich text body viewport */}
                  <div 
                    className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap pb-12 select-text font-sans selection:bg-indigo-100 dark:selection:bg-indigo-950/40"
                    dangerouslySetInnerHTML={{ 
                      __html: selectedEmail.body ? selectedEmail.body.replace(/\n/g, '<br />') : '' 
                    }}
                  />
                </div>
              </div>
            ) : activeView === 'history' ? (
              
              /* Conversation History Workspace Layout */
              <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary select-none font-sans">
                <div className="px-6 py-4 border-b border-border-primary bg-white dark:bg-bg-primary flex items-center justify-between flex-shrink-0 shadow-sm">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Interaction Timeline Logs
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                    Active System Audit
                  </span>
                </div>

                <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-4">
                  {conversationHistory.map((hist) => (
                    <div 
                      key={hist.id} 
                      className="bg-white dark:bg-bg-primary border border-border-primary p-4 rounded-xl shadow-sm flex items-start gap-4 transition-all hover:shadow"
                    >
                      <div className={`p-2.5 rounded-lg ${
                        hist.type === 'email' 
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40' 
                          : hist.type === 'call'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                      }`}>
                        {hist.type === 'email' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ) : hist.type === 'call' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.172l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-text-primary">{hist.client}</span>
                          <span className="text-text-tertiary font-medium">{hist.time}</span>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-normal">{hist.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              
              /* Reading Pane Empty state placeholder */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-bg-secondary select-none animate-fade-in">
                <svg className="w-16 h-16 text-text-tertiary/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
                </svg>
                <h3 className="text-sm font-semibold text-text-primary">No message selected</h3>
                <p className="text-xs text-text-tertiary mt-1 max-w-[280px]">
                  Select an item from the column on the left to read its full content, or compose a new email from templates!
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Global premium micro-toast message */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#1e293b] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-700/60 animate-fade-in flex items-center gap-2 select-none">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
