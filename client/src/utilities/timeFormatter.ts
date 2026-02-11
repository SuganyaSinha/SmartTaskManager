/**
 * Formats a time string to HH:MM format required by HTML5 time input
 * @param time - Time string in any format (e.g., "8", "8:30", "08:30")
 * @returns Formatted time string "HH:MM" or empty string
 */
export const formatTime = (time: string | undefined): string => {
  if (!time || time.trim() === "") {
    return "";
  }

  // Remove any whitespace
  time = time.trim();

  // If already in HH:MM format, return as is
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time;
  }

  // Split by colon
  const parts = time.split(":");

  if (parts.length === 1) {
    // Only hour provided
    const hour = parseInt(parts[0], 10);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      return "";
    }
    return `${String(hour).padStart(2, "0")}:00`;
  }

  if (parts.length === 2) {
    // Hour and minute provided
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return "";
    }

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  return "";
};
