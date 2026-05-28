import sys

filepath = r'e:\ORAI robotics\health chcek -  AI voice aggent\client\src\pages\Emails.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """      {/* Topbar containing dynamic header and Three-Dot dropdown */}
      <div className="px-8 py-5 border-b border-border-primary flex-shrink-0 flex items-center justify-between relative bg-bg-primary select-none">
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
        </div>"""

replacement = """      {/* Topbar containing dynamic header and Three-Dot dropdown */}
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
        </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Back button added successfully!')
else:
    print('Could not find target content in file.')
