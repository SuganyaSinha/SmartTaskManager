import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createTask } from '../services/taskService';
import { TaskStatus } from '../types/common';

/* ── Helpers (same as TaskEditModal) ── */

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const toTimePart = (value: string): string => {
  if (!value) return '00:00';
  const [h, m] = value.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${m >= 30 ? '30' : '00'}`;
};

/* ── Sub-components (same style as TaskEditModal) ── */

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label style={{
    display: 'block', fontSize: '0.68rem', fontWeight: 700,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px',
  }}>
    {children}
  </label>
);

const inputStyle: React.CSSProperties = {
  fontSize: '0.78rem', color: '#334155',
  border: '1.5px solid #e2e8f0', borderRadius: '8px',
  padding: '8px 10px', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box', fontFamily: 'inherit',
};

const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = '#3b82f6';
  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
};
const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = '#e2e8f0';
  e.target.style.boxShadow = 'none';
};

const DateTimeInput: React.FC<{
  date: string; time: string;
  onDateChange: (d: string) => void;
  onTimeChange: (t: string) => void;
}> = ({ date, time, onDateChange, onTimeChange }) => (
  <div style={{ display: 'flex', gap: '6px' }}>
    <input
      type="date"
      value={date}
      onChange={(e) => onDateChange(e.target.value)}
      style={{ ...inputStyle, flex: 1 }}
      onFocus={focusStyle}
      onBlur={blurStyle}
    />
    <select
      value={time}
      onChange={(e) => onTimeChange(e.target.value)}
      disabled={!date}
      style={{
        ...inputStyle, width: '80px', padding: '8px 6px',
        background: date ? '#fff' : '#f8fafc',
        color: date ? '#334155' : '#94a3b8',
        cursor: date ? 'pointer' : 'default',
      }}
      onFocus={focusStyle}
      onBlur={blurStyle}
    >
      {TIME_SLOTS.map((slot) => (
        <option key={slot} value={slot}>{slot}</option>
      ))}
    </select>
  </div>
);

type StatusCfg = { label: string; color: string; bg: string; text: string };
const STATUS_CONFIG: Record<string, StatusCfg> = {
  [TaskStatus.NotStarted]: { label: 'Not Started', color: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  [TaskStatus.InProgress]: { label: 'In Progress', color: '#3b82f6', bg: '#eff6ff', text: '#1e40af' },
  [TaskStatus.Completed]:  { label: 'Completed',   color: '#22c55e', bg: '#f0fdf4', text: '#166534' },
  [TaskStatus.Blocked]:    { label: 'Blocked',     color: '#ef4444', bg: '#fef2f2', text: '#991b1b' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; activeText: string }> = {
  high:   { label: 'High',   color: '#ef4444', activeText: '#fff' },
  medium: { label: 'Medium', color: '#f59e0b', activeText: '#fff' },
  low:    { label: 'Low',    color: '#22c55e', activeText: '#fff' },
};

import React from 'react';

function NewTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.NotStarted);
  const [comments, setComments] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    if (date) {
      setStartDate(date);
      setEndDate(date);
    }
    if (time) {
      const snapped = toTimePart(time);
      setStartTime(snapped);
      // Default end to 1 hour later
      const [h] = snapped.split(':').map(Number);
      setEndTime(`${String((h + 1) % 24).padStart(2, '0')}:${snapped.split(':')[1]}`);
    }
  }, [searchParams]);

  const handleCancel = () => {
    const view = searchParams.get('view') || 'month';
    navigate(`/Calendar?view=${view}`);
  };

  const validateTimes = (sd: string, st: string, ed: string, et: string) => {
    if (!sd || !ed) return '';
    const start = new Date(`${sd}T${st}`);
    const end = new Date(`${ed}T${et}`);
    if (end <= start) return 'End time must be after start time';
    return '';
  };

  const handleStartDateChange = (d: string) => {
    setStartDate(d);
    if (!endDate) setEndDate(d);
    setTimeError(validateTimes(d, startTime, endDate || d, endTime));
  };

  const handleStartTimeChange = (t: string) => {
    setStartTime(t);
    setTimeError(validateTimes(startDate, t, endDate, endTime));
  };

  const handleEndDateChange = (d: string) => {
    setEndDate(d);
    setTimeError(validateTimes(startDate, startTime, d, endTime));
  };

  const handleEndTimeChange = (t: string) => {
    setEndTime(t);
    setTimeError(validateTimes(startDate, startTime, endDate, t));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!startDate) { setError('Start date is required.'); return; }
    if (!endDate) { setError('End date is required.'); return; }
    const te = validateTimes(startDate, startTime, endDate, endTime);
    if (te) { setTimeError(te); return; }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await createTask({
        title: title.trim(),
        start: `${startDate}T${startTime}:00` as unknown as Date,
        end: `${endDate}T${endTime}:00` as unknown as Date,
        priority,
        status,
        comments: comments.trim(),
        category: category.trim() || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      setSuccess(true);
      setTimeout(() => navigate(`/Calendar?view=day&date=${startDate}`), 1500);
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('Failed to create task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Task</h1>

        <div style={{
          background: '#ffffff', borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}>
          {/* Status colour strip */}
          <div style={{ height: '4px', background: STATUS_CONFIG[status]?.color ?? '#e2e8f0' }} />

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Title */}
            <div>
              <FieldLabel>Title <span style={{ color: '#ef4444' }}>*</span></FieldLabel>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                style={{ ...inputStyle, width: '100%' }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>

            {/* Status pills */}
            <div>
              <FieldLabel>Status</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s]!;
                  const active = status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '5px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                        border: `1.5px solid ${active ? cfg.color : 'transparent'}`,
                        background: active ? cfg.color : cfg.bg,
                        color: active ? '#ffffff' : cfg.text,
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: active ? `0 2px 6px ${cfg.color}44` : 'none',
                      }}
                    >
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: active ? 'rgba(255,255,255,0.7)' : cfg.color, flexShrink: 0,
                      }} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority toggles */}
            <div>
              <FieldLabel>Priority</FieldLabel>
              <div style={{ display: 'flex', gap: '6px' }}>
                {Object.entries(PRIORITY_CONFIG).map(([p, cfg]) => {
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      style={{
                        flex: 1, padding: '6px', borderRadius: '8px',
                        fontSize: '0.78rem', fontWeight: 600,
                        border: `2px solid ${cfg.color}`,
                        background: active ? cfg.color : '#fff',
                        color: active ? cfg.activeText : cfg.color,
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: active ? `0 2px 8px ${cfg.color}44` : 'none',
                      }}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date / time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <FieldLabel>Start <span style={{ color: '#ef4444' }}>*</span></FieldLabel>
                <DateTimeInput
                  date={startDate}
                  time={startTime}
                  onDateChange={handleStartDateChange}
                  onTimeChange={handleStartTimeChange}
                />
              </div>
              <div>
                <FieldLabel>End <span style={{ color: '#ef4444' }}>*</span></FieldLabel>
                <DateTimeInput
                  date={endDate}
                  time={endTime}
                  onDateChange={handleEndDateChange}
                  onTimeChange={handleEndTimeChange}
                />
              </div>
            </div>
            {timeError && (
              <p style={{ margin: '-8px 0 0', fontSize: '0.75rem', color: '#dc2626' }}>{timeError}</p>
            )}

            {/* Category */}
            <div>
              <FieldLabel>Category</FieldLabel>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Work, Personal"
                style={{ ...inputStyle, width: '100%' }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>

            {/* Comments */}
            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder="Add notes or description…"
                style={{
                  width: '100%', fontSize: '0.82rem', color: '#334155',
                  border: '1.5px solid #e2e8f0', borderRadius: '8px',
                  padding: '9px 11px', resize: 'vertical', outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxSizing: 'border-box', lineHeight: 1.55, fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Error / Success banners */}
            {error && (
              <div style={{
                background: '#fef2f2', border: '1.5px solid #fecaca',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '0.82rem', color: '#991b1b',
              }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{
                background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '0.82rem', color: '#166534',
              }}>
                Task created successfully! Redirecting…
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: '8px',
            padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc',
          }}>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                background: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0',
                cursor: isLoading ? 'default' : 'pointer', opacity: isLoading ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                padding: '8px 20px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                background: '#3b82f6', color: '#fff', border: 'none',
                cursor: isLoading ? 'default' : 'pointer', opacity: isLoading ? 0.5 : 1,
                boxShadow: '0 1px 3px rgba(59,130,246,0.35)', transition: 'background 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(59,130,246,0.4)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(59,130,246,0.35)';
              }}
            >
              {isLoading ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewTask;
