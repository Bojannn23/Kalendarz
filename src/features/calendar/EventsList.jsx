import { FiEdit2, FiSearch, FiTrash2 } from 'react-icons/fi'
import { CategoryBadge } from './EventForm.jsx'
import { formatShortDate } from '../../shared/lib/calendar.js'

function EventsList({ events, canManage, onEdit, onDelete, onSelect }) {
  return (
    <div className="events-table-wrap table-responsive">
      <table className="events-table table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Data i godzina</th>
            <th>Wydarzenie</th>
            <th>Kategoria</th>
            <th>Odbiorcy</th>
            {canManage && <th>Akcje</th>}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td><strong>{formatShortDate(event.startDate)}</strong><small>{event.allDay ? 'Cały dzień' : `${event.startTime}–${event.endTime}`}</small></td>
              <td><button className="event-title-button" type="button" onClick={() => onSelect(event)}>{event.title}</button><small>{event.location}</small></td>
              <td><CategoryBadge category={event.category} /></td>
              <td>{event.audience}</td>
              {canManage && (
                <td>
                  <div className="table-actions d-flex gap-1">
                    <button className="btn btn-outline-secondary btn-sm icon-button" type="button" aria-label={`Edytuj: ${event.title}`} onClick={() => onEdit(event)}><FiEdit2 /></button>
                    <button className="btn btn-outline-danger btn-sm icon-button" type="button" aria-label={`Usuń: ${event.title}`} onClick={() => onDelete(event)}><FiTrash2 /></button>
                  </div>
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
