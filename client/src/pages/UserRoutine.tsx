import { useState, useEffect } from "react";
import { RoutineProfile, ProductiveHours, WorkStyleSettings, Constraints } from "../types/common";
import { updateUserRoutine, getUserRoutine, createUserRoutine } from "../services/userRoutineService";
import { useAuth0 } from "@auth0/auth0-react";
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

export const UserRoutine: React.FC = () => {
  const [routine, setRoutine] = useState<RoutineProfile>(defaultRoutine);
  const [loading, setLoading] = useState(false);
  const [isExistingRoutine, setIsExistingRoutine] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
  const loadUserRoutine = async () => {
    try {
      setLoading(true);
      const existingRoutine = await getUserRoutine(getAccessTokenSilently);

      if (existingRoutine) {
        setRoutine(existingRoutine);
        setIsExistingRoutine(true);
      }
      else{
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
}, [getAccessTokenSilently]);

  const handleSubmit = async () => {
    try {
        setLoading(true);

        if (isExistingRoutine) {
            const updated = await updateUserRoutine(routine, getAccessTokenSilently);
            setRoutine(updated);
        } else {
            const created = await createUserRoutine(routine, getAccessTokenSilently);
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
      workStyleSettings: {
        ...prev.workStyleSettings!,
        productiveHours: updated
      }
    }));
  };
 return (
    <div className="flex justify-start items-start px-6">
      <div className="bg-white p-6 rounded-lg w-[540px] shadow-xl">
        <h2 className="text-xl font-bold mb-4">Tell us your routine</h2>

        {/* Wake / Sleep */}
        <div className="mb-4 flex gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">
              Wake Up Time
            </label>
            <input
              type="text"
              placeholder="HH:MM or H or H:MM"
              value={routine.wakeUpTime}
              onChange={e =>{
                setRoutine(prev => ({
                  ...prev,
                  wakeUpTime: e.target.value
                }))}
              }
              onBlur={() => {
                const formatted = formatTime(routine.wakeUpTime);
                setRoutine(prev => ({
                  ...prev,
                  wakeUpTime: formatted
                }));
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">
              Sleep Time
            </label>
            <input
              type="text"
              placeholder="HH:MM or H or H:MM"
              value={routine.sleepTime}
              onChange={e =>
                setRoutine(prev => ({
                ...prev,
                sleepTime: e.target.value
                }))
              }
              onBlur={() => {
                const formatted = formatTime(routine.sleepTime);
                setRoutine(prev => ({
                  ...prev,
                  sleepTime: formatted
                }));
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>
        </div>

        {/* Work Style */}
        <h3 className="text-lg font-semibold mb-2">Work Style</h3>

        <div className="mb-4 flex gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">
              Work Start
            </label>
            <input
              type="text"
              placeholder="HH:MM or H or H:MM"
              value={routine.workStyleSettings?.workHourStart}
              onChange={e =>
                setRoutine(prev => ({
                  ...prev,
                  workStyleSettings: {
                    ...prev.workStyleSettings!,
                    workHourStart: e.target.value
                  }
                }))
              }
              onBlur={() => {
                const formatted = formatTime(routine.workStyleSettings?.workHourStart || "");
                setRoutine(prev => ({
                  ...prev,
                  workStyleSettings: {
                    ...prev.workStyleSettings!,
                    workHourStart: formatted
                  }
                }))
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">
              Work End
            </label>
            <input
              type="text"
              placeholder="HH:MM or H or H:MM"
              value={routine.workStyleSettings?.workHourEnd}
              onChange={e =>
                setRoutine(prev => ({
                  ...prev,
                  workStyleSettings: {
                    ...prev.workStyleSettings!,
                    workHourEnd: e.target.value
                  }
                }))
              }
              onBlur={() => {
                const formatted = formatTime(routine.workStyleSettings?.workHourEnd || "");
                setRoutine(prev => ({
                  ...prev,
                  workStyleSettings: {
                    ...prev.workStyleSettings!,
                    workHourEnd: formatted
                  }
                }))
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Preferred Task Duration (minutes)
          </label>
          <input
            type="number"
            value={
              routine.workStyleSettings?.preferredTaskDuration
            }
            onChange={e =>
              setRoutine(prev => ({
                ...prev,
                workStyleSettings: {
                  ...prev.workStyleSettings!,
                  preferredTaskDuration: Number(e.target.value)
                }
              }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          />
        </div>

        <h4 className="text-sm font-medium text-gray-700 mb-1">
          Productive Hours
        </h4>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {Object.values(ProductiveHours).map(hour => (
            <label key={hour} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={routine.workStyleSettings?.productiveHours?.includes(
                  hour
                )}
                onChange={() => toggleProductiveHour(hour)}
              />
              {hour}
            </label>
          ))}
        </div>

        {/* Constraints */}
        <h3 className="text-lg font-semibold mb-2">Constraints</h3>

        <div className="mb-4 flex gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">
              No Tasks Before
            </label>
            <input
              type="text"
              placeholder="HH:MM or H or H:MM"
              value={routine.constraints?.noTaskBefore}
              onChange={e =>
                setRoutine(prev => ({
                  ...prev,
                  constraints: {
                    ...prev.constraints!,
                    noTaskBefore: e.target.value
                  }
                }))
              }
              onBlur={() => {
                const formatted = formatTime(routine.constraints?.noTaskBefore || "");
                setRoutine(prev => ({
                  ...prev,
                  constraints: {
                    ...prev.constraints!,
                    noTaskBefore: formatted
                  }
                }))
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">
              No Tasks After
            </label>
            <input
              type="text"
              placeholder="HH:MM or H or H:MM"
              value={routine.constraints?.noTaskAfter}
              onChange={e =>
                setRoutine(prev => ({
                  ...prev,
                  constraints: {
                    ...prev.constraints!,
                    noTaskAfter: e.target.value
                  }
                }))
              }
              onBlur={() => {
                const formatted = formatTime(routine.constraints?.noTaskAfter || "");
                setRoutine(prev => ({
                  ...prev,
                  constraints: {
                    ...prev.constraints!,
                    noTaskAfter: formatted
                  }
                }))
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>
        </div>

        {/* Free Text */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Describe your routine
          </label>
          <textarea
            rows={3}
            value={routine.freeTextDescription}
            onChange={e =>
              setRoutine(prev => ({
                ...prev,
                freeTextDescription: e.target.value
              }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Reset
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isExistingRoutine ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserRoutine;