import { formatMonth, schoolYearMonths } from '../../shared/lib/calendar.js'

function MonthNavigation({ currentMonth, onMonthChange, transitionDirection, className = '' }) {
  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
  const previousLabel = schoolYearMonths[previousMonth.getMonth()]
  const nextLabel = schoolYearMonths[nextMonth.getMonth()]
  const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`
  const previousMonthKey = `${previousMonth.getFullYear()}-${previousMonth.getMonth()}`
  const nextMonthKey = `${nextMonth.getFullYear()}-${nextMonth.getMonth()}`
  const directionClass = transitionDirection ? `month-navigation--${transitionDirection}` : ''
  const currentDirectionClass = transitionDirection
    ? `month-navigation__current--${transitionDirection}`
    : ''

  function changeMonth(amount) {
    onMonthChange(amount)
  }

  return (
    <nav className={`month-navigation ${directionClass} ${className}`.trim()} aria-label="Nawigacja po miesiącach">
      <button
        className="month-navigation__button"
        type="button"
        aria-label={`Poprzedni miesiąc: ${previousLabel} ${previousMonth.getFullYear()}`}
        onClick={() => changeMonth(-1)}
      >
        <span className="month-navigation__label month-navigation__label--previous" key={previousMonthKey}>
          {previousLabel}
        </span>
      </button>
      <h2
        className={`month-navigation__current ${currentDirectionClass}`.trim()}
        key={monthKey}
      >
        {formatMonth(currentMonth)}
      </h2>
      <button
        className="month-navigation__button"
        type="button"
        aria-label={`Następny miesiąc: ${nextLabel} ${nextMonth.getFullYear()}`}
        onClick={() => changeMonth(1)}
      >
        <span className="month-navigation__label month-navigation__label--next" key={nextMonthKey}>
          {nextLabel}
        </span>
      </button>
    </nav>
  )
}

export default MonthNavigation
