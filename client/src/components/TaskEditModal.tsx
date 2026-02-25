import React, { useState } from 'react';
import { NewTask, TaskStatus } from '../types/common';

interface TaskEditModalProps {
  task: NewTask | null;
  onClose: () => void;
  onSave: (updatedTask: NewTask) => void;
  onDelete?: (taskId: string) => void;
  isOpen: boolean;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; text: string }> = {
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

// Convert a Date to the value format datetime-local expects (local time, no offset)
const toLocalInput = (date: Date | string): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
};

const TaskEditModal: React.FC<TaskEditModalProps> = ({ task, onClose, onSave, onDelete, isOpen }) => {
  const [edited, setEdited] = useState<NewTask | null>(task);
  const [timeError, setTimeError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !edited) return null;

  const validateTimes = (start?: Date, end?: Date) => {
    if (start && end && new Date(end) <= new Date(start))
      return 'End time must be after start time';
    return '';
  };

  const handleSave = () => {
    const err = validateTimes(edited.start, edited.end);
    if (err) { setTimeError(err); return; }
    onSave(edited);
    onClose();
  };

  const handleConfirmDelete = () => {
    if (edited.id && onDelete) { onDelete(edited.id); onClose(); }
  };

  const statusCfg = STATUS_CONFIG[edited.status] ?? STATUS_CONFIG[TaskStatus.NotStarted];

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      {/* Card */}
      <div
        style={{
          background: '#ffffff', borderRadius: '16px',
          width: '100%', maxWidth: '520px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status colour strip */}
        <div style={{ height: '4px', background: statusCfg.color, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={edited.title}
              onChange={(e) => setEdited({ ...edited, title: e.target.value })}
              style={{
                width: '100%', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a',
                border: 'none', borderBottom: '2px solid transparent',
                outline: 'none', padding: '0 0 4px', background: 'transparent',
                transition: 'border-color 0.15s', boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderBottomColor = '#3b82f6')}
              onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
              placeholder="Task title"
            />
          </div>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%',
              border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Status pills */}
          <div>
            <FieldLabel>Status</FieldLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const active = edited.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setEdited({ ...edited, status: s })}
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
                      background: active ? 'rgba(255,255,255,0.7)' : cfg.color,
                      flexShrink: 0,
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
                const active = edited.priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setEdited({ ...edited, priority: p })}
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
              <FieldLabel>Start</FieldLabel>
              <DateInput
                value={toLocalInput(edited.start)}
                onChange={(v) => {
                  const newStart = v ? new Date(v) : edited.start;
                  setTimeError(validateTimes(newStart, edited.end));
                  setEdited({ ...edited, start: newStart });
                }}
              />
            </div>
            <div>
              <FieldLabel>End</FieldLabel>
              <DateInput
                value={toLocalInput(edited.end)}
                onChange={(v) => {
                  const newEnd = v ? new Date(v) : edited.end;
                  setTimeError(validateTimes(edited.start, newEnd));
                  setEdited({ ...edited, end: newEnd });
                }}
              />
            </div>
          </div>
          {timeError && (
            <p style={{ margin: '-8px 0 0', fontSize: '0.75rem', color: '#dc2626' }}>{timeError}</p>
          )}

          {/* Comments */}
          <div>
            <FieldLabel>Notes</FieldLabel>
            <textarea
              value={edited.comments}
              onChange={(e) => setEdited({ ...edited, comments: e.target.value })}
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

          {/* Delete confirmation inline */}
          {showDeleteConfirm && (
            <div style={{
              background: '#fef2f2', border: '1.5px solid #fecaca',
              borderRadius: '10px', padding: '12px 14px',
            }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 600, color: '#991b1b' }}>
                Permanently delete this task?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleConfirmDelete}
                  style={{
                    padding: '6px 14px', borderRadius: '7px', fontSize: '0.78rem', fontWeight: 600,
                    background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer',
                  }}
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '6px 14px', borderRadius: '7px', fontSize: '0.78rem', fontWeight: 600,
                    background: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc',
        }}>
          <div>
            {onDelete && !showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '7px 12px', borderRadius: '7px', fontSize: '0.78rem', fontWeight: 600,
                  background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#fef2f2')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Delete
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                background: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#fff')}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 20px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(59,130,246,0.35)', transition: 'background 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(59,130,246,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(59,130,246,0.35)';
              }}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Small reusable sub-components ── */

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label style={{
    display: 'block', fontSize: '0.68rem', fontWeight: 700,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px',
  }}>
    {children}
  </label>
);

const DateInput: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="datetime-local"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: '100%', fontSize: '0.78rem', color: '#334155',
      border: '1.5px solid #e2e8f0', borderRadius: '8px',
      padding: '8px 10px', outline: 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      boxSizing: 'border-box', fontFamily: 'inherit',
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
);

export default TaskEditModal;
