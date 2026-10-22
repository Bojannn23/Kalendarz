import { useEffect, useMemo, useState } from 'react'
import {
  FiCalendar,
  FiClock,
  FiEdit2,
  FiList,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi'
import AppLayout from '../../shared/layouts/AppLayout.jsx'
import {
  formatFullDate,
  formatMonth,
  getSchoolYearLabel,
  getWarsawToday,
  toDateKey,
} from '../../shared/lib/calendar.js'
import CalendarGrid from './CalendarGrid.jsx'
import DeleteEventDialog from './DeleteEventDialog.jsx'
import EventForm, { CategoryBadge } from './EventForm.jsx'
import EventsList from './EventsList.jsx'
import AuthPanel from './AuthPanel.jsx'
import {
  deleteEvent as deleteEventRecord,
  fetchEvents,
  fetchProfile,
  fetchSchoolYear,
  fetchTaxonomy,
  saveEvent as saveEventRecord,
  signOut,
} from './eventsApi.js'
import { isSupabaseConfigured, supabase } from '../../shared/lib/supabase.js'

function CalendarPage() {
  const [theme, setTheme] = useState(() => (
    localStorage.getItem('calendar-theme') === 'dark' ? 'dark' : 'light'
  ))
  const [events, setEvents] = useState([])
  const [profile, setProfile] = useState(null)
  const [schoolYear, setSchoolYear] = useState(null)
  const [taxonomy, setTaxonomy] = useState({ categories: [], audiences: [] })
  const [authState, setAuthState] = useState(isSupabaseConfigured ? 'loading' : 'signed-out')
  const [backendError, setBackendError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [mutationBusy, setMutationBusy] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [page, setPage] = useState('calendar')
  const [previousPage, setPreviousPage] = useState('calendar')
  const [editingEvent, setEditingEvent] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [today, setToday] = useState(() => getWarsawToday())
  const [selectedDate, setSelectedDate] = useState(() => getWarsawToday())
  const [currentMonth, setCurrentMonth] = useState(() => {
    const [year, month] = getWarsawToday().split('-').map(Number)
    return new Date(year, month - 1, 1)
  })
  const [categoryFilter, setCategoryFilter] = useState('')
  const [audienceFilter, setAudienceFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('calendar-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    let active = true
    let requestId = 0

    async function loadWorkspace(session) {
      const currentRequest = ++requestId
      if (!active) return
      setBackendError('')

      if (!session) {
        setProfile(null)
        setSchoolYear(null)
        setEvents([])
        setAuthState('signed-out')
        return
      }

      setAuthState('loading')
      try {
        const nextProfile = await fetchProfile(session.user.id)
        if (!active || currentRequest !== requestId) return
        if (!nextProfile) {
          setProfile(null)
          setAuthState('profile-missing')
          return
        }

        const yearLabel = getSchoolYearLabel(new Date())
        const [nextSchoolYear, nextTaxonomy] = await Promise.all([
          fetchSchoolYear(nextProfile.schoolId, yearLabel),
          fetchTaxonomy(),
        ])
        if (!active || currentRequest !== requestId) return
        if (!nextSchoolYear) {
          throw new Error(`W bazie nie ma skonfigurowanego roku szkolnego ${yearLabel}. Zastosuj migrację Supabase.`)
        }

        const nextEvents = await fetchEvents(nextSchoolYear.id)
        if (!active || currentRequest !== requestId) return
        setProfile(nextProfile)
        setSchoolYear(nextSchoolYear)
        setTaxonomy(nextTaxonomy)
        setEvents(nextEvents)
        setToday(getWarsawToday())
        setAuthState('ready')
      } catch (error) {
        if (!active || currentRequest !== requestId) return
        setBackendError(error.message || 'Nie udało się pobrać danych z Supabase.')
        setAuthState('error')
      }
    }

    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        void loadWorkspace(session)
      }
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setBackendError(error.message)
        setAuthState('error')
        return
      }
      void loadWorkspace(data.session)
    })

    return () => {
      active = false
      requestId += 1
      authSubscription.subscription.unsubscribe()
    }
  }, [retryCount])

  const visibleEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pl-PL')
    return [...events]
      .filter((event) => !categoryFilter || event.categoryId === categoryFilter)
      .filter((event) => !audienceFilter || event.audienceId === audienceFilter)
      .filter((event) => (
        !normalizedSearch ||
        `${event.title} ${event.description} ${event.location}`.toLocaleLowerCase('pl-PL').includes(normalizedSearch)
      ))
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime))
  }, [events, categoryFilter, audienceFilter, search])

  const monthEvents = useMemo(() => {
    const firstOfMonth = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1))
    const lastOfMonth = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0))
    return visibleEvents.filter((event) => event.startDate <= lastOfMonth && event.endDate >= firstOfMonth)
  }, [visibleEvents, currentMonth])
  const allMonthEventCount = events.filter((event) => {
    const firstOfMonth = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1))
    const lastOfMonth = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0))
    return event.startDate <= lastOfMonth && event.endDate >= firstOfMonth
  }).length

  const selectedEvents = visibleEvents.filter(
    (event) => event.startDate <= selectedDate && event.endDate >= selectedDate,
  )
  const upcomingEvent = visibleEvents.find((event) => event.startDate > selectedDate)
  const canManage = profile?.role === 'admin'

  async function reloadEvents() {
    if (!schoolYear) return
    setEvents(await fetchEvents(schoolYear.id))
  }

  function changeMonth(amount) {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1))
  }

  function selectDate(date) {
    const key = typeof date === 'string' ? date : toDateKey(date)
    setSelectedDate(key)
    const [year, month] = key.split('-').map(Number)
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  function startCreate() {
    if (!canManage) return
    setEditingEvent(null)
    setPreviousPage(page === 'events' ? 'events' : 'calendar')
    setPage('form')
  }

  function startEdit(event) {
    if (!canManage) return
    setEditingEvent(event)
    setPreviousPage(page === 'events' ? 'events' : 'calendar')
    setPage('form')
  }

  async function saveEvent(eventData) {
    if (!canManage || !profile || !schoolYear) return
    setMutationBusy(true)
    setMutationError('')
    try {
      await saveEventRecord(eventData, { profile, schoolYear, ...taxonomy })
      await reloadEvents()
      selectDate(eventData.startDate)
      setPage(previousPage)
    } catch (error) {
      setMutationError(error.message || 'Nie udało się zapisać wydarzenia.')
    } finally {
      setMutationBusy(false)
    }
  }

  async function confirmDelete(event) {
    if (!canManage) return
    setMutationBusy(true)
    setMutationError('')
    try {
      await deleteEventRecord(event.id)
      await reloadEvents()
      setDeleteTarget(null)
      setEditingEvent(null)
      setPage(previousPage)
      if (selectedDate >= event.startDate && selectedDate <= event.endDate) {
        setSelectedDate(today)
      }
    } catch (error) {
      setMutationError(error.message || 'Nie udało się usunąć wydarzenia.')
    } finally {
      setMutationBusy(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch (error) {
      setMutationError(error.message || 'Nie udało się wylogować.')
    }
  }

  function requestDelete(event) {
    if (!canManage) return
    if (page !== 'form') setPreviousPage(page)
    setDeleteTarget(event)
  }

  function selectEvent(event) {
    selectDate(event.startDate)
    setPage('calendar')
  }

  if (authState === 'loading') {
    return <StatusPanel title="Ładowanie kalendarza" message="Pobieramy konto i wydarzenia z Supabase." busy />
  }

  if (authState === 'signed-out') {
    return <AuthPanel />
  }

  if (authState === 'profile-missing') {
    return (
      <StatusPanel
        title="Konto nie jest przypisane do szkoły"
        message="Administrator bazy musi dodać profil użytkownika z rolą viewer lub admin."
        actionLabel="Wyloguj się"
        onAction={handleSignOut}
        error={mutationError}
      />
    )
  }

  if (authState === 'error') {
    return (
      <StatusPanel
        title="Nie udało się pobrać danych"
        message={backendError}
        actionLabel="Spróbuj ponownie"
        onAction={() => setRetryCount((count) => count + 1)}
      />
    )
  }

  return (
    <AppLayout
      page={page === 'form' ? previousPage : page}
      contentPage={page}
      profile={profile}
      schoolName={profile.schoolName}
      schoolYearLabel={schoolYear.label}
      theme={theme}
      onThemeToggle={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
      onNavigate={(destination) => {
        if (destination !== 'form') {
          setPage(destination)
          if (destination !== 'profile') setEditingEvent(null)
        }
      }}
    >
      <main className="page-content container-fluid px-3 px-lg-4 py-4">
        {page === 'form' ? (
          <EventForm
            key={editingEvent?.id || 'new-event'}
            event={editingEvent}
            initialDate={selectedDate}
            schoolYear={schoolYear}
            categories={taxonomy.categories}
            audiences={taxonomy.audiences}
            saving={mutationBusy}
            saveError={mutationError}
            onCancel={() => setPage(previousPage)}
            onSave={saveEvent}
            onDelete={requestDelete}
          />
        ) : page === 'profile' ? (
          <ProfilePage profile={profile} year={schoolYear.label} onSignOut={handleSignOut} error={mutationError} />
        ) : (
          <>
            <div className="page-controls d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-3 mb-3">
              <div className="page-heading flex-shrink-0">
                <div>
                  <h1>{page === 'events' ? 'Lista wydarzeń' : 'Kalendarz roku szkolnego'}</h1>
                  <p>{page === 'events' ? 'Przeglądaj terminy i zarządzaj wydarzeniami szkolnymi.' : 'Wszystkie ważne daty w jednym, uporządkowanym miejscu.'}</p>
                </div>
              </div>

              <div className="toolbar d-flex flex-wrap align-items-center gap-2 flex-grow-1 justify-content-xl-end">
              {page === 'events' && (
                <label className="search-field input-group">
                  <span className="input-group-text" aria-hidden="true"><FiSearch /></span>
                  <input
                    className="form-control"
                    type="search"
                    placeholder="Szukaj wydarzenia…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="Szukaj wydarzenia"
                  />
                </label>
              )}
              {page === 'events' && (
                <label className="select-field select-field--month">
                  <span className="sr-only">Miesiąc</span>
                  <input
                    className="form-control"
                    type="month"
                    value={`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`}
                    onChange={(event) => {
                      if (!event.target.value) return
                      const [year, month] = event.target.value.split('-').map(Number)
                      setCurrentMonth(new Date(year, month - 1, 1))
                    }}
                  />
                </label>
              )}
              <label className="select-field select-field--category">
                <span className="sr-only">Filtr kategorii</span>
                <select className="form-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="">Wszystkie kategorie</option>
                  {taxonomy.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="select-field select-field--audience">
                <span className="sr-only">Filtr odbiorców</span>
                <select className="form-select" value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value)}>
                  <option value="">Cała szkoła</option>
                  {taxonomy.audiences.map((audience) => <option key={audience.id} value={audience.id}>{audience.name}</option>)}
                </select>
              </label>
              <div className="view-switch btn-group" role="group" aria-label="Widok wydarzeń">
                <button className={`btn ${page === 'calendar' ? 'btn-success' : 'btn-outline-secondary'}`} type="button" onClick={() => setPage('calendar')}>
                  <FiCalendar /> Kalendarz
                </button>
                <button className={`btn ${page === 'events' ? 'btn-success' : 'btn-outline-secondary'}`} type="button" onClick={() => setPage('events')}>
                  <FiList /> Lista
                </button>
              </div>
              {canManage && (
                <button className="btn btn-success page-add-button" type="button" onClick={startCreate}>
                  <FiPlus /> Dodaj wydarzenie
                </button>
              )}
              </div>
            </div>

            {page === 'calendar' ? (
              <>
                <div className="calendar-layout row g-3">
                  <div className="calendar-main col-12 col-xl-9">
                    <CalendarGrid
                      currentMonth={currentMonth}
                      selectedDate={selectedDate}
                      events={monthEvents}
                      today={today}
                      onMonthChange={changeMonth}
                      onDateSelect={selectDate}
                      onEventSelect={selectEvent}
                    />
                    <CalendarFooter eventsCount={monthEvents.length} categories={taxonomy.categories} />
                  </div>
                  <SelectedDayPanel
                    className="col-12 col-xl-3"
                    selectedDate={selectedDate}
                    events={selectedEvents}
                    upcomingEvent={upcomingEvent}
                    onEdit={startEdit}
                    onDelete={requestDelete}
                    onCreate={startCreate}
                    onSelect={selectEvent}
                    canManage={canManage}
                  />
                </div>
              </>
            ) : (
              <section className="list-section card">
                <div className="list-section__heading">
                  <h2>{formatMonth(currentMonth)}</h2>
                  <span>{monthEvents.length} {pluralize(monthEvents.length, 'wydarzenie', 'wydarzenia', 'wydarzeń')}</span>
                </div>
                <EventsList events={monthEvents} canManage={canManage} onEdit={startEdit} onDelete={requestDelete} onSelect={selectEvent} />
                <p className="list-footer">Wyświetlono {monthEvents.length} z {allMonthEventCount} wydarzeń · Od najwcześniejszego terminu</p>
              </section>
            )}
          </>
        )}
      </main>
      {deleteTarget && (
        <DeleteEventDialog
          event={deleteTarget}
          error={mutationError}
          busy={mutationBusy}
          onCancel={() => { if (!mutationBusy) setDeleteTarget(null) }}
          onConfirm={confirmDelete}
        />
      )}
    </AppLayout>
  )
}

function SelectedDayPanel({
  className = '',
  selectedDate,
  events,
  upcomingEvent,
  onEdit,
  onDelete,
  onCreate,
  onSelect,
  canManage,
}) {
  const date = new Date(`${selectedDate}T12:00:00`)
  const dayTitle = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' }).format(date)
  const weekday = new Intl.DateTimeFormat('pl-PL', { weekday: 'long' }).format(date)
  const isToday = selectedDate === getWarsawToday()

  return (
    <aside className={`selected-day-panel d-flex flex-column gap-2 ${className}`}>
      <h2>Wybrany dzień</h2>
      <div className="selected-date-card card border-0">
        <strong>{dayTitle}</strong>
        <span>{capitalize(weekday)} · {events.length} {pluralize(events.length, 'wydarzenie', 'wydarzenia', 'wydarzeń')}{isToday ? ' · Dzisiaj' : ''}</span>
      </div>
      {events.length ? events.map((event) => (
        <EventCard key={event.id} event={event} canManage={canManage} onEdit={onEdit} onDelete={onDelete} onSelect={onSelect} />
      )) : (
        <div className="empty-day">
          <FiCalendar />
          <strong>Brak wydarzeń w tym dniu</strong>
          <span>W wybranym dniu nie zaplanowano terminów.</span>
          {canManage && <button className="btn btn-outline-secondary" type="button" onClick={onCreate}><FiPlus /> Dodaj wydarzenie</button>}
        </div>
      )}
      {events[0]?.description && (
        <p className="event-description">{events[0].description}<span>Organizator: {events[0].organizer}</span></p>
      )}
      {upcomingEvent && (
        <section className="upcoming-section">
          <h3>Następne wydarzenie</h3>
          <p className="upcoming-section__date">{formatFullDate(new Date(`${upcomingEvent.startDate}T12:00:00`))}</p>
          <EventCard event={upcomingEvent} compact canManage={canManage} onSelect={onSelect} />
        </section>
      )}
    </aside>
  )
}

function EventCard({ event, compact = false, canManage, onEdit, onDelete, onSelect}) {
  return (
    <article className={`event-card card${compact ? ' event-card--compact' : ''}`}>
      <button className="event-card__body" type="button" onClick={() => onSelect(event)}>
        <CategoryBadge category={event.category} />
        <strong>{event.title}</strong>
        <span><FiClock /> {event.allDay ? 'Cały dzień' : `${event.startTime}–${event.endTime}`}</span>
        <span><FiMapPin /> {event.location}</span>
      </button>
      {!compact && canManage && (
        <div className="event-card__actions">
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => onEdit(event)}><FiEdit2 /> Edytuj</button>
          <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => onDelete(event)}><FiTrash2 /> Usuń</button>
        </div>
      )}
    </article>
  )
}

function CalendarFooter({ eventsCount, categories }) {
  return (
    <div className="calendar-footer">
      <CategoryLegend categories={categories} />
      <span>{eventsCount} {pluralize(eventsCount, 'wydarzenie', 'wydarzenia', 'wydarzeń')} w tym miesiącu</span>
    </div>
  )
}

function CategoryLegend({ categories }) {
  return (
    <div className="category-legend" aria-label="Kategorie wydarzeń">
      {categories.map((category) => (
        <span key={category.id}><i className={`category-dot category-${category.slug}`} />{category.name}</span>
      ))}
    </div>
  )
}

function ProfilePage({ profile, year, onSignOut, error }) {
  return (
    <section className="profile-page">
      <div className="page-heading"><div><h1>Profil</h1><p>Informacje o koncie i szkole.</p></div></div>
      <div className="profile-card card">
        <span className="avatar avatar--large">{getInitials(profile.fullName)}</span>
        <div><h2>{profile.fullName || 'Użytkownik'}</h2><p>{profile.role === 'admin' ? 'Administrator' : 'Tylko podgląd'}</p></div>
        <dl><dt>Szkoła</dt><dd>{profile.schoolName}</dd><dt>Rok szkolny</dt><dd>{year}</dd></dl>
        {error && <p className="alert alert-danger mb-0" role="alert">{error}</p>}
        <button className="btn btn-outline-secondary" type="button" onClick={onSignOut}>Wyloguj się</button>
      </div>
    </section>
  )
}

function StatusPanel({ title, message, actionLabel, onAction, error, busy = false }) {
  return (
    <main className="container py-5">
      <div className="card mx-auto auth-card">
        <div className="card-body p-4 p-md-5">
          <h1 className="h4">{title}</h1>
          <p className="text-secondary">{message}</p>
          {error && <p className="alert alert-danger" role="alert">{error}</p>}
          {actionLabel && (
            <button className="btn btn-outline-secondary" type="button" onClick={onAction} disabled={busy}>
              {busy ? 'Proszę czekać…' : actionLabel}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('pl-PL')).join('') || 'U'
}

function pluralize(count, singular, plural, genitive) {
  if (count === 1) return singular
  return count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)
    ? plural
    : genitive
}

function capitalize(value) {
  return value.charAt(0).toLocaleUpperCase('pl-PL') + value.slice(1)
}

export default CalendarPage
