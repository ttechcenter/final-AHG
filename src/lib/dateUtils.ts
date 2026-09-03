/**
 * Get the Monday of the week for any given date
 * Week is Monday (start) to Sunday (end)
 */
export function getMondayOfWeek(date: Date | string): string {
  // Handle both Date objects and date strings
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : new Date(date);

  // Get the day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = d.getDay();

  // Calculate days to subtract to get to Monday
  // Sunday (0) needs to go back 6 days, Monday (1) stays, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Set to Monday
  d.setDate(d.getDate() - daysToMonday);

  return d.toISOString().split('T')[0];
}

/**
 * Get the Sunday (end of week) for a given week start (Monday)
 * Week is Monday to Sunday (7 days)
 */
export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + 6); // Monday + 6 days = Sunday
  return d.toISOString().split('T')[0];
}

/**
 * Add or subtract weeks from a date string
 */
export function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
}

/**
 * Format week label as "Mon DD - Sun DD, YYYY"
 * Week is Monday to Sunday
 */
export function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekStart + 'T00:00:00');
  end.setDate(end.getDate() + 6); // Monday to Sunday

  const startOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const endOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

  const startStr = start.toLocaleDateString('en-US', startOpts);
  const endStr = end.toLocaleDateString('en-US', endOpts);

  return `${startStr} - ${endStr}`;
}

/**
 * Format week range for file names
 */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekStart + 'T00:00:00');
  end.setDate(end.getDate() + 6); // Monday to Sunday

  const monthYear = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  return `Week_of_${startDay}-${endDay}_${monthYear.replace(' ', '_')}`;
}

/**
 * Get all week start dates (Mondays) that fall within or overlap with a given month
 */
export function getWeekStartsInMonth(year: number, month: number): string[] {
  const weeks: string[] = [];

  // First day of the month
  const firstDay = new Date(year, month - 1, 1);
  // Last day of the month
  const lastDay = new Date(year, month, 0);

  // Find the Monday of the week that contains the first day of the month
  let current = new Date(firstDay);
  const firstDayOfWeek = current.getDay();
  const daysToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
  current.setDate(current.getDate() + daysToMonday);

  // Iterate through all weeks that overlap with this month
  while (current <= lastDay) {
    const weekStart = current.toISOString().split('T')[0];

    // Check if the Sunday of this week is within the month or the Monday is within the month
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Add if any part of the week overlaps with the month
    if (current.getMonth() === month - 1 || weekEnd.getMonth() === month - 1) {
      weeks.push(weekStart);
    }

    // Move to next Monday
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

/**
 * Get month label (e.g., "June 2024")
 */
export function getMonthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Add months to a year/month combination
 */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Get current week's Monday
 */
export function getCurrentWeek(): string {
  return getMondayOfWeek(new Date());
}

/**
 * Get current year and month
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Get all dates in a work week (Monday to Saturday - 6 days for planning)
 * Note: Sunday is typically rest day, so work week is Mon-Sat
 */
export function getWorkWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const d = new Date(weekStart + 'T00:00:00');
  // Monday to Saturday (6 working days)
  for (let i = 0; i < 6; i++) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/**
 * Get month start and end dates
 */
export function getMonthDateRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Format date as readable string
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Get the Saturday (end of work week) for sales calculations
 * Work week is Monday-Saturday
 */
export function getWorkWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + 5); // Monday + 5 days = Saturday
  return d.toISOString().split('T')[0];
}
