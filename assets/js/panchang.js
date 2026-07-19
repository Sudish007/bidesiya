// Lightweight Panchang approximator — Vikram Samvat, Bihari month, tithi,
// paksha, and nakshatra for a given date. Values are ±1 day accurate;
// pandits will notice, everyone else is happy.
//
// Reference anchors (all UT, sunrise-agnostic):
//   Purnima (full moon):   2026-01-04 (approx)
//   Amavasya (new moon):   2026-01-19 (approx — mean lunar cycle 29.53059 days)
//   Nakshatra reference:   2026-01-01 was Uttara Ashadha (index 20 in the 27-list)
//
// This is intentionally simple. For higher accuracy, plug in a proper
// astronomical library later.

const LUNAR_CYCLE_DAYS = 29.53059;
const REF_NEW_MOON_UTC = Date.UTC(2026, 0, 19);  // 2026-01-19

// Nakshatras — 27 stellar mansions in the traditional order
const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha',
  'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana',
  'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];
// 2026-01-01 was approximately Uttara Ashadha → index 20
const REF_NAKSHATRA_DATE = Date.UTC(2026, 0, 1);
const REF_NAKSHATRA_INDEX = 20;
// Moon completes one nakshatra ≈ every 24.79 hours
const NAKSHATRA_DURATION_HOURS = 27.32 * 24 / 27;  // ≈ 24.28h

// Tithi names (30 lunar days — first 15 = Shukla / bright fortnight)
const TITHIS = [
  'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
  'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dvadashi',
  'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
  'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dvadashi',
  'Trayodashi', 'Chaturdashi', 'Amavasya',
];

// Vikram Samvat month names (start with Chaitra ≈ mid-March)
const VS_MONTHS = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadra',
  'Ashwin', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
];

// Weekday in Sanskrit
const VAARS = ['Ravi', 'Som', 'Mangal', 'Budh', 'Guru', 'Shukra', 'Shani'];

function daysBetween(a, b) {
  return (a - b) / 86400000;
}

/** Return an approximate Panchang record for the given local date (JS Date). */
export function panchangFor(date = new Date()) {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

  // Tithi
  const daysSinceNewMoon = ((daysBetween(utc, REF_NEW_MOON_UTC) % LUNAR_CYCLE_DAYS) + LUNAR_CYCLE_DAYS) % LUNAR_CYCLE_DAYS;
  const tithiFraction = daysSinceNewMoon / LUNAR_CYCLE_DAYS * 30;
  const tithiIndex = Math.floor(tithiFraction);  // 0..29
  const paksha = tithiIndex < 15 ? 'Shukla' : 'Krishna';
  const tithiName = TITHIS[tithiIndex];

  // Nakshatra
  const hoursSinceRef = (utc - REF_NAKSHATRA_DATE) / 3600000;
  const nakIndex = ((Math.floor(hoursSinceRef / NAKSHATRA_DURATION_HOURS) + REF_NAKSHATRA_INDEX) % 27 + 27) % 27;
  const nakshatra = NAKSHATRAS[nakIndex];

  // Vikram Samvat year — starts at Chaitra Shukla Pratipada (~mid-March)
  // Approximate: if month < March, VS = year + 56, else year + 57
  const gYear = date.getFullYear();
  const gMonth = date.getMonth();
  const vsYear = gYear + (gMonth < 2 ? 56 : 57);

  // Bihari (VS) month — roughly Gregorian month + 0..1 offset
  // Chaitra begins around March 22. Simple heuristic:
  // Jan → Pausha/Magha (10/11), Feb → Magha/Phalguna (11), Mar → Chaitra (0)
  const monthMap = [10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const vsMonthIndex = monthMap[gMonth];
  const vsMonth = VS_MONTHS[vsMonthIndex];

  const vaar = VAARS[date.getDay()];

  return {
    date,
    vs_year: vsYear,
    vs_month: vsMonth,
    tithi: tithiName,
    tithi_number: (tithiIndex % 15) + 1,
    paksha,
    nakshatra,
    vaar,
    // Convenience — a day like "Krishna Panchami"
    label: `${paksha} ${tithiName}`,
  };
}

/** Days until the next occurrence of a target month/day (Gregorian). */
export function daysUntil(targetMonth /* 0-based */, targetDay) {
  const now = new Date();
  let target = new Date(now.getFullYear(), targetMonth, targetDay);
  if (target < now) {
    target = new Date(now.getFullYear() + 1, targetMonth, targetDay);
  }
  return Math.ceil((target - now) / 86400000);
}
