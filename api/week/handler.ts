import { VercelRequest, VercelResponse } from '@vercel/node';

const WDAYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'] as const;
const WEEK_NAME_JA: Record<typeof WDAYS[number], string> = {
  su: '日',
  mo: '月',
  tu: '火',
  we: '水',
  th: '木',
  fr: '金',
  sa: '土',
};

type Format = 'html' | 'csv' | 'json' | 'js' | 'ical';

type WeekEntry = {
  date: string;
  wday: number;
  num: number;
  y: number;
  m: number;
  d: number;
};

type WeekOptions = {
  year: number;
  nums: number[];
  wdays: number[];
  format: Format;
  summary?: string;
  startAt?: string;
  endAt?: string;
};

type ParsedRequest = WeekOptions & {
  num2?: string;
};

const CACHE_CONTROL_VALUE = 's-maxage=60, stale-while-revalidate';

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function normalizeArrayParam(value?: string | string[]): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseFormatFromWday(raw: string): { wday: string; format?: Format } {
  const [wday, ...rest] = raw.split('.');
  const format = rest.length > 0 ? (rest.pop() as Format) : undefined;
  return { wday, format };
}

function parseRequest(
  req: VercelRequest,
  slugSegments: string[] = [],
): ParsedRequest | { redirectTo: string; cacheControl: string } | undefined {
  const query = req.query;
  const yearParam = normalizeArrayParam(query.year);
  const numParam = normalizeArrayParam(query.num);
  const num2Param = normalizeArrayParam(query.num2);
  const wdayParam = normalizeArrayParam(query.wday);
  let formatParam = normalizeArrayParam(query.format) as Format | undefined;

  const [slugYear, slugNum, slugWdayRaw] = slugSegments;
  let yearStr = yearParam ?? slugYear;
  let numStr = numParam ?? slugNum;
  let wdayStr = wdayParam ?? slugWdayRaw;

  if (wdayStr && wdayStr.includes('.')) {
    const { wday, format } = parseFormatFromWday(wdayStr);
    wdayStr = wday;
    if (!formatParam && format && isFormat(format)) {
      formatParam = format;
    }
  }

  if (!formatParam) {
    formatParam = 'html';
  }

  if (!yearStr || !numStr || !wdayStr) {
    return undefined;
  }

  const year = Number(yearStr);
  if (!Number.isFinite(year)) {
    return undefined;
  }

  const nums = numStr
    .split(',')
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (nums.length === 0) {
    return undefined;
  }

  const wdays = wdayStr
    .split(',')
    .map((token) => WDAYS.indexOf(token as typeof WDAYS[number]))
    .filter((index) => index >= 0);

  if (wdays.length === 0) {
    return undefined;
  }

  if (!isFormat(formatParam)) {
    return undefined;
  }

  if (typeof num2Param === 'string') {
    const mergedNum = [numStr, num2Param].filter((value) => value !== '').join(',');
    const params = new URLSearchParams();
    const summary = normalizeArrayParam(query.summary);
    const startAt = normalizeArrayParam(query.start_at);
    const endAt = normalizeArrayParam(query.end_at);
    if (summary) params.set('summary', summary);
    if (startAt) params.set('start_at', startAt);
    if (endAt) params.set('end_at', endAt);
    const suffix = formatParam ? `.${formatParam}` : '';
    const querySuffix = params.toString();
    const location = `/api/week/${yearStr}/${mergedNum}/${wdayStr}${suffix}${
      querySuffix ? `?${querySuffix}` : ''
    }`;
    return { redirectTo: location, cacheControl: CACHE_CONTROL_VALUE };
  }

  return {
    year,
    nums,
    wdays,
    format: formatParam,
    summary: normalizeArrayParam(query.summary),
    startAt: normalizeArrayParam(query.start_at),
    endAt: normalizeArrayParam(query.end_at),
  };
}

function isFormat(format: string | undefined): format is Format {
  return format === 'html' || format === 'csv' || format === 'json' || format === 'js' || format === 'ical';
}

function subset(year: number, wday: number, num: number): WeekEntry[] {
  const entries: WeekEntry[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const firstDayWday = firstDay.getUTCDay();
    const offset = (wday - firstDayWday + 7) % 7;
    const day = 1 + offset + 7 * (num - 1);
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day > lastDayOfMonth) {
      continue;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    entries.push({
      date: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
      wday,
      num,
      y: date.getUTCFullYear(),
      m: date.getUTCMonth() + 1,
      d: date.getUTCDate(),
    });
  }
  return entries;
}

function weekArrayForYearAround(year: number, wdays: number[], nums: number[]): WeekEntry[] {
  const entries: WeekEntry[] = [];
  for (const wday of wdays) {
    for (const num of nums) {
      entries.push(...subset(year - 1, wday, num));
      entries.push(...subset(year, wday, num));
      entries.push(...subset(year + 1, wday, num));
    }
  }
  return entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function buildTitle(year: number, nums: number[], wdays: number[]): string {
  const delimiter = '、';
  const numText = nums.join(delimiter);
  const names = wdays.map((wday) => WEEK_NAME_JA[WDAYS[wday]]);
  const nameText = names.join(delimiter);
  return `${year}年 第${numText} ${nameText}曜日`;
}

function secondsFromTimeStr(value?: string): number {
  if (!value) return 0;
  const [hour, minute] = value.split(':');
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 * 60 + m * 60;
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function formatDateTimeForIcal(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

function buildIcal(entries: WeekEntry[], options: WeekOptions, title: string): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//cal.kbn.one//week//JA', `NAME:${title}`, `X-WR-CALNAME:${title}`];
  for (const entry of entries) {
    const baseDate = new Date(Date.UTC(entry.y, entry.m - 1, entry.d));
    const startSeconds = secondsFromTimeStr(options.startAt);
    const endSeconds = secondsFromTimeStr(options.endAt);
    const startDate = addSeconds(baseDate, startSeconds);
    const eventSummary = options.summary ?? `第${entry.num} ${WEEK_NAME_JA[WDAYS[entry.wday]]}曜日`;
    lines.push('BEGIN:VEVENT');
    lines.push(`DTSTART:${formatDateTimeForIcal(startDate)}`);
    if (options.endAt) {
      const endDate = addSeconds(baseDate, endSeconds);
      lines.push(`DTEND:${formatDateTimeForIcal(endDate)}`);
    } else {
      lines.push('DURATION:P1D');
    }
    lines.push(`SUMMARY:${eventSummary}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function buildCsv(entries: WeekEntry[]): string {
  const lines = ['date,wday,num'];
  for (const entry of entries) {
    lines.push(`${entry.date}, ${entry.wday}, ${entry.num}`);
  }
  return `${lines.join('\n')}\n`;
}

function buildJs(entries: WeekEntry[]): string {
  const json = JSON.stringify(entries);
  return `export const json = ${json};\nexport function next(hour = 9, min = 0) {\n  return json.find((j) => Date.now() < new Date(j.date).setHours(hour, min));\n}\nexport default json;\n`;
}

function buildHtml(entries: WeekEntry[], title: string): string {
  const rows = entries
    .map(
      (entry) =>
        `<tr><td>${entry.date}</td><td>${entry.num}</td><td>${WEEK_NAME_JA[WDAYS[entry.wday]]}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html><head><title>${title}</title><style>table {border: solid 1px}</style></head><body><h1>${title}</h1><p>Ctrl+A, Ctrl+C で表全体をコピーすると、スプレッドシートに貼り付けることができます。</p><table border>${rows}</table></body></html>`;
}

export async function handleWeekRequest(
  req: VercelRequest,
  res: VercelResponse,
  slugSegments: string[] = [],
): Promise<void> {
  const parsed = parseRequest(req, slugSegments);

  if (!parsed) {
    res.status(404).send("<script>console.log('error')</script>");
    return;
  }

  if ('redirectTo' in parsed) {
    res.status(302).setHeader('Cache-Control', parsed.cacheControl);
    res.setHeader('Location', parsed.redirectTo);
    res.end();
    return;
  }

  const { format, year, nums, wdays } = parsed;
  const entries = weekArrayForYearAround(year, wdays, nums);
  const title = buildTitle(year, nums, wdays);

  res.setHeader('Cache-Control', CACHE_CONTROL_VALUE);

  switch (format) {
    case 'json': {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).send(JSON.stringify(entries));
      return;
    }
    case 'js': {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).send(buildJs(entries));
      return;
    }
    case 'csv': {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(buildCsv(entries));
      return;
    }
    case 'ical': {
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.status(200).send(buildIcal(entries, parsed, title));
      return;
    }
    case 'html': {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(buildHtml(entries, title));
      return;
    }
    default: {
      res.status(404).send("<script>console.log('error')</script>");
    }
  }
}
