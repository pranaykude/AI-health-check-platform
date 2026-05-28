import sys, re

filepath = r'e:\ORAI robotics\health chcek -  AI voice aggent\client\src\pages\Emails.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add states: activeNoteId, noteEditorRef, noteFileInputRef
if 'const [activeNoteId' not in content:
    content = content.replace(
        "const [selectedEmail, setSelectedEmail] = useState(null);",
        "const [selectedEmail, setSelectedEmail] = useState(null);\n  const [activeNoteId, setActiveNoteId] = useState(null);\n  const noteEditorRef = useRef(null);\n  const noteFileInputRef = useRef(null);"
    )

# Replace runCommand
old_run_command = '''  const runCommand = (command, value = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
    }
  };'''
new_run_command = '''  const runCommand = (command, value = null, targetRef = editorRef) => {
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
  };'''
content = content.replace(old_run_command, new_run_command)

# Replace Notes block
start_marker = "      ) : activeView === 'notes' ? ("
end_marker = "      ) : ("

if start_marker in content and end_marker in content:
    before = content.split(start_marker)[0] + start_marker + "\n"
    after_start = content.split(start_marker)[1]
    
    end_marker_full = """      ) : (
        
        /* Dynamic Folder Workspace (Inbox, Sent, Drafts, Deleted, etc.) */"""
        
    if end_marker_full in after_start:
        after = end_marker_full + after_start.split(end_marker_full)[1]
        
        replacement = """
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
                               setNotes(notes.map(n => n.id === activeNote.id ? { ...n, content: html, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) } : n));
                            }}
                            dangerouslySetInnerHTML={{ __html: activeNote.content || '' }}
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
"""
        content = before + replacement + "\n" + after

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
