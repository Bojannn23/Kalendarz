export const schoolYearMonths = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
]

export const categoryClassNames = {
  Organizacja: 'organization',
  Spotkania: 'meeting',
  Uroczystości: 'ceremony',
  Wycieczki: 'trip',
}

export function getSchoolYearLabel(date = new Date()) {
  const year = date.getFullYear()
  const startYear = date.getMonth() >= 8 ? year : year - 1

  return `${startYear}/${startYear + 1}`
}

export function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getWarsawToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function getMonthCalendarDays(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(date.getFullYear(), date.getMonth(), 1 - mondayOffset)
  const days = []
  const cellCount = 42

  for (let index = 0; index < cellCount; index += 1) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  }

  return days
}

export function formatMonth(date) {
  return new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(date)
}

export function formatFullDate(date) {
  return new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatShortDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`)
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function getDuration(startDate, endDate, startTime, endTime, allDay) {
  if (allDay) return 'Cały dzień'
  if (startDate !== endDate) return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`
  return `${startTime}–${endTime}`
}
