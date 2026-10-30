export interface LocalTimeCheckResult {
  isWithinSendingWindow: boolean;
  localHour: number;
  localMinute: number;
  localDayOfWeek: string;
  timeZone: string;
  reason?: string;
}

const REGION_TIMEZONE_MAP: Record<string, string> = {
  // United States
  'california': 'America/Los_Angeles',
  'ca': 'America/Los_Angeles',
  'washington': 'America/Los_Angeles',
  'wa': 'America/Los_Angeles',
  'oregon': 'America/Los_Angeles',
  'or': 'America/Los_Angeles',
  'nevada': 'America/Los_Angeles',
  'nv': 'America/Los_Angeles',
  'colorado': 'America/Denver',
  'co': 'America/Denver',
  'utah': 'America/Denver',
  'ut': 'America/Denver',
  'arizona': 'America/Phoenix',
  'az': 'America/Phoenix',
  'texas': 'America/Chicago',
  'tx': 'America/Chicago',
  'illinois': 'America/Chicago',
  'il': 'America/Chicago',
  'new york': 'America/New_York',
  'ny': 'America/New_York',
  'florida': 'America/New_York',
  'fl': 'America/New_York',
  'massachusetts': 'America/New_York',
  'ma': 'America/New_York',
  'georgia': 'America/New_York',
  'ga': 'America/New_York',
  'north carolina': 'America/New_York',
  'nc': 'America/New_York',
  'virginia': 'America/New_York',
  'va': 'America/New_York',
  'pennsylvania': 'America/New_York',
  'pa': 'America/New_York',

  // United Kingdom
  'london': 'Europe/London',
  'england': 'Europe/London',
  'scotland': 'Europe/London',
  'wales': 'Europe/London',
  'northern ireland': 'Europe/London',
  'uk': 'Europe/London',
  'gb': 'Europe/London',

  // Canada
  'ontario': 'America/Toronto',
  'on': 'America/Toronto',
  'quebec': 'America/Montreal',
  'qc': 'America/Montreal',
  'british columbia': 'America/Vancouver',
  'bc': 'America/Vancouver',
  'alberta': 'America/Edmonton',
  'ab': 'America/Edmonton',

  // Australia
  'new south wales': 'Australia/Sydney',
  'nsw': 'Australia/Sydney',
  'victoria': 'Australia/Melbourne',
  'vic': 'Australia/Melbourne',
  'queensland': 'Australia/Brisbane',
  'qld': 'Australia/Brisbane',
  'western australia': 'Australia/Perth',
  'wa_au': 'Australia/Perth',
};

const COUNTRY_DEFAULT_TIMEZONES: Record<string, string> = {
  'US': 'America/New_York',
  'USA': 'America/New_York',
  'UK': 'Europe/London',
  'GB': 'Europe/London',
  'CA': 'America/Toronto',
  'AU': 'Australia/Sydney',
  'PK': 'Asia/Karachi',
  'DE': 'Europe/Berlin',
  'FR': 'Europe/Paris',
  'NL': 'Europe/Amsterdam',
  'IE': 'Europe/Dublin',
};

/**
 * Resolves standard IANA timezone from business country and region/city.
 */
export function resolveRecipientTimeZone(country?: string | null, regionOrCity?: string | null): string {
  if (regionOrCity) {
    const norm = regionOrCity.toLowerCase().trim();
    if (REGION_TIMEZONE_MAP[norm]) {
      return REGION_TIMEZONE_MAP[norm];
    }
  }

  const normCountry = (country || 'US').toUpperCase().trim();
  return COUNTRY_DEFAULT_TIMEZONES[normCountry] || 'America/New_York';
}

/**
 * Validates that current real local time for recipient is within business hours (09:00 - 17:00, Monday-Friday).
 */
export function checkRecipientLocalSendingWindow(
  country?: string | null,
  regionOrCity?: string | null,
  windowStartHour: number = 9,
  windowEndHour: number = 17,
  dateOverride?: Date
): LocalTimeCheckResult {
  const timeZone = resolveRecipientTimeZone(country, regionOrCity);
  const now = dateOverride || new Date();

  // Get local hour, minute, and weekday in recipient's timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  }).formatToParts(now);

  let localHour = 0;
  let localMinute = 0;
  let localDayOfWeek = 'Mon';

  for (const part of parts) {
    if (part.type === 'hour') localHour = parseInt(part.value, 10);
    if (part.type === 'minute') localMinute = parseInt(part.value, 10);
    if (part.type === 'weekday') localDayOfWeek = part.value;
  }

  // Check if weekend (Sat or Sun)
  const isWeekend = localDayOfWeek === 'Sat' || localDayOfWeek === 'Sun';
  if (isWeekend) {
    return {
      isWithinSendingWindow: false,
      localHour,
      localMinute,
      localDayOfWeek,
      timeZone,
      reason: `Recipient local day is ${localDayOfWeek} (weekend) in ${timeZone}. Cold outreach paused until Monday morning.`,
    };
  }

  // Check business hours window (e.g. 09:00 to 17:00)
  const isWithinHours = localHour >= windowStartHour && localHour < windowEndHour;
  if (!isWithinHours) {
    const formattedTime = `${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}`;
    return {
      isWithinSendingWindow: false,
      localHour,
      localMinute,
      localDayOfWeek,
      timeZone,
      reason: `Recipient local time is ${formattedTime} ${localDayOfWeek} in ${timeZone} (outside ${windowStartHour}:00-${windowEndHour}:00 business hours window).`,
    };
  }

  return {
    isWithinSendingWindow: true,
    localHour,
    localMinute,
    localDayOfWeek,
    timeZone,
  };
}
