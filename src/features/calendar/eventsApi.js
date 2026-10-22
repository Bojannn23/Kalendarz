import { categoryClassNames } from '../../shared/lib/calendar.js'
import { supabase } from '../../shared/lib/supabase.js'

function requireSupabase() {
  if (!supabase) {
    throw new Error('Brak konfiguracji Supabase. Uzupełnij wartości VITE_SUPABASE_URL i VITE_SUPABASE_PUBLISHABLE_KEY w pliku .env.local.')
  }

  return supabase
}

export async function signIn(email, password) {
  const client = requireSupabase()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function fetchProfile(userId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, role, school_id, schools(name)')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    schoolId: data.school_id,
    schoolName: data.schools?.name || 'Szkoła',
  }
}

export async function fetchSchoolYear(schoolId, label) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('school_years')
    .select('id, label, start_date, end_date')
    .eq('school_id', schoolId)
    .eq('label', label)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchTaxonomy() {
  const client = requireSupabase()
  const [categoriesResult, audiencesResult] = await Promise.all([
    client.from('categories').select('id, name, slug').order('name'),
    client.from('audiences').select('id, name').order('name'),
  ])

  if (categoriesResult.error) throw categoriesResult.error
  if (audiencesResult.error) throw audiencesResult.error

  return {
    categories: categoriesResult.data,
    audiences: audiencesResult.data,
  }
}

export async function fetchEvents(schoolYearId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('events')
    .select(`
      id, title, description, start_date, end_date, start_time, end_time,
      all_day, location, organizer, category_id, audience_id,
      categories(name, slug), audiences(name)
    `)
    .eq('school_year_id', schoolYearId)
    .order('start_date')
    .order('start_time')

  if (error) throw error

  return data.map((record) => ({
    id: record.id,
    title: record.title,
    description: record.description || '',
    startDate: record.start_date,
    endDate: record.end_date,
    startTime: record.start_time?.slice(0, 5) || '',
    endTime: record.end_time?.slice(0, 5) || '',
    allDay: record.all_day,
    location: record.location,
    organizer: record.organizer || '',
    categoryId: record.category_id,
    audienceId: record.audience_id,
    category: record.categories?.name || '',
    categoryClass: record.categories?.slug || categoryClassNames[record.categories?.name],
    audience: record.audiences?.name || '',
  }))
}

export async function saveEvent(event, { profile, schoolYear, categories, audiences }) {
  const client = requireSupabase()
  const category = categories.find((item) => item.name === event.category)
  const audience = audiences.find((item) => item.name === event.audience)

  if (!category || !audience) {
    throw new Error('Nie można zapisać wydarzenia: wybierz kategorię i odbiorców z listy.')
  }

  const values = {
    school_id: profile.schoolId,
    school_year_id: schoolYear.id,
    title: event.title,
    description: event.description || '',
    category_id: category.id,
    audience_id: audience.id,
    start_date: event.startDate,
    end_date: event.endDate,
    start_time: event.allDay ? null : event.startTime,
    end_time: event.allDay ? null : event.endTime,
    all_day: event.allDay,
    location: event.location,
    organizer: event.organizer || '',
    updated_by: profile.id,
  }

  const query = event.id
    ? client.from('events').update(values).eq('id', event.id)
    : client.from('events').insert({ ...values, created_by: profile.id })
  const { error } = await query.select('id').single()

  if (error) throw error
}

export async function deleteEvent(eventId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('events')
    .delete()
    .eq('id', eventId)
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Nie usunięto wydarzenia. Sprawdź uprawnienia lub odśwież listę.')
}
