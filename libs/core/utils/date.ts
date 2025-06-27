// Date utilities for the multitenant application

export type DateInput = string | number | Date;

// Format date to ISO string
export function toISOString(date: DateInput): string {
  return new Date(date).toISOString();
}

// Format date for display
export function formatDate(
  date: DateInput, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  return new Date(date).toLocaleDateString(undefined, {
    ...defaultOptions,
    ...options,
  });
}

// Format date and time for display
export function formatDateTime(
  date: DateInput,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return new Date(date).toLocaleString(undefined, {
    ...defaultOptions,
    ...options,
  });
}

// Format time for display
export function formatTime(
  date: DateInput,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return new Date(date).toLocaleTimeString(undefined, {
    ...defaultOptions,
    ...options,
  });
}

// Get relative time (e.g., "2 hours ago", "in 3 days")
export function getRelativeTime(date: DateInput): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInMs = targetDate.getTime() - now.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffInMinutes) < 1) {
    return 'just now';
  } else if (Math.abs(diffInMinutes) < 60) {
    return diffInMinutes > 0 
      ? `in ${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'}`
      : `${Math.abs(diffInMinutes)} minute${Math.abs(diffInMinutes) === 1 ? '' : 's'} ago`;
  } else if (Math.abs(diffInHours) < 24) {
    return diffInHours > 0
      ? `in ${diffInHours} hour${diffInHours === 1 ? '' : 's'}`
      : `${Math.abs(diffInHours)} hour${Math.abs(diffInHours) === 1 ? '' : 's'} ago`;
  } else if (Math.abs(diffInDays) < 7) {
    return diffInDays > 0
      ? `in ${diffInDays} day${diffInDays === 1 ? '' : 's'}`
      : `${Math.abs(diffInDays)} day${Math.abs(diffInDays) === 1 ? '' : 's'} ago`;
  } else {
    return formatDate(date);
  }
}

// Check if date is valid
export function isValidDate(date: DateInput): boolean {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

// Add time to date
export function addTime(
  date: DateInput,
  amount: number,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): Date {
  const result = new Date(date);
  
  switch (unit) {
    case 'milliseconds':
      result.setMilliseconds(result.getMilliseconds() + amount);
      break;
    case 'seconds':
      result.setSeconds(result.getSeconds() + amount);
      break;
    case 'minutes':
      result.setMinutes(result.getMinutes() + amount);
      break;
    case 'hours':
      result.setHours(result.getHours() + amount);
      break;
    case 'days':
      result.setDate(result.getDate() + amount);
      break;
    case 'weeks':
      result.setDate(result.getDate() + (amount * 7));
      break;
    case 'months':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'years':
      result.setFullYear(result.getFullYear() + amount);
      break;
  }
  
  return result;
}

// Subtract time from date
export function subtractTime(
  date: DateInput,
  amount: number,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): Date {
  return addTime(date, -amount, unit);
}

// Get start of day
export function startOfDay(date: DateInput): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

// Get end of day
export function endOfDay(date: DateInput): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

// Get start of week (Monday)
export function startOfWeek(date: DateInput): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  return startOfDay(result);
}

// Get end of week (Sunday)
export function endOfWeek(date: DateInput): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  return endOfDay(result);
}

// Get start of month
export function startOfMonth(date: DateInput): Date {
  const result = new Date(date);
  result.setDate(1);
  return startOfDay(result);
}

// Get end of month
export function endOfMonth(date: DateInput): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  return endOfDay(result);
}

// Get start of year
export function startOfYear(date: DateInput): Date {
  const result = new Date(date);
  result.setMonth(0, 1);
  return startOfDay(result);
}

// Get end of year
export function endOfYear(date: DateInput): Date {
  const result = new Date(date);
  result.setMonth(11, 31);
  return endOfDay(result);
}

// Check if two dates are on the same day
export function isSameDay(date1: DateInput, date2: DateInput): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

// Check if date is today
export function isToday(date: DateInput): boolean {
  return isSameDay(date, new Date());
}

// Check if date is yesterday
export function isYesterday(date: DateInput): boolean {
  const yesterday = subtractTime(new Date(), 1, 'days');
  return isSameDay(date, yesterday);
}

// Check if date is tomorrow
export function isTomorrow(date: DateInput): boolean {
  const tomorrow = addTime(new Date(), 1, 'days');
  return isSameDay(date, tomorrow);
}

// Get difference between two dates
export function getDateDifference(
  date1: DateInput,
  date2: DateInput,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' = 'milliseconds'
): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffInMs = d1.getTime() - d2.getTime();
  
  switch (unit) {
    case 'milliseconds':
      return diffInMs;
    case 'seconds':
      return Math.floor(diffInMs / 1000);
    case 'minutes':
      return Math.floor(diffInMs / (1000 * 60));
    case 'hours':
      return Math.floor(diffInMs / (1000 * 60 * 60));
    case 'days':
      return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    default:
      return diffInMs;
  }
}

// Get age from birth date
export function getAge(birthDate: DateInput): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

// Format duration in milliseconds to human readable
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Parse date with timezone
export function parseWithTimezone(dateString: string, timezone?: string): Date {
  if (timezone) {
    // This is a simplified approach - in production, consider using a library like date-fns-tz
    return new Date(dateString + (timezone.startsWith('+') || timezone.startsWith('-') ? timezone : ''));
  }
  return new Date(dateString);
}

// Get current timestamp
export function getCurrentTimestamp(): number {
  return Date.now();
}

// Convert timestamp to date
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp);
}

// Get timezone offset in minutes
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

// Get timezone name
export function getTimezoneName(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Date range utilities
export interface DateRange {
  start: Date;
  end: Date;
}

export function createDateRange(start: DateInput, end: DateInput): DateRange {
  return {
    start: new Date(start),
    end: new Date(end),
  };
}

export function isDateInRange(date: DateInput, range: DateRange): boolean {
  const d = new Date(date);
  return d >= range.start && d <= range.end;
}

export function getDateRangeDuration(range: DateRange): number {
  return range.end.getTime() - range.start.getTime();
}

// Predefined date ranges
export function getDateRanges() {
  const now = new Date();
  
  return {
    today: createDateRange(startOfDay(now), endOfDay(now)),
    yesterday: createDateRange(
      startOfDay(subtractTime(now, 1, 'days')),
      endOfDay(subtractTime(now, 1, 'days'))
    ),
    thisWeek: createDateRange(startOfWeek(now), endOfWeek(now)),
    lastWeek: createDateRange(
      startOfWeek(subtractTime(now, 1, 'weeks')),
      endOfWeek(subtractTime(now, 1, 'weeks'))
    ),
    thisMonth: createDateRange(startOfMonth(now), endOfMonth(now)),
    lastMonth: createDateRange(
      startOfMonth(subtractTime(now, 1, 'months')),
      endOfMonth(subtractTime(now, 1, 'months'))
    ),
    thisYear: createDateRange(startOfYear(now), endOfYear(now)),
    lastYear: createDateRange(
      startOfYear(subtractTime(now, 1, 'years')),
      endOfYear(subtractTime(now, 1, 'years'))
    ),
    last7Days: createDateRange(
      startOfDay(subtractTime(now, 7, 'days')),
      endOfDay(now)
    ),
    last30Days: createDateRange(
      startOfDay(subtractTime(now, 30, 'days')),
      endOfDay(now)
    ),
    last90Days: createDateRange(
      startOfDay(subtractTime(now, 90, 'days')),
      endOfDay(now)
    ),
  };
} 