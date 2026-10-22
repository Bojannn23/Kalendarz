import { useEffect, useRef } from 'react'
import { FiAlertCircle, FiCalendar, FiClock, FiMapPin, FiX } from 'react-icons/fi'
import { CategoryBadge } from './EventForm.jsx'
import { formatShortDate } from '../../shared/lib/calendar.js'

function DeleteEventDialog({ event, error, busy, onCancel, onConfirm }) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const returnFocus = document.activeElement
    if (!dialog) return undefined
    dialog.showModal()
    cancelRef.current?.focus()

    return () => {
      if (dialog.open) dialog.close()
      returnFocus?.focus?.()
    }
  }, [])

  if (!event) return null

  return (
    <dialog className="delete-dialog card border-0 shadow-lg p-4" ref={dialogRef} onCancel={(e) => { e.preventDefault(); if (!busy) onCancel() }}>
      <div className="delete-dialog__heading">
        <span className="delete-dialog__icon"><FiAlertCircle /></span>
        <button className="btn btn-outline-secondary icon-button" type="button" aria-label="Zamknij" onClick={onCancel} disabled={busy}><FiX /></button>
      </div>
      <h2>Usunąć wydarzenie?</h2>
      <p className="delete-dialog__description">Wydarzenie zniknie z kalendarza wszystkich użytkowników. Tej zmiany nie można cofnąć.</p>
      <div className="delete-summary">
        <CategoryBadge category={event.category} />
        <strong>{event.title}</strong>
        <span><FiCalendar /> {formatShortDate(event.startDate)}</span>
        <span><FiClock /> {event.allDay ? 'Cały dzień' : `${event.startTime}–${event.endTime}`}</span>
        <span><FiMapPin /> {event.location}</span>
      </div>
      {error && <p className="alert alert-danger py-2" role="alert">{error}</p>}
      <div className="delete-dialog__actions d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-outline-secondary" ref={cancelRef} type="button" onClick={onCancel} disabled={busy}>Anuluj</button>
        <button className="btn btn-danger" type="button" onClick={() => onConfirm(event)} disabled={busy}>{busy ? 'Usuwanie…' : 'Usuń wydarzenie'}</button>
      </div>
    </dialog>
  )
}

export default DeleteEventDialog
