import {
  getCategoryColorHue,
  formatFullDate,
  formatMonth,
  formatShortDate,
  toDateKey,
} from '../../shared/lib/calendar.js'
import { getPolishStatutoryHolidays } from '../../shared/lib/polishHolidays.js'
import logo from '../../assets/logo.png'

const weekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
const weekdayLabels = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']

function getSchoolMonths(schoolYear) {
  const startDate = new Date(`${schoolYear.start_date}T12:00:00`)
  const endDate = new Date(`${schoolYear.end_date}T12:00:00`)
  const months = []

  for (
    let month = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    month <= endDate;
    month = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  ) {
    months.push(month)
  }

  return months
}

function getMonthDays(month, minimumWeeks = 0) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (firstDay.getDay() + 6) % 7
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const weekCount = Math.max(Math.ceil((offset + dayCount) / 7), minimumWeeks)
  const cellCount = weekCount * 7

  return Array.from(
    { length: cellCount },
    (_, index) => new Date(month.getFullYear(), month.getMonth(), 1 - offset + index),
  )
}

function getWeekdayCount(month, schoolYear) {
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  let count = 0

  for (let day = 1; day <= dayCount; day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day)
    const dateKey = toDateKey(date)
    if (
      dateKey >= schoolYear.start_date &&
      dateKey <= schoolYear.end_date &&
      date.getDay() !== 0 &&
      date.getDay() !== 6
    ) {
      count += 1
    }
  }

  return count
}

function getPracticePeriods(schoolYear) {
  if (schoolYear.label !== '2026/2027') return []

  const startYear = Number(schoolYear.start_date.slice(0, 4))
  const periods = [
    { id: 'november', label: 'Listopad', year: startYear, month: 10, classes: ['4A', '4E', '5B (KZ)'] },
    { id: 'february', label: 'Luty', year: startYear + 1, month: 1, classes: ['3EP', '3F'] },
    { id: 'april', label: 'Kwiecień', year: startYear + 1, month: 3, classes: ['4DH', '4E', '4P'] },
  ]

  return periods
    .map((period) => {
      const start = new Date(period.year, period.month, 1)
      const end = new Date(period.year, period.month + 1, 0)
      return { ...period, startDate: toDateKey(start), endDate: toDateKey(end) }
    })
    .filter((period) => period.endDate >= schoolYear.start_date && period.startDate <= schoolYear.end_date)
}

function formatPrintDateRange(startDate, endDate) {
  if (!endDate || endDate === startDate) return formatShortDate(startDate)

  const [startYear, startMonth, startDay] = startDate.split('-')
  const [endYear, endMonth, endDay] = endDate.split('-')

  if (startYear !== endYear) {
    return `${startDay}.${startMonth}.${startYear.slice(-2)}–${endDay}.${endMonth}.${endYear.slice(-2)}`
  }
  if (startMonth !== endMonth) {
    return `${startDay}.${startMonth}–${endDay}.${endMonth}.${endYear}`
  }
  return `${startDay}–${endDay}.${endMonth}.${endYear}`
}

function SemesterDates({ title, events, onDateSelect }) {
  return (
    <section className="year-semester card">
      <h3>{title}</h3>
      {events.length ? (
        <ul className="year-semester__list">
          {events.map((event) => (
            <li key={event.id}>
              <button
                className="year-semester__event"
                type="button"
                onClick={() => onDateSelect(new Date(`${event.startDate}T12:00:00`))}
              >
                <time dateTime={event.startDate}>{formatShortDate(event.startDate)}</time>
                <span>{event.title}</span>
                <small>{event.allDay ? 'Cały dzień' : event.startTime}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="year-semester__empty">Brak wydarzeń w tym okresie.</p>
      )}
    </section>
  )
}

function YearCalendar({ schoolYear, schoolName, events, categories, eventColorHues, today, onDateSelect, onMonthSelect }) {
  const months = getSchoolMonths(schoolYear)
  const practicePeriods = getPracticePeriods(schoolYear)
  const statutoryHolidays = getPolishStatutoryHolidays(schoolYear.start_date, schoolYear.end_date)
  const statutoryHolidayDates = new Set(statutoryHolidays.map((holiday) => holiday.dateKey))
  const printedCategoryNames = new Set(['Organizacja', 'Uroczystości', 'Spotkania'])
  const printedCategories = categories.filter((category) => printedCategoryNames.has(category.name))
  const printedEvents = events.filter((event) => printedCategoryNames.has(event.category))
  const printableDates = [
    ...statutoryHolidays.map((holiday) => ({
      ...holiday,
      endDate: holiday.dateKey,
      type: 'holiday',
    })),
    ...practicePeriods.map((period) => ({
      id: `practice-${period.id}`,
      hatchId: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      title: `Praktyki zawodowe · ${period.label}`,
      classes: period.classes,
      type: 'practice',
    })),
    ...printedEvents.map((event) => ({ ...event, type: 'event' })),
  ].sort((a, b) => {
    const firstDate = a.startDate || a.dateKey
    const secondDate = b.startDate || b.dateKey
    return firstDate.localeCompare(secondDate)
      || (a.startTime || '').localeCompare(b.startTime || '')
  })
  const printableGroups = [
    {
      id: 'holidays',
      title: 'Dni ustawowo wolne',
      swatchClass: 'print-calendar__swatch print-calendar__swatch--holiday',
      items: printableDates.filter((item) => item.type === 'holiday'),
    },
    ...printedCategories.map((category) => ({
      id: `category-${category.id}`,
      title: category.name,
      swatchClass: 'print-calendar__swatch print-calendar__swatch--event',
      hue: getCategoryColorHue(category.name),
      items: printableDates.filter((item) => item.type === 'event' && item.category === category.name),
    })),
    ...practicePeriods.map((period) => ({
      id: `practice-${period.id}`,
      title: `Praktyki zawodowe · ${period.label}`,
      swatchClass: `print-calendar__swatch practice-hatch practice-hatch--${period.id}`,
      items: printableDates.filter((item) => item.type === 'practice' && item.hatchId === period.id),
    })),
  ].filter((group) => group.items.length > 0)
  const startDate = new Date(`${schoolYear.start_date}T12:00:00`)
  const firstSemesterEnd = toDateKey(new Date(startDate.getFullYear() + 1, 0, 15))
  const firstSemesterEvents = events.filter((event) => event.startDate <= firstSemesterEnd)
  const secondSemesterEvents = events.filter((event) => event.startDate > firstSemesterEnd)

  return (
    <>
    <section className="year-overview" aria-label={`Roczny kalendarz szkolny ${schoolYear.label}`}>
      <div className="year-overview__main">
        <div className="year-overview__months">
          {months.map((month) => {
          const monthStart = toDateKey(month)
          const monthEnd = toDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0))
          const monthEvents = events.filter((event) => event.startDate <= monthEnd && event.endDate >= monthStart)
          const days = getMonthDays(month)

          return (
            <section className="year-month card" key={monthStart}>
              <header className="year-month__header">
                <button className="year-month__title" type="button" onClick={() => onMonthSelect(month)}>
                  {formatMonth(month)}
                </button>
                <span title="Dni od poniedziałku do piątku, bez odliczania świąt i przerw szkolnych">
                  {getWeekdayCount(month, schoolYear)} dni pn–pt
                </span>
              </header>
              <div className="year-month__grid" aria-label={formatMonth(month)}>
                {weekdays.map((day, index) => (
                  <span className="year-month__weekday" aria-label={weekdayLabels[index]} key={`${day}-${index}`}>
                    {day}
                  </span>
                ))}
                {days.map((date) => {
                  const dateKey = toDateKey(date)
                  const inMonth = date.getMonth() === month.getMonth()
                  const inSchoolYear = dateKey >= schoolYear.start_date && dateKey <= schoolYear.end_date
                  const dayEvents = inMonth && inSchoolYear
                    ? monthEvents.filter((event) => event.startDate <= dateKey && event.endDate >= dateKey)
                    : []
                  const practicePeriod = inMonth && inSchoolYear
                    ? practicePeriods.find((period) => dateKey >= period.startDate && dateKey <= period.endDate)
                    : null
                  const classes = [
                    'year-month__day',
                    (!inMonth || !inSchoolYear) && 'year-month__day--outside',
                    inMonth && (date.getDay() === 0 || date.getDay() === 6) && 'year-month__day--weekend',
                    dateKey === today && inMonth && 'year-month__day--today',
                    practicePeriod && `practice-hatch practice-hatch--${practicePeriod.id}`,
                  ].filter(Boolean).join(' ')

                  return (
                    <button
                      className={classes}
                      type="button"
                      key={dateKey}
                      disabled={!inMonth || !inSchoolYear}
                      aria-label={`${formatFullDate(date)}${dayEvents.length ? `, ${dayEvents.length} wydarzeń` : ''}${practicePeriod ? `, praktyki zawodowe, klasy ${practicePeriod.classes.join(', ')}` : ''}`}
                      title={practicePeriod ? `Praktyki zawodowe: ${practicePeriod.classes.join(', ')}` : undefined}
                      onClick={() => onDateSelect(date)}
                    >
                      {date.getDate()}
                      {dayEvents.length > 0 && (
                        <span className="year-month__markers" aria-hidden="true">
                          {dayEvents.slice(0, 3).map((event) => (
                            <i
                              className="category-dot event-color-dot"
                              style={{ '--event-hue': eventColorHues.get(event.id) }}
                              key={event.id}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <span className="year-month__event-count">
                {monthEvents.length} wydarzeń
              </span>
            </section>
          )
          })}
        </div>

        <section className="year-overview__legend card" aria-label="Legenda kalendarza">
          <h3>Legenda</h3>
          <div className="year-overview__legend-grid">
          <div className="year-overview__legend-item">
            <span className="year-overview__legend-swatch year-overview__legend-swatch--weekend" aria-hidden="true" />
            <span>Sobota i niedziela</span>
          </div>
          <div className="year-overview__legend-item">
            <span className="year-overview__legend-swatch year-overview__legend-swatch--today" aria-hidden="true" />
            <span>Dzisiaj</span>
          </div>
          {categories.map((category) => (
            <div className="year-overview__legend-item" key={category.id}>
              <span
                className="year-overview__legend-swatch year-overview__legend-swatch--event"
                style={{ '--event-hue': getCategoryColorHue(category.name) }}
                aria-hidden="true"
              />
              <span>{category.name}</span>
            </div>
          ))}
          {practicePeriods.map((period) => (
            <div className="year-overview__legend-item" key={period.id}>
              <span
                className={`year-overview__legend-swatch practice-hatch practice-hatch--${period.id}`}
                aria-hidden="true"
              />
              <span>Praktyki zawodowe · {period.label}: {period.classes.join(', ')}</span>
            </div>
          ))}
          </div>
        </section>
      </div>

      <div className="year-overview__semesters">
        <SemesterDates
          title={`I półrocze · do ${formatShortDate(firstSemesterEnd)}`}
          events={firstSemesterEvents}
          onDateSelect={onDateSelect}
        />
        <SemesterDates
          title="II półrocze"
          events={secondSemesterEvents}
          onDateSelect={onDateSelect}
        />
      </div>
      <p className="year-overview__note">
        Liczba dni pn–pt nie uwzględnia świąt ani przerw szkolnych. Granica półrocza (15 stycznia) pochodzi z kalendarza szkoły.
      </p>
    </section>

    <section className="print-calendar" aria-label="Wersja do druku">
      <div className="print-calendar__page">
        <header className="print-calendar__header">
          <div className="print-calendar__header-title">
            <img className="print-calendar__logo" src={logo} alt="" />
            <div className="print-calendar__header-copy">
              <strong>{schoolName}</strong>
              <span>Kalendarz roku szkolnego {schoolYear.label}</span>
            </div>
          </div>
          <div className="print-calendar__year">{schoolYear.label}</div>
        </header>
        <div className="print-calendar__body">
          <div className="print-calendar__months">
            {months.map((month) => {
              const monthStart = toDateKey(month)
              const monthEnd = toDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0))
              const monthEvents = printedEvents.filter((event) => event.startDate <= monthEnd && event.endDate >= monthStart)
              const days = getMonthDays(month, 6)

              return (
                <section className="print-calendar__month" key={monthStart}>
                  <h3>{formatMonth(month)}</h3>
                  <div className="print-calendar__grid">
                    {weekdays.map((day, index) => (
                      <span
                        className="print-calendar__weekday"
                        key={`${day}-${index}`}
                      >
                        {day}
                      </span>
                    ))}
                    {days.map((date) => {
                      const dateKey = toDateKey(date)
                      const inMonth = date.getMonth() === month.getMonth()
                      const inSchoolYear = dateKey >= schoolYear.start_date && dateKey <= schoolYear.end_date
                      const dayEvents = inMonth && inSchoolYear
                        ? monthEvents.filter((event) => event.startDate <= dateKey && event.endDate >= dateKey)
                        : []
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6
                      const isStatutoryHoliday = statutoryHolidayDates.has(dateKey)
                      const practicePeriod = inMonth && inSchoolYear && !isWeekend && !isStatutoryHoliday
                        ? practicePeriods.find((period) => dateKey >= period.startDate && dateKey <= period.endDate)
                        : null

                      return (
                        <span
                          className={[
                            'print-calendar__day',
                            (!inMonth || !inSchoolYear) && 'print-calendar__day--outside',
                            isWeekend && 'print-calendar__day--weekend',
                            dayEvents.length > 0 && 'print-calendar__day--event',
                            isStatutoryHoliday && 'print-calendar__day--holiday',
                            practicePeriod && `practice-hatch practice-hatch--${practicePeriod.id}`,
                          ].filter(Boolean).join(' ')}
                          style={dayEvents.length > 0 ? {
                            '--event-hue': eventColorHues.get(dayEvents[0].id),
                          } : undefined}
                          key={dateKey}
                        >
                          {inMonth ? date.getDate() : ''}
                        </span>
                      )
                    })}
                  </div>
                  <span className="print-calendar__month-count">
                    {getWeekdayCount(month, schoolYear)} dni pn–pt
                  </span>
                </section>
              )
            })}
          </div>
          <aside className="print-calendar__sidebar">
            <section className="print-calendar__legend">
              <h3>Legenda</h3>
              <div className="print-calendar__legend-item">
                <span className="print-calendar__swatch print-calendar__swatch--weekend" />
                Sobota i niedziela
              </div>
            </section>
            <section className="print-calendar__events">
              <h3>Daty i wydarzenia</h3>
              <div className="print-calendar__event-groups">
                {printableGroups.map((group) => (
                  <section className="print-calendar__event-group" key={group.id}>
                    <h4 className="print-calendar__event-group-title">
                      <span
                        className={group.swatchClass}
                        style={group.hue === undefined ? undefined : { '--event-hue': group.hue }}
                      />
                      {group.title}
                    </h4>
                    <ul className="print-calendar__events-list">
                      {group.items.map((item) => {
                    const startDate = item.startDate || item.dateKey
                    const dateLabel = formatPrintDateRange(startDate, item.endDate)
                    const itemTitle = item.type === 'practice'
                      ? `Klasy: ${item.classes.join(', ')}`
                      : item.title
                    const eventTime = item.type === 'event' && !item.allDay ? item.startTime : ''

                    return (
                      <li key={`${item.type}-${item.id || item.dateKey}`}>
                        <time>{dateLabel}</time>
                        <div>
                          <span className="print-calendar__event-title">
                            — {itemTitle}
                            {eventTime && <small className="print-calendar__event-time"> · {eventTime}</small>}
                          </span>
                        </div>
                      </li>
                    )
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
    </>
  )
}

export default YearCalendar
