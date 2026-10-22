import { cloneElement, useState } from 'react'
import { FiArrowLeft, FiCalendar, FiClock, FiMapPin } from 'react-icons/fi'
import { getDuration } from '../../shared/lib/calendar.js'

const emptyEvent = {
  title: '',
  description: '',
  category: 'Organizacja',
  audience: 'Cała szkoła',
  startDate: '',
  endDate: '',
  startTime: '09:00',
  endTime: '10:00',
  location: '',
  organizer: 'Anna Kowalska',
  allDay: false,
}

function EventForm({
  event,
  initialDate,
  schoolYear,
  categories,
  audiences,
  saving,
  saveError,
  onCancel,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(() => event || {
    ...emptyEvent,
    category: categories[0]?.name || '',
    audience: audiences[0]?.name || '',
    startDate: initialDate,
    endDate: initialDate,
  })
  const [errors, setErrors] = useState({})
  const isEditing = Boolean(event)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function submit(eventObject) {
    eventObject.preventDefault()
    const nextErrors = {}

    for (const field of ['title', 'category', 'audience', 'startDate', 'endDate', 'location']) {
      if (!String(form[field] || '').trim()) nextErrors[field] = 'To pole jest wymagane.'
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      nextErrors.endDate = 'Data zakończenia nie może być wcześniejsza niż rozpoczęcia.'
    }
    if (form.startDate && (form.startDate < schoolYear.start_date || form.startDate > schoolYear.end_date)) {
      nextErrors.startDate = `Data musi mieścić się w roku szkolnym ${schoolYear.label}.`
    }
    if (form.endDate && (form.endDate < schoolYear.start_date || form.endDate > schoolYear.end_date)) {
      nextErrors.endDate = `Data musi mieścić się w roku szkolnym ${schoolYear.label}.`
    }
    if (
      !form.allDay &&
      form.startDate === form.endDate &&
      form.startTime &&
      form.endTime &&
      form.endTime <= form.startTime
    ) {
      nextErrors.endTime = 'Godzina zakończenia musi być późniejsza.'
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    await onSave({ ...form, title: form.title.trim(), id: event?.id })
  }

  const previewDate = form.startDate
    ? new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(`${form.startDate}T12:00:00`),
      )
    : 'Wybierz datę'

  return (
    <section className="event-form-page">
      <button className="btn btn-link text-button p-0 mb-3" type="button" onClick={onCancel}>
        <FiArrowLeft /> Wróć do kalendarza
      </button>
      <div className="page-heading d-flex align-items-start justify-content-between gap-3 mb-3">
        <div>
          <h1>{isEditing ? 'Edytuj wydarzenie' : 'Dodaj wydarzenie'}</h1>
          <p>{isEditing ? 'Zaktualizuj informacje widoczne w kalendarzu szkoły.' : 'Zaplanuj nowy termin w roku szkolnym.'}</p>
        </div>
        <span className="form-status">{isEditing ? 'Opublikowane' : 'Nowe · niezapisane'}</span>
      </div>

      <form className="form-layout row g-3" onSubmit={submit} noValidate>
        <div className="form-card card p-3 col-12 col-xl-8">
          <p className="required-note">* Pola wymagane</p>
          <FormSection number="1" title="Informacje o wydarzeniu">
            <FormField label="Nazwa wydarzenia" required error={errors.title} className="field--full">
              <input className="form-control" value={form.title} onChange={(e) => updateField('title', e.target.value)} />
            </FormField>
            <FormField label="Kategoria" required error={errors.category}>
              <select className="form-select" value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                {categories.map((category) => <option key={category.id}>{category.name}</option>)}
              </select>
            </FormField>
            <FormField label="Odbiorcy" required error={errors.audience}>
              <select className="form-select" value={form.audience} onChange={(e) => updateField('audience', e.target.value)}>
                {audiences.map((audience) => <option key={audience.id}>{audience.name}</option>)}
              </select>
            </FormField>
            <FormField label="Opis" className="field--full">
              <textarea className="form-control" rows="3" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
            </FormField>
          </FormSection>

          <FormSection number="2" title="Data i godzina">
            <FormField label="Data rozpoczęcia" required error={errors.startDate}>
              <input className="form-control" type="date" min={schoolYear.start_date} max={schoolYear.end_date} value={form.startDate} onChange={(e) => updateField('startDate', e.target.value)} />
            </FormField>
            <FormField label="Data zakończenia" required error={errors.endDate}>
              <input className="form-control" type="date" min={form.startDate || schoolYear.start_date} max={schoolYear.end_date} value={form.endDate} onChange={(e) => updateField('endDate', e.target.value)} />
            </FormField>
            <label className="toggle-field field--full">
              <input type="checkbox" checked={form.allDay} onChange={(e) => updateField('allDay', e.target.checked)} />
              <span>Wydarzenie całodniowe</span>
            </label>
            {!form.allDay && (
              <>
                <FormField label="Od godziny" required>
                  <input className="form-control" type="time" value={form.startTime} onChange={(e) => updateField('startTime', e.target.value)} />
                </FormField>
                <FormField label="Do godziny" required error={errors.endTime}>
                  <input className="form-control" type="time" value={form.endTime} onChange={(e) => updateField('endTime', e.target.value)} />
                </FormField>
              </>
            )}
            <p className="duration-note field--full">
              {previewDate}{form.startDate ? ` · ${getDuration(form.startDate, form.endDate || form.startDate, form.startTime, form.endTime, form.allDay)}` : ''}
            </p>
          </FormSection>

          <FormSection number="3" title="Miejsce i organizator">
            <FormField label="Miejsce" required error={errors.location}>
              <input className="form-control" value={form.location} onChange={(e) => updateField('location', e.target.value)} />
            </FormField>
            <FormField label="Organizator">
              <input className="form-control" value={form.organizer} onChange={(e) => updateField('organizer', e.target.value)} />
            </FormField>
          </FormSection>

          <div className="form-actions d-flex flex-wrap align-items-center gap-2 border-top pt-3">
            {isEditing && (
              <button className="btn btn-danger button--delete-form" type="button" onClick={() => onDelete(event)} disabled={saving}>
                Usuń wydarzenie
              </button>
            )}
            <span className="form-actions__spacer flex-grow-1" />
            <button className="btn btn-outline-secondary" type="button" onClick={onCancel} disabled={saving}>Anuluj</button>
            <button className="btn btn-success" type="submit" disabled={saving}>{saving ? 'Zapisywanie…' : isEditing ? 'Zapisz zmiany' : 'Dodaj wydarzenie'}</button>
          </div>
          {saveError && <p className="alert alert-danger mb-0 mt-3" role="alert">{saveError}</p>}
        </div>

        <aside className="form-aside col-12 col-xl-4 d-flex flex-column gap-2">
          <div className="preview-card card p-3">
            <h2>Podgląd wydarzenia</h2>
            <CategoryBadge category={form.category} />
            <h3>{form.title || 'Nazwa wydarzenia'}</h3>
            <p><FiCalendar /> {previewDate}</p>
            <p><FiClock /> {form.allDay ? 'Cały dzień' : `${form.startTime}–${form.endTime}`}</p>
            <p><FiMapPin /> {form.location || 'Miejsce wydarzenia'}</p>
            <p>Odbiorcy: {form.audience}</p>
          </div>
          <div className="info-card alert mb-0">
            <strong>Wspólny kalendarz szkoły</strong>
            <p>Po zapisaniu wydarzenie będzie widoczne dla uczniów, rodziców i nauczycieli.</p>
          </div>
        </aside>
      </form>
    </section>
  )
}

function FormSection({ number, title, children }) {
  return (
    <fieldset className="form-section border-top pt-3">
      <legend><span>{number}</span>{title}</legend>
      <div className="form-section__fields row g-3">{children}</div>
    </fieldset>
  )
}

function FormField({ label, required, error, className = '', children }) {
  return (
    <label className={`form-field col-12 ${className === 'field--full' ? '' : 'col-md-6'}`}>
      <span className="form-label mb-1">{label}{required ? ' *' : ''}</span>
      {cloneElement(children, {
        className: `${children.props.className || ''}${error ? ' is-invalid' : ''}`.trim(),
      })}
      {error && <small className="field-error text-danger">{error}</small>}
    </label>
  )
}

export function CategoryBadge({ category }) {
  const slug = { Organizacja: 'organization', Spotkania: 'meeting', Uroczystości: 'ceremony', Wycieczki: 'trip' }[category]
  return <span className={`category-badge category-${slug}`}><span className="category-badge__dot" />{category}</span>
}

export default EventForm
