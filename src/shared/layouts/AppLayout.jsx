import { FiCalendar, FiList, FiMenu, FiMoon, FiSun, FiUser } from 'react-icons/fi'

function AppLayout({ children, page, contentPage = page, profile, schoolName, schoolYearLabel, theme, onThemeToggle, onNavigate }) {
  const roleLabel = profile.role === 'admin' ? 'Zarządzanie' : 'Tylko podgląd'
  const profileName = profile.fullName || 'Użytkownik'
  const initials = profileName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('pl-PL'))
    .join('')

  return (
    <div className="app-shell d-flex min-vh-100">
      <aside className="sidebar position-sticky top-0 d-flex flex-column flex-shrink-0 bg-white border-end p-3">
        <a className="brand d-inline-flex align-items-center gap-2 fw-bold text-decoration-none" href="#calendar" onClick={(event) => { event.preventDefault(); onNavigate('calendar') }}>
          <span className="brand__icon"><FiCalendar /></span>
          <span>Szkolny plan</span>
        </a>
        <div className="school-name d-grid">
          <strong>{schoolName}</strong>
        </div>
        <nav className="side-nav nav flex-column gap-1" aria-label="Nawigacja główna">
          <NavButton icon={<FiCalendar />} active={page === 'calendar'} onClick={() => onNavigate('calendar')}>Kalendarz</NavButton>
          <NavButton icon={<FiList />} active={page === 'events'} onClick={() => onNavigate('events')}>Lista wydarzeń</NavButton>
        </nav>
        <div className="school-year-card card border-0 p-3">
          <span>ROK SZKOLNY</span>
          <strong>{schoolYearLabel.replace('/', ' / ')}</strong>
          <small>{new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${schoolYearLabel.slice(0, 4)}-09-01T12:00:00`))} — {new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${schoolYearLabel.slice(-4)}-08-31T12:00:00`))}</small>
        </div>
        <div className="sidebar-bottom mt-auto">
          <div className="help-link">Pomoc i kontakt</div>
          <button type="button" className="profile-link" onClick={() => onNavigate('profile')}>
            <span className="avatar">{initials}</span>
            <span><strong>{profileName}</strong><small>{roleLabel}</small></span>
          </button>
        </div>
      </aside>

      <div className={`app-content app-content--${contentPage} flex-grow-1 min-w-0`}>
        <header className="topbar d-flex align-items-center justify-content-between bg-white border-bottom px-4">
          <div className="topbar__context">{schoolName} <span>/</span> Rok szkolny {schoolYearLabel}</div>
          <div className="topbar__actions">
            <ThemeToggle theme={theme} onClick={onThemeToggle} />
            <div className="topbar__role"><span className="status-dot" /> {roleLabel}</div>
          </div>
        </header>
        <header className="mobile-header d-none align-items-center justify-content-between gap-2 bg-white border-bottom px-3">
          <button className="brand btn p-0 d-inline-flex align-items-center gap-2 fw-bold" type="button" onClick={() => onNavigate('calendar')}>
            <span className="brand__icon"><FiCalendar /></span>
            <span>Szkolny plan</span>
          </button>
          <ThemeToggle theme={theme} onClick={onThemeToggle} />
          <button className="mobile-menu-button" type="button" aria-label="Otwórz profil" onClick={() => onNavigate('profile')}><FiMenu /></button>
        </header>
        {children}
        <nav className="mobile-bottom-nav d-none" aria-label="Nawigacja mobilna">
          <NavButton icon={<FiCalendar />} active={page === 'calendar'} onClick={() => onNavigate('calendar')}>Kalendarz</NavButton>
          <NavButton icon={<FiList />} active={page === 'events'} onClick={() => onNavigate('events')}>Wydarzenia</NavButton>
          <NavButton icon={<FiUser />} active={page === 'profile'} onClick={() => onNavigate('profile')}>Profil</NavButton>
        </nav>
      </div>
    </div>
  )
}

function ThemeToggle({ theme, onClick }) {
  const nextTheme = theme === 'dark' ? 'dzienny' : 'nocny'
  const Icon = theme === 'dark' ? FiSun : FiMoon

  return (
    <button
      className="theme-toggle btn btn-outline-secondary"
      type="button"
      aria-label={`Włącz tryb ${nextTheme}`}
      title={`Włącz tryb ${nextTheme}`}
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
    </button>
  )
}

function NavButton({ icon, active, onClick, children }) {
  return (
    <button className={`nav-button btn w-100 d-inline-flex align-items-center gap-2 text-start${active ? ' nav-button--active' : ''}`} type="button" aria-current={active ? 'page' : undefined} onClick={onClick}>
      {icon}<span>{children}</span>
    </button>
  )
}

export default AppLayout
