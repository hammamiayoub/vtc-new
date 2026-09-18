/** Compare deux heures "HH:MM" ou "HH:MM:SS" (minutes depuis minuit). */
export function compareTime(time1: string, time2: string): number {
  const normalizeTime = (t: string): number => {
    const parts = t.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };
  return normalizeTime(time1) - normalizeTime(time2);
}

export function isTimeInRange(time: string, startTime: string, endTime: string): boolean {
  return compareTime(time, startTime) >= 0 && compareTime(time, endTime) <= 0;
}

export function formatScheduledSlot(scheduledDateTime: Date): {
  scheduledDate: string;
  scheduledTime: string;
} {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return {
    scheduledDate: `${scheduledDateTime.getFullYear()}-${pad2(scheduledDateTime.getMonth() + 1)}-${pad2(scheduledDateTime.getDate())}`,
    scheduledTime: `${pad2(scheduledDateTime.getHours())}:${pad2(scheduledDateTime.getMinutes())}`,
  };
}
