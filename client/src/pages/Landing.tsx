import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "./Landing.css";

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
    title: "Voice Input",
    desc: "Speak your tasks naturally. SmartTask transcribes and understands instantly — no typing required.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "AI Scheduling",
    desc: "AI slots your tasks into your calendar, respecting your routine, priorities, and working hours.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Smart Overview",
    desc: "Track overdue items, upcoming deadlines, and completion stats across all your tasks at a glance.",
  },
];

const MOCK_STATUS_SEGMENTS = [
  { label: "Not Started", color: "#f59e0b", width: 25 },
  { label: "In Progress", color: "#3b82f6", width: 30 },
  { label: "Completed", color: "#22c55e", width: 35 },
  { label: "Blocked", color: "#ef4444", width: 10 },
];

const MOCK_UPCOMING = [
  { color: "#3b82f6", title: "Team Standup" },
  { color: "#6366f1", title: "Code Review" },
];

const MOCK_OVERDUE = [{ color: "#ef4444", title: "Submit Report" }];

const MOCK_TODAY = [
  { time: "9:00 am", title: "Team Standup" },
  { time: "2:00 pm", title: "Code Review" },
];

const MOCK_AGENT_SESSIONS = [
  { title: "Weekly Planning", active: true },
  { title: "Reschedule Requests", active: false },
  { title: "Task Cleanup", active: false },
];

const MOCK_AGENT_MESSAGES: { role: "user" | "assistant"; content: string }[] = [
  { role: "user", content: "Schedule yoga on Wednesday at 5pm" },
  { role: "assistant", content: "Done! I've added Yoga for Wed, 5:00–6:00 pm." },
  { role: "user", content: "Show me all tasks this week" },
  { role: "assistant", content: "Found 3 tasks this week — want me to reschedule any?" },
];

const MOCK_CAL_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MOCK_CAL_EVENTS: Record<number, { label: string; color: string }[]> = {
  3: [{ label: "Standup", color: "#3b82f6" }],
  9: [{ label: "Sprint Planning", color: "#f59e0b" }],
  12: [{ label: "Design Review", color: "#22c55e" }],
  17: [{ label: "Code Review", color: "#3b82f6" }, { label: "1:1 Sync", color: "#22c55e" }],
  24: [{ label: "Deadline", color: "#ef4444" }],
};

const MOCK_CAL_LEAD_BLANKS = 3;
const MOCK_CAL_DAYS_IN_MONTH = 30;
const MOCK_CAL_CELLS = Array.from({ length: 35 }, (_, i) => {
  const day = i - MOCK_CAL_LEAD_BLANKS + 1;
  return day >= 1 && day <= MOCK_CAL_DAYS_IN_MONTH ? day : null;
});

export default function HomeLanding() {
  const [activePreview, setActivePreview] = useState<"dashboard" | "agent" | "calendar">("dashboard");
  const { loginWithRedirect } = useAuth0();

  const handleSignUp = () =>
    loginWithRedirect({ authorizationParams: { screen_hint: "signup" } });

  const handleLogin = () => loginWithRedirect();

  return (
    <div className="hl-root">
      {/* Ambient background orbs */}
      <div className="hl-orb hl-orb-1" />
      <div className="hl-orb hl-orb-2" />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="hl-hero">
        <div className="hl-hero-copy">
          <div className="hl-eyebrow">AI-Powered Task Management</div>

          <h1 className="hl-headline">
            Plan smarter.<br />
            <em className="hl-headline-accent">Speak</em> your tasks.<br />
            Let AI schedule&nbsp;them.
          </h1>

          <p className="hl-subhead">
            Describe your tasks in plain English or by voice —
            SmartTask automatically builds your calendar and keeps you on track.
          </p>

          <div className="hl-cta-row">
            <button className="hl-btn-primary" onClick={handleSignUp}>
              Get Started Free
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button className="hl-btn-secondary" onClick={handleLogin}>
              Log In
            </button>
          </div>
        </div>

        {/* ── App preview mockup (mirrors the live app) ── */}
        <div className="hl-preview">
          <div className="hl-preview-tabs" role="tablist" aria-label="App preview">
            <button
              type="button"
              role="tab"
              aria-selected={activePreview === "dashboard"}
              className={`hl-preview-tab${activePreview === "dashboard" ? " hl-preview-tab--active" : ""}`}
              onClick={() => setActivePreview("dashboard")}
            >
              Dashboard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activePreview === "agent"}
              className={`hl-preview-tab${activePreview === "agent" ? " hl-preview-tab--active" : ""}`}
              onClick={() => setActivePreview("agent")}
            >
              Task Agent
              <span className="hl-preview-tab-badge">AI</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activePreview === "calendar"}
              className={`hl-preview-tab${activePreview === "calendar" ? " hl-preview-tab--active" : ""}`}
              onClick={() => setActivePreview("calendar")}
            >
              Calendar
            </button>
          </div>

          <div className="hl-preview-shell" aria-hidden="true">
            {activePreview === "dashboard" ? (
              <>
                {/* Main stage */}
                <div className="hl-mock-main">
                  <div className="hl-mock-ai-snapshot">
                    <div className="hl-mock-ai-mark">AI</div>
                    <div className="hl-mock-ai-copy">
                      <span className="hl-mock-kicker">AI Snapshot</span>
                      <strong>3 tasks need attention before 5pm</strong>
                    </div>
                  </div>

                  <div className="hl-mock-strip">
                    <div className="hl-mock-ring">
                      <svg viewBox="0 0 36 36">
                        <circle className="hl-mock-ring-track" cx="18" cy="18" r="15.5" pathLength="100" />
                        <circle className="hl-mock-ring-progress" cx="18" cy="18" r="15.5" pathLength="100" />
                      </svg>
                      <span>72%</span>
                    </div>
                    <div className="hl-mock-bar-col">
                      <span className="hl-mock-label">Task Distribution</span>
                      <div className="hl-mock-bar">
                        {MOCK_STATUS_SEGMENTS.map(({ label, color, width }) => (
                          <span key={label} style={{ width: `${width}%`, background: color }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="hl-mock-lists">
                    <div className="hl-mock-list">
                      <div className="hl-mock-list-head hl-mock-list-head--blue">
                        Upcoming <em>{MOCK_UPCOMING.length}</em>
                      </div>
                      {MOCK_UPCOMING.map(({ color, title }) => (
                        <div key={title} className="hl-mock-task-row">
                          <i style={{ background: color }} />
                          <span>{title}</span>
                        </div>
                      ))}
                    </div>
                    <div className="hl-mock-list">
                      <div className="hl-mock-list-head hl-mock-list-head--red">
                        Overdue <em>{MOCK_OVERDUE.length}</em>
                      </div>
                      {MOCK_OVERDUE.map(({ color, title }) => (
                        <div key={title} className="hl-mock-task-row">
                          <i style={{ background: color }} />
                          <span>{title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Insight rail */}
                <div className="hl-mock-rail">
                  <div className="hl-mock-focus">
                    <span className="hl-mock-kicker">Today</span>
                    <strong>{MOCK_TODAY.length}</strong>
                    <p>tasks scheduled</p>
                  </div>
                  <div className="hl-mock-todo">
                    <h4>To Do Today</h4>
                    {MOCK_TODAY.map(({ time, title }) => (
                      <div key={title} className="hl-mock-todo-item">
                        <span>{time}</span>
                        <strong>{title}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : activePreview === "agent" ? (
              <>
                {/* Session sidebar */}
                <div className="hl-mock-agent-sidebar">
                  <div className="hl-mock-agent-new-chat">+ New Chat</div>
                  {MOCK_AGENT_SESSIONS.map(({ title, active }) => (
                    <div
                      key={title}
                      className={`hl-mock-agent-session${active ? " hl-mock-agent-session--active" : ""}`}
                    >
                      {title}
                    </div>
                  ))}
                </div>

                {/* Chat panel */}
                <div className="hl-mock-agent-chat">
                  <div className="hl-mock-agent-header">
                    <span>Task Assistant</span>
                    <span className="hl-mock-agent-hint">Ask me to move, update, query, or create tasks</span>
                  </div>
                  <div className="hl-mock-agent-messages">
                    {MOCK_AGENT_MESSAGES.map(({ role, content }, i) => (
                      <div key={i} className={`hl-mock-agent-bubble hl-mock-agent-bubble--${role}`}>
                        {content}
                      </div>
                    ))}
                  </div>
                  <div className="hl-mock-agent-input">
                    <span>Ask me anything about your tasks...</span>
                    <span className="hl-mock-agent-send">Send</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="hl-mock-cal2">
                <div className="hl-mock-cal2-toolbar">
                  <div className="hl-mock-cal2-nav">
                    <span>‹</span>
                    <span>›</span>
                    <span className="hl-mock-cal2-today">Today</span>
                  </div>
                  <div className="hl-mock-cal2-title">March 2026</div>
                  <div className="hl-mock-cal2-views">
                    <span className="hl-mock-cal2-view--active">Month</span>
                    <span>Week</span>
                    <span>Day</span>
                  </div>
                </div>

                <div className="hl-mock-cal2-grid">
                  {MOCK_CAL_WEEKDAYS.map((d) => (
                    <div key={d} className="hl-mock-cal2-weekday">{d}</div>
                  ))}
                  {MOCK_CAL_CELLS.map((day, i) => (
                    <div key={i} className={`hl-mock-cal2-cell${day === null ? " hl-mock-cal2-cell--blank" : ""}`}>
                      {day !== null && (
                        <>
                          <span className="hl-mock-cal2-daynum">{day}</span>
                          {(MOCK_CAL_EVENTS[day] ?? []).slice(0, 2).map(({ label, color }) => (
                            <span key={label} className="hl-mock-cal2-event" style={{ background: color }}>
                              {label}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="hl-features">
        <div className="hl-features-grid">
          {FEATURES.map(({ icon, title, desc }, i) => (
            <div
              key={title}
              className="hl-feature-card"
              style={{ animationDelay: `${0.15 + i * 0.1}s` }}
            >
              <div className="hl-feature-icon">{icon}</div>
              <h3 className="hl-feature-title">{title}</h3>
              <p className="hl-feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="hl-how">
        <h2 className="hl-section-heading">How it works</h2>
        <div className="hl-steps">
          {[
            { n: "1", label: "Describe", text: "Type or speak your tasks in plain English." },
            { n: "2", label: "Schedule", text: "AI generates an optimised calendar schedule." },
            { n: "3", label: "Done",     text: "Track, edit, and stay on top of everything." },
          ].map(({ n, label, text }, i) => (
            <div
              key={n}
              className="hl-step"
              style={{ animationDelay: `${0.1 + i * 0.15}s` }}
            >
              <div className="hl-step-num">{n}</div>
              <div className="hl-step-label">{label}</div>
              <p className="hl-step-text">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────── */}
      <section className="hl-bottom">
        <h2 className="hl-bottom-heading">
          Ready to take control of your schedule?
        </h2>
        <div className="hl-cta-row">
          <button className="hl-btn-primary" onClick={handleSignUp}>
            Create Free Account
          </button>
          <button className="hl-btn-secondary" onClick={handleLogin}>
            Already a member? Log In
          </button>
        </div>
      </section>
    </div>
  );
}
