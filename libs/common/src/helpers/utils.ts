import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export function getLastMonthDateRange() {
  const currentDate = new Date();
  const firstDayOfCurrentMonth = startOfMonth(currentDate);
  const firstDayOfLastMonth = subMonths(firstDayOfCurrentMonth, 1);
  const lastDayOfLastMonth = endOfMonth(subMonths(currentDate, 1));
  return { firstDayOfLastMonth, lastDayOfLastMonth };
}

export function calculatePercentageChange(
  currValue: number,
  prevValue: number,
): number {
  return prevValue !== 0 ? ((currValue - prevValue) / prevValue) * 100 : 0;
}
