import sys, re

filepath = r'e:\ORAI robotics\health chcek -  AI voice aggent\client\src\pages\Emails.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Notes block again, but fixing dangerouslySetInnerHTML
# Wait, let's just do a direct regex replace or string replace on the dangerouslySetInnerHTML part.

old_editor_div = '''                            onInput={(e) => {
                               const html = e.currentTarget.innerHTML;
                               setNotes(notes.map(n => n.id === activeNote.id ? { ...n, content: html, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) } : n));
                            }}
                            dangerouslySetInnerHTML={{ __html: activeNote.content || '' }}
                            className="outlook-editor w-full h-full bg-transparent border-0 outline-none text-gray-800 leading-relaxed text-sm focus:ring-0 focus:outline-none min-h-full"'''

new_editor_div = '''                            onInput={(e) => {
                               const html = e.currentTarget.innerHTML;
                               setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, content: html, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) } : n));
                            }}
                            // Removed dangerouslySetInnerHTML to prevent cursor jumping
                            className="outlook-editor w-full h-full bg-transparent border-0 outline-none text-gray-800 leading-relaxed text-sm focus:ring-0 focus:outline-none min-h-full"'''

if old_editor_div in content:
    content = content.replace(old_editor_div, new_editor_div)

# Now we need to add the useEffect to sync the active note content when the user selects a different note.
# We can put it right below the checkActiveStyles definition.

sync_effect = '''
  // Sync active states on cursor/selection movement
  const checkActiveStyles = () => {'''

new_sync_effect = '''
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
  const checkActiveStyles = () => {'''

if sync_effect in content and "Sync note editor content when switching notes" not in content:
    content = content.replace(sync_effect, new_sync_effect)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed notes editor issue!')
