/**
 * Extract date parts (internally shared)
 */
function getDateParts(date: Date): { year: number; month: string; day: string } {
  return {
    year: date.getFullYear(),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
  };
}

/**
 * Generate unique ID, format: YYYYMMDD-xxxx
 */
export function generateId(date: Date = new Date()): string {
  const { year, month, day } = getDateParts(date);
  const randomPart = Math.random().toString(36).substring(2, 6);
  return `${year}${month}${day}-${randomPart}`;
}

/**
 * Format date as YYYY-MM-DD (local timezone)
 */
export function formatDate(date: Date = new Date()): string {
  const { year, month, day } = getDateParts(date);
  return `${year}-${month}-${day}`;
}

/**
 * Format date-time as YYYY-MM-DD HH:mm:ss (for capturedAt)
 */
export function formatDateTime(date: Date = new Date()): string {
  const datePart = formatDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}:${seconds}`;
}
