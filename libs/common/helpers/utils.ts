import { ProductStatusType } from '@prisma/client';
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

export function formatDate(start_date: Date, end_date: Date) {
  // Format the date as needed (e.g., yyyy-mm-dd)
  const startDate = new Date(start_date).toISOString();

  // Adjust the end date to the last millisecond of the day
  const end = new Date(end_date);
  const EOD = new Date(end.getTime() + 86400000 - 1);
  const endDate = EOD.toISOString();

  return { startDate, endDate };
}

export function mappedData(data = [], type?, sub?) {
  const dateCountMap = new Map<string, number>();

  data.forEach((value) => {
    const { _count, created_at, num } = value;
    const dateKey = new Date(created_at).toISOString().split('T')[0];

    if (dateCountMap.has(dateKey)) {
      const to_update = num ? num : value[type][sub];
      const new_value = dateCountMap.get(dateKey) + to_update;

      dateCountMap.set(dateKey, new_value);
    } else {
      dateCountMap.set(dateKey, num ? num : value[type][sub]);
    }
  });

  const result = Array.from(dateCountMap.entries()).map(([date, count]) => ({
    timeStamp: date,
    count,
  }));
  return result;
}

export function determineProductStatus(
  remainingQuantity: number,
  threshold: number,
) {
  console.log({ remainingQuantity });

  if (remainingQuantity === 0) {
    return ProductStatusType.sold_out;
  } else if (remainingQuantity > threshold) {
    return ProductStatusType.in_stock;
  } else if (remainingQuantity <= threshold) {
    return ProductStatusType.running_low;
  }
}

export function calculate_date_range(no_of_days) {
  const end_date = Date.now();
  const start_date = new Date(end_date - no_of_days * 24 * 60 * 60 * 1000);
  return { start: start_date, end: new Date(end_date) };
}
