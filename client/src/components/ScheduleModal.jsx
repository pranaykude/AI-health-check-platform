import { useState } from 'react';

export default function ScheduleModal({ isOpen, onClose, onConfirm, clientName }) {
  const [callType, setCallType] = useState('Health check-in (AI)');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [recurrence, setRecurrence] = useState('One-time');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ callType, date, time, recurrence, note });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-bg-primary rounded-2xl shadow-2xl border border-border-primary overflow-hidden animate-slide-in p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Schedule AI Call</h2>
            <p className="text-sm text-text-tertiary mt-1">For: {clientName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1">Call type</label>
            <select 
              value={callType}
              onChange={(e) => setCallType(e.target.value)}
              className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-primary-500"
              required
            >
              <option value="Health check-in (AI)">Health check-in (AI)</option>
              <option value="Follow-up call">Follow-up call</option>
              <option value="Appointment reminder">Appointment reminder</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-text-secondary mb-1">Date</label>
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-primary-500"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-text-secondary mb-1">Time</label>
              <input 
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-primary-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1">Recurrence</label>
            <select 
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-primary-500"
            >
              <option value="One-time">One-time</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1">Note for AI agent (optional)</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Ask about post-surgery recovery progress..."
              rows={3}
              className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-primary-500 resize-none"
            />
          </div>

          <div className="bg-success-50 text-success-700 px-4 py-3 rounded-xl flex gap-3 items-start border border-success-200 text-sm">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p>AI will automatically trigger this call at the scheduled time — no manual action needed.</p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-semibold text-text-secondary hover:bg-bg-secondary border border-border-primary transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 rounded-xl font-semibold bg-white text-bg-primary border border-text-secondary hover:bg-gray-100 transition-colors flex gap-2 items-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Confirm Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
