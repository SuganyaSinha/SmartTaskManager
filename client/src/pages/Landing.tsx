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

const MOCK_EVENTS = [
  { top: 4,   height: 26, color: "#3b82f6", label: "Team Standup" },
  { top: 106, height: 26, color: "#22c55e", label: "Lunch Break" },
  { top: 174, height: 56, color: "#6366f1", label: "Code Review" },
];

export default function HomeLanding() {
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
            Describe your week in plain English or by voice —
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

        {/* ── App preview mockup ── */}
        <div className="hl-preview" aria-hidden="true">
          <div className="hl-preview-shell">
            {/* Sidebar */}
            <div className="hl-mock-sidebar">
              <div className="hl-mock-label">Describe your tasks</div>
              <div className="hl-mock-textarea">
                Schedule team standup tomorrow at 9am and a code review Friday at 2pm…
              </div>
              <div className="hl-mock-gen-btn">Generate Schedule</div>
              <div className="hl-mock-results">
                <div className="hl-mock-result-item">
                  <span className="hl-mock-dot" style={{ background: "#3b82f6" }} />
                  <div>
                    <div className="hl-mock-task-name">Team Standup</div>
                    <div className="hl-mock-task-time">Tomorrow, 9:00–9:30 am</div>
                  </div>
                </div>
                <div className="hl-mock-result-item">
                  <span className="hl-mock-dot" style={{ background: "#6366f1" }} />
                  <div>
                    <div className="hl-mock-task-name">Code Review</div>
                    <div className="hl-mock-task-time">Friday, 2:00–3:30 pm</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="hl-mock-cal">
              <div className="hl-mock-cal-header">
                <span className="hl-mock-cal-title">March 2026</span>
                <div className="hl-mock-cal-tabs">
                  <span>Month</span>
                  <span className="hl-mock-cal-tab-active">Week</span>
                  <span>Day</span>
                </div>
              </div>
              <div className="hl-mock-cal-body">
                {["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm"].map((t) => (
                  <div key={t} className="hl-mock-time-row">
                    <span className="hl-mock-time-lbl">{t}</span>
                    <div className="hl-mock-time-line" />
                  </div>
                ))}
                {MOCK_EVENTS.map(({ top, height, color, label }) => (
                  <div
                    key={label}
                    className="hl-mock-event"
                    style={{ top, height, background: color }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
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
