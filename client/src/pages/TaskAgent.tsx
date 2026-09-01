import React, { useState, useEffect, useRef, useCallback } from 'react';
import moment from 'moment';
import { TaskStatus, ChatMessage, PreviewData, QueryTaskResult, NewTask, ScheduledTaskResult, ChatSessionSummary } from '../types/common';
import { sendChatMessage, getChatSessions, getSessionMessages, deleteChatSession } from '../services/chatService';
import { createTask, getTaskById, updateTask, deleteTask } from '../services/taskService';
import AudioInput, { type AudioInputHandle } from './AudioInput';
import TaskEditModal from '../components/TaskEditModal';
import './TaskAgent.css';

// Render common LLM markdown patterns without an external library.
// Handles: **bold**, `code`, bullet lists (- or *), numbered lists, blank-line paragraphs.
function renderMarkdown(text: string): React.ReactNode {
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs.map((para, pi) => {
    const lines = para.split('\n');
    const isBullet = lines.every(l => /^[-*]\s/.test(l.trimStart()) || l.trim() === '');
    const isNumbered = lines.every(l => /^\d+\.\s/.test(l.trimStart()) || l.trim() === '');

    const renderInline = (str: string): React.ReactNode => {
      // Split on **bold** and `code`
      const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      return parts.map((part, i) => {
        if (/^\*\*(.+)\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (/^`(.+)`$/.test(part)) return <code key={i} className="cs-inline-code">{part.slice(1, -1)}</code>;
        return part;
      });
    };

    if (isBullet) {
      return (
        <ul key={pi} className="cs-md-list">
          {lines.filter(l => l.trim()).map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^[-*]\s/, '').trimStart())}</li>
          ))}
        </ul>
      );
    }
    if (isNumbered) {
      return (
        <ol key={pi} className="cs-md-list">
          {lines.filter(l => l.trim()).map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^\d+\.\s/, '').trimStart())}</li>
          ))}
        </ol>
      );
    }
    // Plain paragraph — join lines with spaces, preserve single newlines as <br>
    return (
      <p key={pi} className="cs-md-para">
        {lines.map((l, li) => (
          <React.Fragment key={li}>
            {renderInline(l)}
            {li < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

// Extract the last paragraph from an LLM confirmation message (e.g. "Click Yes, proceed…").
function extractConfirmationPrompt(content: string): string {
  const paragraphs = content.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  const last = paragraphs[paragraphs.length - 1] ?? '';
  if (last.toLowerCase().includes('proceed') || last.toLowerCase().includes('confirm')) return last;
  return '';
}

// Extract friendly intro/outro text surrounding the LLM's numbered task list.
// The LLM produces text like: "Here are your tasks:\n1. Task\n2. Task\nLet me know!"
// We keep the surrounding sentences and discard the markdown list (replaced by clickable rows).
function extractFriendlyParts(content: string): { intro: string; outro: string } {
  const paragraphs = content.split(/\n\n+/);
  let firstListIdx = -1;
  let lastListIdx = -1;

  paragraphs.forEach((para, i) => {
    // Match numbered lists (1. ...) AND bullet/markdown lists (- ... or * ...)
    if (/^\d+\./.test(para.trim()) || /^[-*]/.test(para.trim())) {
      if (firstListIdx === -1) firstListIdx = i;
      lastListIdx = i;
    }
  });

  if (firstListIdx === -1) return { intro: content.trim(), outro: '' };

  return {
    intro: paragraphs.slice(0, firstListIdx).join('\n\n').trim(),
    outro: paragraphs.slice(lastListIdx + 1).join('\n\n').trim(),
  };
}

const TaskAgent = () => {
  // ── Modal state ────────────────────────────────────────────────────────────
  const [fetchedTask, setFetchedTask] = useState<NewTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Session state ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PreviewData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<AudioInputHandle>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load session list on mount
  useEffect(() => {
    const loadSessions = async () => {
      setSessionsLoading(true);
      try {
        const list = await getChatSessions();
        setSessions(list);
      } catch {
        // Non-fatal
      } finally {
        setSessionsLoading(false);
      }
    };
    loadSessions();
  }, []);

  // ── Session handlers ───────────────────────────────────────────────────────
  const handleNewChat = () => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setPendingConfirmation(null);
    setError(null);
    setInputValue('');
  };

  const handleSelectSession = async (selectedSessionId: string) => {
    if (selectedSessionId === sessionId) return;
    setSessionId(selectedSessionId);
    setMessages([]);
    setPendingConfirmation(null);
    setError(null);
    setInputValue('');
    try {
      const stored = await getSessionMessages(selectedSessionId);
      const chatMessages: ChatMessage[] = stored.map(m => ({
        role: m.role,
        content: m.message,
        messageType: m.messageType === 'user_message' ? undefined : m.messageType,
        previewData: m.previewData,
        queryResults: m.queryResults,
        scheduledTasks: m.scheduledTasks,
      }));
      setMessages(chatMessages);
    } catch {
      // Fail silently — session continues server-side
    }
  };

  const refreshSessions = async () => {
    try {
      const list = await getChatSessions();
      setSessions(list);
    } catch {
      // Non-fatal
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, targetSessionId: string) => {
    e.stopPropagation();
    try {
      await deleteChatSession(targetSessionId);
      setSessions(prev => prev.filter(s => s.sessionId !== targetSessionId));
      if (targetSessionId === sessionId) {
        handleNewChat();
      }
    } catch {
      setError('Failed to delete chat session.');
    }
  };

  // ── Chat send ──────────────────────────────────────────────────────────────
  const handleSend = async (confirmed = false) => {
    const text = inputValue.trim();
    if (!text && !confirmed) return;

    const messageText = confirmed ? '✓ Yes, proceed' : text;
    audioInputRef.current?.reset();

    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setInputValue('');
    setPendingConfirmation(null);
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await sendChatMessage(confirmed ? text || messageText : text, sessionId, confirmed, controller.signal);

      let createdTaskIds: string[] | undefined;
      if (response.messageType === 'tasks_created' && response.scheduledTasks?.length) {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const created = await Promise.all(
          (response.scheduledTasks as ScheduledTaskResult[]).map(t =>
            createTask({
              title: t.title,
              start: t.start as unknown as Date,
              end: t.end as unknown as Date,
              priority: t.priority,
              comments: t.comments,
              status: TaskStatus.NotStarted,
              timezone: timeZone,
              category: t.taskCategory?.toLowerCase(),
            })
          )
        );
        createdTaskIds = created.map((t: NewTask) => t.id!);
      }

      if (response.messageType === 'confirmation_required' && response.previewData) {
        setPendingConfirmation(response.previewData);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        messageType: response.messageType,
        previewData: response.previewData,
        queryResults: response.queryResults,
        scheduledTasks: response.scheduledTasks as ScheduledTaskResult[] | undefined,
        createdTaskIds,
      }]);

      await refreshSessions();
    } catch (err) {
      if ((err as { name?: string })?.name === 'CanceledError' || (err as { name?: string })?.name === 'AbortError') {
        // User stopped the request — silently reset
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setError(errorMsg);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: errorMsg,
          messageType: 'error',
        }]);
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleCancel = () => {
    setPendingConfirmation(null);
    setMessages(prev => [...prev, { role: 'user', content: '✗ Cancelled' }]);
  };

  const handleQueryTaskClick = async (taskId: string) => {
    try {
      const task = await getTaskById(taskId);
      setFetchedTask({
        ...task,
        start: new Date(task.start),
        end: new Date(task.end),
        status: task.status as TaskStatus,
      });
      setIsModalOpen(true);
    } catch {
      setError('Failed to load task.');
    }
  };

  const handleTranscriptChange = useCallback((transcript: string) => {
    setInputValue(transcript);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFetchedTask(null);
  };

  const handleUpdateTask = async (updatedTask: NewTask) => {
    if (!fetchedTask?.id) return;
    try {
      await updateTask(fetchedTask.id, updatedTask);
      closeModal();
    } catch {
      setError('Failed to update task.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      closeModal();
    } catch {
      setError('Failed to delete task.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="cs-layout">
      {/* Session sidebar */}
      <div className="cs-session-sidebar">
        <div className="cs-session-header">
          <button className="cs-new-chat-btn" onClick={handleNewChat}>+ New Chat</button>
        </div>
        {sessionsLoading && <div className="cs-session-loading">Loading...</div>}
        <ul className="cs-session-list">
          {sessions.map(s => (
            <li
              key={s.sessionId}
              className={`cs-session-item${s.sessionId === sessionId ? ' cs-session-item--active' : ''}`}
              onClick={() => handleSelectSession(s.sessionId)}
            >
              <div className="cs-session-item-body">
                <div className="cs-session-title">{s.title || 'New Chat'}</div>
                <div className="cs-session-meta">
                  {s.messageCount} msg · {moment(s.lastActivity).fromNow()}
                </div>
              </div>
              <button
                className="cs-session-delete-btn"
                title="Delete chat"
                onClick={e => handleDeleteSession(e, s.sessionId)}
              >
                ×
              </button>
            </li>
          ))}
          {sessions.length === 0 && !sessionsLoading && (
            <li className="cs-session-empty">No previous chats</li>
          )}
        </ul>
      </div>

      {/* Chat panel */}
      <div className="cs-chat-panel">
        <div className="cs-chat-header">
          <span className="cs-chat-title">Task Assistant</span>
          <span className="cs-chat-hint">Ask me to move, update, query, or create your tasks</span>
        </div>

        <div className="cs-messages">
          {messages.length === 0 && (
            <div className="cs-empty-state">
              <p>Hi! I can help you manage your tasks.</p>
              <p className="cs-examples">Try:</p>
              <ul className="cs-example-list">
                <li>"Move my open tasks from last month to this month"</li>
                <li>"Mark all blocked tasks as not started"</li>
                <li>"Show me all tasks this week"</li>
                <li>"Schedule yoga on Wednesday at 5pm"</li>
              </ul>
            </div>
          )}

          {messages.map((msg, i) => {
            const isConfirmation = msg.messageType === 'confirmation_required';
            const hasQueryResults = msg.queryResults != null;
            const parts = hasQueryResults ? extractFriendlyParts(msg.content) : null;
            return (
            <div key={i} className={`cs-message cs-message--${msg.role}`}>
              <div className="cs-bubble">
                {!isConfirmation && (parts
                  ? parts.intro && <div className="cs-friendly-text">{renderMarkdown(parts.intro)}</div>
                  : msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content)}

                {msg.previewData && isConfirmation && (
                  <div className="cs-preview">
                    <div className="cs-preview-count">
                      {msg.previewData.affectedCount}{' '}
                      {msg.previewData.tasks.some(t => t.newStart)
                        ? 'task(s) will be rescheduled:'
                        : 'task(s) will be affected:'}
                    </div>
                    <ul className="cs-preview-list cs-query-list">
                      {msg.previewData.tasks.slice(0, 10).map((t, j) => (
                        <li key={j} className="cs-preview-item cs-preview-item--col">
                          <div className="cs-preview-row">
                            <span className="cs-item-num">{j + 1}.</span>
                            <button className="cs-task-link" onClick={() => handleQueryTaskClick(t.id)}>
                              {t.title}
                            </button>
                            {t.status && <span className="cs-preview-status">{t.status}</span>}
                          </div>
                          {(t.oldStart || t.newStart) && (
                            <div className="cs-preview-dates">
                              {t.oldStart && t.newStart ? (
                                <span className="cs-preview-date-range">
                                  <span className="cs-date-label-word">from</span>
                                  <span className="cs-date-old">
                                    {moment(t.oldStart).format('MMM D, h:mm a')}
                                    {t.oldEnd ? ` - ${moment(t.oldEnd).format('h:mm a')}` : ''}
                                  </span>
                                  <span className="cs-date-label-word">to</span>
                                  <span className="cs-date-new">
                                    {moment(t.newStart).format('MMM D, h:mm a')}
                                    {t.newEnd ? ` - ${moment(t.newEnd).format('h:mm a')}` : ''}
                                  </span>
                                </span>
                              ) : (
                                <span className="cs-date-old">
                                  {moment(t.oldStart ?? t.newStart).format('MMM D, h:mm a')}
                                  {(t.oldEnd ?? t.newEnd) ? ` - ${moment(t.oldEnd ?? t.newEnd).format('h:mm a')}` : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                      {msg.previewData.tasks.length > 10 && (
                        <li className="cs-preview-more">
                          ...and {msg.previewData.tasks.length - 10} more
                        </li>
                      )}
                    </ul>
                    {(() => { const prompt = extractConfirmationPrompt(msg.content); return prompt ? <div className="cs-confirm-prompt">{prompt}</div> : null; })()}
                  </div>
                )}

                {msg.queryResults && msg.queryResults.length > 0 && (
                  <div className="cs-preview">
                    <div className="cs-preview-count">
                      Found {msg.queryResults.length} task(s):
                    </div>
                    <ul className="cs-preview-list cs-query-list">
                      {msg.queryResults.map((t: QueryTaskResult, j: number) => (
                        <li key={j} className="cs-preview-item">
                          <span className="cs-item-num">{j + 1}.</span>
                          <button className="cs-task-link" onClick={() => handleQueryTaskClick(t.id)}>
                            {t.title}
                          </button>
                          <span className="cs-preview-date">
                            {t.start ? moment(t.start).format('MMM D, h:mm a') : '—'}
                            {t.end ? ` → ${moment(t.end).format('h:mm a')}` : ''}
                          </span>
                          <span className="cs-preview-status">{t.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {msg.queryResults && msg.queryResults.length === 0 && (
                  <span> No tasks found.</span>
                )}

                {msg.scheduledTasks && msg.scheduledTasks.length > 0 && (
                  <div className="cs-preview">
                    <div className="cs-preview-count">
                      {msg.scheduledTasks.length} task(s) scheduled:
                    </div>
                    <ul className="cs-preview-list cs-query-list">
                      {msg.scheduledTasks.map((t: ScheduledTaskResult, j: number) => {
                        const taskId = msg.createdTaskIds?.[j];
                        return (
                          <li key={j} className="cs-preview-item cs-preview-item--col">
                            <div className="cs-preview-row">
                              <span className="cs-item-num">{j + 1}.</span>
                              {taskId ? (
                                <button className="cs-task-link" onClick={() => handleQueryTaskClick(taskId)}>
                                  {t.title}
                                </button>
                              ) : (
                                <span className="cs-task-link cs-task-text">{t.title}</span>
                              )}
                              <span className="cs-preview-date">
                                {moment(t.start).format('MMM D, h:mm a')} → {moment(t.end).format('h:mm a')}
                                {' · '}{t.priority}
                              </span>
                            </div>
                            {t.isAllocatedOutsideRequestedTime && t.allocationNote && (
                              <div className="cs-allocation-note">{t.allocationNote}</div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {parts?.outro && <div className="cs-friendly-text">{renderMarkdown(parts.outro)}</div>}
              </div>
            </div>
          );
          })}

          {isLoading && (
            <div className="cs-message cs-message--assistant">
              <div className="cs-bubble cs-bubble--loading">
                <span className="cs-dot" /><span className="cs-dot" /><span className="cs-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Confirmation buttons */}
        {pendingConfirmation && !isLoading && (
          <div className="cs-confirm-bar">
            <button className="cs-btn cs-btn--confirm" onClick={() => handleSend(true)}>
              Yes, proceed
            </button>
            <button className="cs-btn cs-btn--cancel" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        )}

        {error && <div className="cs-error">{error}</div>}

        <div className="cs-input-area">
          <textarea
            className="cs-input"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your tasks..."
            rows={2}
          />
          <AudioInput ref={audioInputRef} onTranscriptChange={handleTranscriptChange} />
          {isLoading ? (
            <button className="cs-send-btn cs-stop-btn" onClick={handleStop}>
              Stop
            </button>
          ) : (
            <button
              className="cs-send-btn"
              onClick={() => handleSend()}
              disabled={!inputValue.trim()}
            >
              Send
            </button>
          )}
        </div>
      </div>

      {isModalOpen && fetchedTask && (
        <TaskEditModal
          isOpen={isModalOpen}
          onClose={closeModal}
          task={fetchedTask}
          onSave={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};

export default TaskAgent;
