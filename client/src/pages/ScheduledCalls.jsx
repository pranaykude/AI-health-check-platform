import { useState, useEffect } from 'react';
import { getSchedules, cancelSchedule } from '../api/scheduleApi';
import ScheduleModal from '../components/ScheduleModal';

export default function ScheduledCalls() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Modal for Edit (reusing the same component, though editing would need its own logic, we'll keep it simple for now)
  const [scheduleTarget, setScheduleTarget] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await getSchedules({ status: 'Pending' });
      setSchedules(res.data);
    } catch (err) {
      showToast('Failed to load scheduled calls', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCancel = async (id) => {
    try {
      await cancelSchedule(id);
      showToast('Schedule cancelled');
      fetchSchedules();
    } catch (err) {
      showToast('Failed to cancel schedule', 'error');
    }
  };

  const today = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(today.getDate() + 7);

  const upcomingThisWeek = schedules.filter(s => {
    const d = new Date(s.scheduledAt);
    return d >= today && d <= weekFromNow;
  }).length;

  return (
    <div className="p-8 lg:p-10 animate-fade-in bg-bg-primary min-h-full">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl text-sm font-medium shadow-lg animate-slide-in border ${
            toast.type === 'error'
              ? 'bg-danger-50 border-danger-200 text-danger-600'
              : 'bg-success-50 border-success-200 text-success-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-text-primary">Scheduled Calls</h1>
          <p className="text-lg text-text-secondary mt-2">
            AI auto-triggers these calls — no manual action needed
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6">
          <p className="text-sm font-bold text-text-tertiary uppercase tracking-wider mb-2">Upcoming This Week</p>
          <p className="text-4xl font-bold text-text-primary">{upcomingThisWeek}</p>
        </div>
        <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6">
          <p className="text-sm font-bold text-text-tertiary uppercase tracking-wider mb-2">Total Scheduled</p>
          <p className="text-4xl font-bold text-text-primary">{schedules.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary">Upcoming calls</h2>
          </div>

          {loading ? (
            <p className="text-text-tertiary">Loading schedules...</p>
          ) : schedules.length === 0 ? (
            <div className="bg-bg-secondary border border-border-primary rounded-2xl p-8 text-center">
              <p className="text-text-secondary">No upcoming calls scheduled.</p>
            </div>
          ) : (
            schedules.map((schedule) => {
              const d = new Date(schedule.scheduledAt);
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={schedule._id} className="bg-bg-secondary border border-border-primary rounded-2xl p-5 flex items-center justify-between hover:border-primary-300 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className="bg-white border border-border-primary rounded-xl p-3 min-w-[70px] text-center">
                      <p className="text-2xl font-bold text-primary-600 leading-none">{d.getDate()}</p>
                      <p className="text-xs font-semibold text-text-tertiary uppercase mt-1">
                        {d.toLocaleString('default', { month: 'short' })}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">{schedule.client?.name || 'Unknown Client'}</h3>
                      <p className="text-sm text-text-secondary mt-1">
                        <span className="font-semibold">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> · {schedule.callType} · {schedule.recurrence}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleCancel(schedule._id)}
                      className="text-sm font-semibold text-danger-600 hover:text-danger-700 hover:bg-danger-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div>
           {/* Simple static calendar representation for visuals like the image */}
           <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-text-primary">{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
              <div className="flex gap-2 text-text-tertiary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-y-4 text-center text-sm">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="font-medium text-text-tertiary">{day}</div>
              ))}
              
              {/* Dummy padding for calendar start */}
              <div/><div/><div/><div/>
              
              {Array.from({length: 31}).map((_, i) => {
                const dateNum = i + 1;
                const isCurrent = dateNum === today.getDate();
                const hasSchedule = schedules.some(s => new Date(s.scheduledAt).getDate() === dateNum);
                return (
                  <div key={i} className="relative flex justify-center">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full ${isCurrent ? 'bg-primary-600 text-white font-bold' : 'text-text-primary hover:bg-bg-tertiary cursor-pointer'}`}>
                      {dateNum}
                    </div>
                    {hasSchedule && !isCurrent && (
                      <div className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-success-500"></div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-8 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <div className="w-2 h-2 rounded-full bg-success-500"></div> Scheduled call
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <div className="w-2 h-2 rounded-full bg-primary-600"></div> Today
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
