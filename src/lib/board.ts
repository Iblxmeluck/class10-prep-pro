/**
 * CBSE Class 10 board exam start date (India time).
 * Change this single value to update the countdown everywhere.
 */
export const BOARD_EXAM_DATE = new Date("2027-02-15T10:30:00+05:30");

export function boardCountdown(now: Date = new Date()) {
  const ms = Math.max(0, BOARD_EXAM_DATE.getTime() - now.getTime());
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    past: ms === 0,
  };
}
