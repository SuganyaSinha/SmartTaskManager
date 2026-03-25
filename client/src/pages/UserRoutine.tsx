import { useState, useEffect } from "react";
import { RoutineProfile, ProductiveHours } from "../types/common";
import { updateUserRoutine, getUserRoutine, createUserRoutine } from "../services/userRoutineService";
import { formatTime } from "../utilities/timeFormatter";

const defaultRoutine: RoutineProfile = {
  id: "",
  wakeUpTime: "",
  sleepTime: "",
  freeTextDescription: "",
  workStyleSettings: {
    workHourStart: "",
    workHourEnd: "",
    preferredTaskDuration: 0,
    productiveHours: []
  },
  constraints: {
    noTaskBefore: "",
    noTaskAfter: ""
  }
};

const inputClass =
  "w-full bg-[#f8fafc] border-[1.5px] border-[#e2e8f0] rounded-[10px] px-3 py-2.5 text-sm text-[#334155] placeholder-[#cbd5e1] focus:outline-none focus:border-blue-400 focus:ring-[3px] focus:ring-blue-100 transition-all";

const labelClass =
  "block text-[0.7rem] font-bold uppercase tracking-[0.07em] text-[#475569] mb-1.5";

const sectionTitleClass =
  "text-[0.7rem] font-bold uppercase tracking-[0.07em] text-[#475569] pb-2 mb-3 border-b border-[#f1f5f9]";

export const UserRoutine: React.FC = () => {
  const [routine, setRoutine] = useState<RoutineProfile>(defaultRoutine);
  const [loading, setLoading] = useState(false);
  const [isExistingRoutine, setIsExistingRoutine] = useState(false);

  useEffect(() => {
    const loadUserRoutine = async () => {
      try {
        setLoading(true);
        const existingRoutine = await getUserRoutine();
        if (existingRoutine) {
          setRoutine(existingRoutine);
          setIsExistingRoutine(true);
        } else {
          setRoutine(defaultRoutine);
          setIsExistingRoutine(false);
        }
      } catch (err) {
        console.error("Failed to load user routine", err);
      } finally {
        setLoading(false);
      }
    };
    loadUserRoutine();
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (isExistingRoutine) {
        const updated = await updateUserRoutine(routine);
        setRoutine(updated);
      } else {
        const created = await createUserRoutine(routine);
        setRoutine(created);
        setIsExistingRoutine(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setRoutine(defaultRoutine);
  };

  const toggleProductiveHour = (hour: ProductiveHours) => {
    const current = routine.workStyleSettings?.productiveHours ?? [];
    const updated = current.includes(hour)
      ? current.filter(h => h !== hour)
      : [...current, hour];
    setRoutine(prev => ({
      ...prev,
      workStyleSettings: { ...prev.workStyleSettings!, productiveHours: updated }
    }));
  };

  if (loading) {
    return (
      <div className="tcv-root" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <svg className="tcv-spinner" viewBox="0 0 24 24" fill="none" style={{ width: 28, height: 28, color: "#93c5fd" }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 50" />
          </svg>
          <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 500 }}>Loading your routine…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tcv-root">

      {/* ── Left Sidebar ── */}
      <aside className="tcv-sidebar">

        <div className="tcv-sidebar-header">
          <span className="tcv-sidebar-title">My Routine</span>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>
            Help us understand your schedule so we can plan tasks better.
          </p>
        </div>

        {/* Daily Schedule */}
        <div>
          <div className={sectionTitleClass}>Daily Schedule</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className={labelClass}>Wake Up</label>
              <input
                type="text"
                placeholder="HH:MM"
                value={routine.wakeUpTime}
                onChange={e => setRoutine(prev => ({ ...prev, wakeUpTime: e.target.value }))}
                onBlur={() => {
                  const formatted = formatTime(routine.wakeUpTime);
                  setRoutine(prev => ({ ...prev, wakeUpTime: formatted }));
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Sleep</label>
              <input
                type="text"
                placeholder="HH:MM"
                value={routine.sleepTime}
                onChange={e => setRoutine(prev => ({ ...prev, sleepTime: e.target.value }))}
                onBlur={() => {
                  const formatted = formatTime(routine.sleepTime);
                  setRoutine(prev => ({ ...prev, sleepTime: formatted }));
                }}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Work Hours */}
        <div>
          <div className={sectionTitleClass}>Work Hours</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className={labelClass}>Start</label>
              <input
                type="text"
                placeholder="HH:MM"
                value={routine.workStyleSettings?.workHourStart}
                onChange={e =>
                  setRoutine(prev => ({
                    ...prev,
                    workStyleSettings: { ...prev.workStyleSettings!, workHourStart: e.target.value }
                  }))
                }
                onBlur={() => {
                  const formatted = formatTime(routine.workStyleSettings?.workHourStart || "");
                  setRoutine(prev => ({
                    ...prev,
                    workStyleSettings: { ...prev.workStyleSettings!, workHourStart: formatted }
                  }));
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>End</label>
              <input
                type="text"
                placeholder="HH:MM"
                value={routine.workStyleSettings?.workHourEnd}
                onChange={e =>
                  setRoutine(prev => ({
                    ...prev,
                    workStyleSettings: { ...prev.workStyleSettings!, workHourEnd: e.target.value }
                  }))
                }
                onBlur={() => {
                  const formatted = formatTime(routine.workStyleSettings?.workHourEnd || "");
                  setRoutine(prev => ({
                    ...prev,
                    workStyleSettings: { ...prev.workStyleSettings!, workHourEnd: formatted }
                  }));
                }}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Constraints */}
        <div>
          <div className={sectionTitleClass}>Constraints</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className={labelClass}>No Tasks Before</label>
              <input
                type="text"
                placeholder="HH:MM"
                value={routine.constraints?.noTaskBefore}
                onChange={e =>
                  setRoutine(prev => ({
                    ...prev,
                    constraints: { ...prev.constraints!, noTaskBefore: e.target.value }
                  }))
                }
                onBlur={() => {
                  const formatted = formatTime(routine.constraints?.noTaskBefore || "");
                  setRoutine(prev => ({
                    ...prev,
                    constraints: { ...prev.constraints!, noTaskBefore: formatted }
                  }));
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>No Tasks After</label>
              <input
                type="text"
                placeholder="HH:MM"
                value={routine.constraints?.noTaskAfter}
                onChange={e =>
                  setRoutine(prev => ({
                    ...prev,
                    constraints: { ...prev.constraints!, noTaskAfter: e.target.value }
                  }))
                }
                onBlur={() => {
                  const formatted = formatTime(routine.constraints?.noTaskAfter || "");
                  setRoutine(prev => ({
                    ...prev,
                    constraints: { ...prev.constraints!, noTaskAfter: formatted }
                  }));
                }}
                className={inputClass}
              />
            </div>
          </div>
        </div>

      </aside>

      {/* ── Main Panel ── */}
      <main className="tcv-main" style={{ overflowY: "auto" }}>

        {/* Work Style card */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 mb-4">
          <div className={sectionTitleClass}>Work Style</div>

          <div className="mb-4">
            <label className={labelClass}>Preferred Task Duration (minutes)</label>
            <input
              type="number"
              value={routine.workStyleSettings?.preferredTaskDuration}
              onChange={e =>
                setRoutine(prev => ({
                  ...prev,
                  workStyleSettings: {
                    ...prev.workStyleSettings!,
                    preferredTaskDuration: Number(e.target.value)
                  }
                }))
              }
              className={`${inputClass} max-w-xs`}
            />
          </div>

          <div>
            <label className={labelClass}>Productive Hours</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(ProductiveHours).map(hour => {
                const isSelected = routine.workStyleSettings?.productiveHours?.includes(hour);
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => toggleProductiveHour(hour)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-[1.5px] cursor-pointer ${
                      isSelected
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-[#f8fafc] border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1] hover:bg-white"
                    }`}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* About card */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 mb-4">
          <div className={sectionTitleClass}>About Your Routine</div>
          <textarea
            rows={5}
            placeholder="Describe your daily routine in your own words…"
            value={routine.freeTextDescription}
            onChange={e =>
              setRoutine(prev => ({ ...prev, freeTextDescription: e.target.value }))
            }
            className={`${inputClass} resize-vertical`}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-semibold text-[#475569] bg-[#f1f5f9] hover:bg-[#e2e8f0] rounded-[10px] border border-[#e2e8f0] transition-all cursor-pointer"
          >
            Reset
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="tcv-btn-generate"
            style={{ width: "auto", padding: "9px 20px" }}
          >
            {isExistingRoutine ? "Update" : "Save"}
          </button>
        </div>

      </main>
    </div>
  );
};

export default UserRoutine;
