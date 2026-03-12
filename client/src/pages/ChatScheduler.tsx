import React, { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import { TaskStatus, ChatMessage, PreviewData, QueryTaskResult, NewTask, ScheduledTaskResult } from '../types/common';
import { sendChatMessage } from '../services/chatService';
import { createTask, getTaskById, updateTask, deleteTask } from '../services/taskService';
import TaskEditModal from '../components/TaskEditModal';
import './ChatScheduler.css';

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

const ChatScheduler = () => {
  // ── Modal state ────────────────────────────────────────────────────────────
  const [fetchedTask, setFetchedTask] = useState<NewTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PreviewData | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Chat send ──────────────────────────────────────────────────────────────
  const handleSend = async (confirmed = false) => {
    const text = inputValue.trim();
    if (!text && !confirmed) return;

    const messageText = confirmed ? '✓ Yes, proceed' : text;

    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setInputValue('');
    setPendingConfirmation(null);
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage(confirmed ? text || messageText : text, sessionId, confirmed);

      let createdTaskIds: string[] | undefined;
      if (response.messageType === 'tasks_created' && response.scheduledTasks?.length) {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const created = await Promise.all(
          (response.scheduledTasks as ScheduledTaskResult[]).map(t =>
            createTask({
              title: t.title,
              start: new Date(t.start),
              end: new Date(t.end),
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
    } catch {
      setError('Something went wrong. Please try again.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        messageType: 'error',
      }]);
    } finally {
      setIsLoading(false);
    }
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
      <div className="cs-chat-panel cs-chat-panel--full">
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
                  ? parts.intro && <span className="cs-friendly-text">{parts.intro}</span>
                  : msg.content)}

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

                {parts?.outro && <span className="cs-friendly-text">{parts.outro}</span>}
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
            disabled={isLoading}
          />
          <button
            className="cs-send-btn"
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim()}
          >
            Send
          </button>
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

export default ChatScheduler;
