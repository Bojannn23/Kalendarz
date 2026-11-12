import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import {
  formatMonth,
  getMonthCalendarDays,
  toDateKey,
} from '../../shared/lib/calendar.js'

const weekdays = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz']

function CalendarGrid({
  currentMonth,
  selectedDate,
  events,
  eventColorHues,
  today,
  onMonthChange,
  onDateSelect,
  onEventSelect,
}) {
  const days = getMonthCalendarDays(currentMonth)

  return (
    <section className="calendar-surface card" aria-label="Kalendarz miesięczny">
      <div className="month-toolbar d-flex align-items-center justify-content-between gap-2 p-2">
        <div className="month-toolbar__navigation d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary icon-button"
            type="button"
            aria-label="Poprzedni miesiąc"
            onClick={() => onMonthChange(-1)}
          >
            <FiChevronLeft />
          </button>
          <h2>{formatMonth(currentMonth)}</h2>
          <button
            className="btn btn-outline-secondary icon-button"
            type="button"
            aria-label="Następny miesiąc"
            onClick={() => onMonthChange(1)}
          >
            <FiChevronRight />
          </button>
        </div>
        <button className="btn btn-outline-secondary today-button" type="button" onClick={() => onDateSelect(today)}>
          Dzisiaj
        </button>
      </div>

      <div
        className="calendar-grid"
        role="grid"
        aria-label={formatMonth(currentMonth)}
        style={{ '--calendar-week-count': days.length / 7 }}
      >
        {weekdays.map((day) => (
          <div className="calendar-grid__weekday" role="columnheader" key={day}>
            {day}
          </div>
        ))}
        {days.map((date) => {
          const dateKey = toDateKey(date)
          const dayEvents = events.filter(
            (event) => event.startDate <= dateKey && event.endDate >= dateKey,
          )
          const selected = dateKey === selectedDate
          const isToday = dateKey === today

          return (
            <div
              className={[
                'calendar-day',
                date.getMonth() !== currentMonth.getMonth() && 'calendar-day--outside',
                selected && 'calendar-day--selected',
                isToday && 'calendar-day--today',
              ]
                .filter(Boolean)
                .join(' ')}
              role="gridcell"
              key={dateKey}
            >
              <button
                className="calendar-day__number"
                type="button"
                aria-label={`${date.getDate()} ${formatMonth(date)}${dayEvents.length ? `, ${dayEvents.length} wydarzeń` : ''}`}
                aria-pressed={selected}
                onClick={() => onDateSelect(date)}
              >
                {date.getDate()}
              </button>
              <div className="calendar-day__events">
                {dayEvents.slice(0, 1).map((event) => (
                  <button
                    className="event-chip event-colorized"
                    key={event.id}
                    type="button"
                    title={`${event.startTime} ${event.title}`}
                    style={{ '--event-hue': eventColorHues.get(event.id) }}
                    onClick={() => onEventSelect(event)}
                  >
                    <span className="event-chip__time">{event.allDay ? 'Cały dzień' : event.startTime}</span>
                    <span className="event-chip__title">{event.title}</span>
                  </button>
                ))}
                <div className="calendar-day__dots" aria-hidden="true">
                  {dayEvents.slice(0, 4).map((event) => (
                    <span
                      className={[
                        'category-dot',
                        'event-color-dot',
                        'calendar-day__dot',
                        dayEvents[0]?.id === event.id && 'calendar-day__dot--first',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ '--event-hue': eventColorHues.get(event.id) }}
                      key={event.id}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default CalendarGrid
