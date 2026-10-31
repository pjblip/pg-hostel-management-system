/**
 * Computes exact duration between start date and current date (or reference date)
 * Returns formatted string like "2 Years, 3 Months"
 */
export function computeStayDuration(
  startDateStr: string,
  referenceDateStr?: string
): { years: number; months: number; days: number; text: string } {
  const start = new Date(startDateStr);
  const end = referenceDateStr ? new Date(referenceDateStr) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { years: 0, months: 0, days: 0, text: 'N/A' };
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // get days in previous month
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Build clean text
  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'Year' : 'Years'}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'Month' : 'Months'}`);
  }
  if (years === 0 && months === 0) {
    parts.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);
  }

  const text = parts.length > 0 ? parts.join(', ') : '0 Days';

  return { years, months, days, text };
}

/**
 * Format Indian Rupee currency with standard Indian commas
 * e.g. 9500 -> "₹9,500"
 */
export function formatINR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats YYYY-MM-DD into human readable date: e.g. "June 15, 2024"
 */
export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
