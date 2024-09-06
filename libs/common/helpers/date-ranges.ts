import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  format,
} from 'date-fns';

export function getTimeRanges(
  timePeriod: 'day' | 'week' | 'month' | 'year' = 'year',
) {
  const now = new Date();
  let currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    labels = [];

  switch (timePeriod) {
    case 'day':
      currentStart = startOfDay(now);
      currentEnd = endOfDay(now);
      previousStart = startOfDay(subDays(now, 1));
      previousEnd = endOfDay(subDays(now, 1));
      break;

    case 'week':
      currentStart = startOfWeek(now);
      currentEnd = endOfWeek(now);
      previousStart = startOfWeek(subWeeks(now, 1));
      previousEnd = endOfWeek(subWeeks(now, 1));
      labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      break;

    case 'month':
      currentStart = startOfMonth(now);
      currentEnd = endOfMonth(now);
      previousStart = startOfMonth(subMonths(now, 1));
      previousEnd = endOfMonth(subMonths(now, 1));
      labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

      break;

    case 'year':
      currentStart = startOfYear(now);
      currentEnd = endOfYear(now);
      previousStart = startOfYear(subYears(now, 1));
      previousEnd = endOfYear(subYears(now, 1));
      labels = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];

      break;

    default:
      throw new Error(
        "Invalid time period specified. expmples: 'day' | 'week' | 'month' | 'year'",
      );
  }

  return {
    labels,
    current: {
      start: currentStart.toISOString(),
      end: currentEnd.toISOString(),
    },
    previous: {
      start: previousStart.toISOString(),
      end: previousEnd.toISOString(),
    },
  };
}

export function aggregateByTimestamp(
  data: any[],
  time_period: 'day' | 'week' | 'month' | 'year' = 'year',
  labels?: string[],
): any[] {
  let aggregatedData: { [key: string]: number } = {};
  aggregatedData = labels.length
    ? labels.reduce((acc, label) => {
        acc[label] = 0;
        return acc;
      }, {})
    : {};

  function getDateKey(date: Date): string {
    let dateKey;
    switch (time_period) {
      case 'day':
        dateKey = format(date, 'HH:mm');
        break;
      case 'month':
        const weekOfMonth = Math.ceil(date.getDate() / 7);
        dateKey = labels[weekOfMonth - 1];

        break;
      case 'week':
        dateKey = labels[date.getDay()];
        break;
      case 'year':
        dateKey = labels[date.getMonth()];
        break;
      default:
        dateKey = date.toISOString().split('T')[0];
        break;
    }
    return dateKey;
  }

  data.forEach((item) => {
    const dateKey = getDateKey(item.created_at);
    /**
     * value || amount :for data containing the value
     * else count the number of doc
     */
    aggregatedData[dateKey] += item.amount || item.value || 1;
  });

  const resultArray = Object.keys(aggregatedData).map((label) => ({
    [label]: aggregatedData[label],
  }));

  return resultArray;
}
