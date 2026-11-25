import { toDateKey } from './calendar.js'

function getEasterSunday(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

export function getPolishStatutoryHolidays(startDate, endDate) {
  const holidays = []
  const firstYear = Number(startDate.slice(0, 4))
  const lastYear = Number(endDate.slice(0, 4))

  for (let year = firstYear; year <= lastYear; year += 1) {
    const easterSunday = getEasterSunday(year)
    const afterEaster = (offset) => new Date(
      year,
      easterSunday.getMonth(),
      easterSunday.getDate() + offset,
    )
    const dates = [
      [new Date(year, 0, 1), 'Nowy Rok'],
      [new Date(year, 0, 6), 'Święto Trzech Króli'],
      [easterSunday, 'Wielkanoc'],
      [afterEaster(1), 'Poniedziałek Wielkanocny'],
      [afterEaster(49), 'Zielone Świątki'],
      [afterEaster(60), 'Boże Ciało'],
      [new Date(year, 4, 1), 'Święto Pracy'],
      [new Date(year, 4, 3), 'Święto Konstytucji 3 Maja'],
      [new Date(year, 7, 15), 'Wniebowzięcie NMP'],
      [new Date(year, 10, 1), 'Wszystkich Świętych'],
      [new Date(year, 10, 11), 'Narodowe Święto Niepodległości'],
      [new Date(year, 11, 24), 'Wigilia Bożego Narodzenia'],
      [new Date(year, 11, 25), 'Boże Narodzenie'],
      [new Date(year, 11, 26), 'Drugi dzień Bożego Narodzenia'],
    ]

    for (const [date, title] of dates) {
      const dateKey = toDateKey(date)
      if (dateKey >= startDate && dateKey <= endDate) {
        holidays.push({ dateKey, title })
      }
    }
  }

  return holidays.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}
