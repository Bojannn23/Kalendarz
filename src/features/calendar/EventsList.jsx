import { FiEdit2, FiSearch, FiTrash2 } from 'react-icons/fi'
import { CategoryBadge } from './EventForm.jsx'
import { formatShortDate, formatWeekday } from '../../shared/lib/calendar.js'

function EventsList({ events, canManageEvent, onEdit, onDelete, onSelect }) {
  const hasManageableEvents = events.some(canManageEvent)

  return (
    <div className="events-table-wrap table-responsive">
      <table className="events-table table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Data i godzina</th>
            <th>Wydarzenie</th>
            <th>Kategoria</th>
            <th>Odbiorcy</th>
            {hasManageableEvents && <th>Akcje</th>}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr className={canManageEvent(event) ? 'events-table-row--manageable' : undefined} key={event.id}>
              <td className="events-table__date">
                <strong>{formatShortDate(event.startDate)}</strong>
                <small className="events-table__weekday">{formatWeekday(event.startDate)}</small>
                <small>{event.allDay ? 'Cały dzień' : `${event.startTime}–${event.endTime}`}</small>
              </td>
              <td className="events-table__title"><button className="event-title-button" type="button" onClick={() => onSelect(event)}>{event.title}</button><small>{event.location}</small></td>
              <td className="events-table__category"><CategoryBadge category={event.category} /></td>
              <td className="events-table__audience">{event.audience}</td>
              {hasManageableEvents && (
                <td className="events-table__actions">
                  {canManageEvent(event) && (
                    <div className="table-actions d-flex gap-1">
                      <button className="btn btn-outline-secondary btn-sm icon-button" type="button" aria-label={`Edytuj: ${event.title}`} onClick={() => onEdit(event)}><FiEdit2 /></button>
                      <button className="btn btn-outline-danger btn-sm icon-button" type="button" aria-label={`Usuń: ${event.title}`} onClick={() => onDelete(event)}><FiTrash2 /></button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {events.length === 0 && (
        <div className="empty-state"><FiSearch /><strong>Nie znaleziono wydarzeń</strong><span>Zmień kryteria wyszukiwania lub filtry.</span></div>
      )}
    </div>
  )
}

export default EventsList
