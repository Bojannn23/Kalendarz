import { useEffect, useMemo, useRef, useState } from 'react'
import { FiAlertCircle, FiUpload, FiX } from 'react-icons/fi'

const fieldAliases = {
  title: ['title', 'name', 'nazwa', 'nazwawydarzenia', 'tytul', 'wydarzenie'],
  description: ['description', 'opis'],
  category: ['category', 'kategoria'],
  audience: ['audience', 'odbiorcy', 'grupa'],
  startDate: ['startdate', 'start', 'data', 'datapoczatku', 'datastartu'],
  endDate: ['enddate', 'end', 'datakoncowa', 'datakonca'],
  startTime: ['starttime', 'godzina', 'godzinapoczatku', 'odgodziny', 'od'],
  endTime: ['endtime', 'godzinakonca', 'dogodziny', 'do'],
  allDay: ['allday', 'calydzien', 'calodniowe'],
  location: ['location', 'miejsce', 'lokalizacja'],
  organizer: ['organizer', 'organizator'],
}

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl-PL')
    .replace(/[^a-z0-9]/g, '')
}

function normalizeRecord(record) {
  const normalized = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [normalizeKey(key), value]),
  )
  return Object.fromEntries(Object.entries(fieldAliases).map(([field, aliases]) => {
    const key = aliases.find((alias) => normalized[alias] !== undefined)
    return [field, key ? normalized[key] : '']
  }))
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }
  if (typeof value === 'number' && value > 0) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000)
    return parseDate(date)
  }

  const raw = String(value ?? '').trim()
  const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  const polish = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  const match = iso || (polish && [polish[0], polish[3], polish[2], polish[1]])
  if (!match) return ''

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseTime(value) {
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const minutes = Math.round(value * 24 * 60)
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
  }
  const raw = String(value ?? '').trim()
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return ''
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseBoolean(value) {
  return ['true', '1', 'tak', 'yes', 'y', 'caly dzien', 'calodniowe'].includes(normalizeKey(value))
}

function splitDelimitedLine(line, delimiter) {
  const fields = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === delimiter && !quoted) {
      fields.push(value.trim())
      value = ''
    } else {
      value += character
    }
  }
  fields.push(value.trim())
  return fields
}

function recordsFromTable(rows) {
  const [headers, ...data] = rows
  if (!headers?.length) throw new Error('Plik nie zawiera tabeli z nagłówkami kolumn.')
  return data
    .filter((row) => row.some((value) => String(value ?? '').trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
}

async function readFileRecords(file) {
  const extension = file.name.split('.').pop().toLocaleLowerCase('pl-PL')
  if (file.size > 10 * 1024 * 1024) throw new Error('Maksymalny rozmiar pliku to 10 MB.')

  if (extension === 'json') {
    const parsed = JSON.parse(await file.text())
    const records = Array.isArray(parsed) ? parsed : parsed?.events
    if (!Array.isArray(records)) throw new Error('JSON powinien zawierać tablicę wydarzeń lub pole „events”.')
    return records
  }

  if (extension === 'txt') {
    const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim())
    if (!lines.length) throw new Error('Plik tekstowy jest pusty.')
    const header = lines[0]
    const delimiter = ['\t', ';', ','].sort((a, b) => header.split(b).length - header.split(a).length)[0]
    return recordsFromTable(lines.map((line) => splitDelimitedLine(line, delimiter)))
  }

  if (extension === 'xlsx') {
    const { default: readXlsxFile } = await import('read-excel-file/browser')
    const sheets = await readXlsxFile(file)
    const sheet = sheets.find(({ data }) => data?.some((row) => row.some((value) => String(value ?? '').trim())))
    if (!sheet) throw new Error('Arkusz Excel nie zawiera danych.')
    return recordsFromTable(sheet.data)
  }

  if (extension === 'docx') {
    const { default: mammoth } = await import('mammoth/mammoth.browser.js')
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
    const document = new DOMParser().parseFromString(result.value, 'text/html')
    const table = document.querySelector('table')
    if (!table) throw new Error('Dokument Word powinien zawierać tabelę z nagłówkami kolumn.')
    const rows = [...table.rows].map((row) => [...row.cells].map((cell) => cell.textContent.trim()))
    return recordsFromTable(rows)
  }

  throw new Error('Wybierz plik JSON, TXT, XLSX lub DOCX.')
}

function prepareEvents(records, { categories, audiences, schoolYear, defaultCategory, defaultAudience }) {
  return records.map((record, index) => {
    const source = normalizeRecord(record)
    const startDate = parseDate(source.startDate)
    const startTime = parseTime(source.startTime)
    let endDate = parseDate(source.endDate) || startDate
    let endTime = parseTime(source.endTime)
    if (startDate && startTime && !endTime) {
      const [hours, minutes] = startTime.split(':').map(Number)
      const endMinutes = hours * 60 + minutes + 60
      endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
      if (endMinutes >= 24 * 60 && !parseDate(source.endDate)) endDate = addDays(startDate, 1)
    }
    const categoryName = String(source.category || defaultCategory).trim()
    const audienceName = String(source.audience || defaultAudience).trim()
    const category = categories.find((item) => normalizeKey(item.name) === normalizeKey(categoryName))
    const audience = audiences.find((item) => normalizeKey(item.name) === normalizeKey(audienceName))
    const allDayValue = String(source.allDay ?? '').trim()
    const allDay = allDayValue ? parseBoolean(allDayValue) : !startTime && !endTime
    const issues = []

    if (!String(source.title || '').trim()) issues.push('brak nazwy')
    if (!startDate) issues.push('nieprawidłowa data rozpoczęcia')
    if (startDate && !String(source.endDate || '').trim()) source.endDate = startDate
    if (!category) issues.push(`nieznana kategoria „${categoryName}”`)
    if (!audience) issues.push(`nieznani odbiorcy „${audienceName}”`)
    if (!String(source.location || '').trim()) issues.push('brak miejsca')
    if (startDate && endDate < startDate) issues.push('data zakończenia przed rozpoczęciem')
    if (startDate && (startDate < schoolYear.start_date || startDate > schoolYear.end_date)) issues.push('data poza rokiem szkolnym')
    if (endDate && (endDate < schoolYear.start_date || endDate > schoolYear.end_date)) issues.push('koniec poza rokiem szkolnym')
    if (!allDay && (!startTime || !endTime)) issues.push('brak lub nieprawidłowa godzina')
    if (!allDay && startDate === endDate && startTime && endTime <= startTime) issues.push('godzina końca przed rozpoczęciem')

    return {
      event: {
        title: String(source.title || '').trim(),
        description: String(source.description || '').trim(),
        category: category?.name || categoryName,
        audience: audience?.name || audienceName,
        startDate,
        endDate,
        startTime,
        endTime,
        allDay,
        location: String(source.location || '').trim(),
        organizer: String(source.organizer || '').trim(),
      },
      rowNumber: index + 2,
      issues,
    }
  })
}

function ImportEventsDialog({ categories, audiences, schoolYear, busy, onClose, onImport }) {
  const dialogRef = useRef(null)
  const fileInputRef = useRef(null)
  const [records, setRecords] = useState(null)
  const [fileName, setFileName] = useState('')
  const [defaultCategory, setDefaultCategory] = useState(categories[0]?.name || '')
  const [defaultAudience, setDefaultAudience] = useState(audiences[0]?.name || '')
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)

  const entries = useMemo(() => (
    records ? prepareEvents(records, { categories, audiences, schoolYear, defaultCategory, defaultAudience }) : []
  ), [records, categories, audiences, schoolYear, defaultCategory, defaultAudience])

  useEffect(() => {
    const dialog = dialogRef.current
    const returnFocus = document.activeElement
    if (!dialog) return undefined
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      returnFocus?.focus?.()
    }
  }, [])

  async function selectFile(file) {
    if (!file) return
    setReading(true)
    setError('')
    setRecords(null)
    setFileName(file.name)
    try {
      const records = await readFileRecords(file)
      if (!records.length) throw new Error('Nie znaleziono żadnych wydarzeń do zaimportowania.')
      if (records.some((record) => !record || typeof record !== 'object' || Array.isArray(record))) {
        throw new Error('Każde wydarzenie musi być obiektem z polami, np. „title” i „startDate”.')
      }
      setRecords(records)
    } catch (fileError) {
      setError(fileError.message || 'Nie udało się odczytać pliku.')
    } finally {
      setReading(false)
    }
  }

  async function submitImport() {
    const validEvents = entries.filter((entry) => !entry.issues.length).map((entry) => entry.event)
    if (!validEvents.length) return
    setError('')
    try {
      await onImport(validEvents)
    } catch (importError) {
      setError(importError.message || 'Nie udało się zaimportować wydarzeń.')
    }
  }

  const validCount = entries.filter((entry) => !entry.issues.length).length
  const invalidCount = entries.length - validCount

  return (
    <dialog
      className="import-dialog card border-0 shadow-lg p-0"
      ref={dialogRef}
      onCancel={(event) => { event.preventDefault(); if (!busy && !reading) onClose() }}
    >
      <header className="import-dialog__header">
        <div><h2>Import wydarzeń</h2><p>Dodaj wiele terminów z jednego pliku.</p></div>
        <button className="btn btn-outline-secondary icon-button" type="button" aria-label="Zamknij" onClick={onClose} disabled={busy || reading}><FiX /></button>
      </header>
      <div className="import-dialog__body">
        <input
          className="visually-hidden"
          ref={fileInputRef}
          type="file"
          accept=".json,.txt,.xlsx,.docx,application/json,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = '' }}
        />
        <div className="import-file-row">
          <button className="btn btn-outline-secondary" type="button" onClick={() => fileInputRef.current?.click()} disabled={reading || busy}><FiUpload /> Wybierz plik</button>
          <span>{reading ? 'Odczytywanie pliku…' : fileName || 'JSON, TXT, XLSX lub DOCX · maks. 10 MB'}</span>
        </div>
        <div className="import-defaults">
          <label className="form-field"><span className="form-label mb-1">Domyślna kategoria</span><select className="form-select" value={defaultCategory} onChange={(event) => setDefaultCategory(event.target.value)}>{categories.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
          <label className="form-field"><span className="form-label mb-1">Domyślni odbiorcy</span><select className="form-select" value={defaultAudience} onChange={(event) => setDefaultAudience(event.target.value)}>{audiences.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
        </div>
        <p className="import-format-note">Tabela powinna mieć nagłówki: nazwa, data rozpoczęcia, miejsce; opcjonalnie opis, kategoria, odbiorcy, data końca, godziny, organizator. Daty: RRRR-MM-DD lub DD.MM.RRRR.</p>
        {entries.length > 0 && (
          <>
            <div className="import-summary" role="status"><strong>Do importu: {validCount}</strong>{invalidCount > 0 && <span>Pominięte błędne: {invalidCount}</span>}</div>
            <div className="import-table-wrap">
              <table className="table table-sm import-table">
                <thead><tr><th>Wiersz</th><th>Nazwa</th><th>Data</th><th>Status</th></tr></thead>
                <tbody>{entries.slice(0, 100).map((entry) => <tr key={entry.rowNumber}><td>{entry.rowNumber}</td><td>{entry.event.title || '—'}</td><td>{entry.event.startDate || '—'}</td><td className={entry.issues.length ? 'text-danger' : 'text-success'}>{entry.issues.join(', ') || 'Gotowe'}</td></tr>)}</tbody>
              </table>
              {entries.length > 100 && <p className="import-table-note">Podgląd pierwszych 100 z {entries.length} wierszy.</p>}
            </div>
          </>
        )}
        {error && <p className="alert alert-danger py-2 mb-0" role="alert"><FiAlertCircle /> {error}</p>}
      </div>
      <footer className="import-dialog__footer">
        <button className="btn btn-outline-secondary" type="button" onClick={onClose} disabled={busy || reading}>Anuluj</button>
        <button className="btn btn-success" type="button" onClick={() => void submitImport()} disabled={busy || reading || validCount === 0}>{busy ? 'Importowanie…' : `Importuj (${validCount})`}</button>
      </footer>
    </dialog>
  )
}

export default ImportEventsDialog