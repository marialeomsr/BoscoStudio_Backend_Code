/**
 * Single source of truth for status colours. Badges, the calendar, the orders list and the home page
 * all read from here, so a status looks the same everywhere. Change a colour once, it changes app-wide.
 */
export const STATUS_COLORS: Record<string, string> = {
  // order lifecycle
  'Pre-Order': '#78909c',
  'Pending': '#f57c00',
  'Confirmed': '#1976d2',
  'Shoot Completed': '#00897b',
  'In Post-Production': '#8e24aa',
  'Delivered': '#388e3c',
  'Cancelled': '#c62828',
  // deliverable checklist
  'Not Started': '#78909c',
  'In Progress': '#f57c00',
  'Completed': '#388e3c',
};

export const statusColor = (status: string): string => STATUS_COLORS[status] ?? '#78909c';
