export function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[łŁ]/g, 'l')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl-PL')
    .replace(/[^a-z0-9]/g, '')
}

export function parseBoolean(value) {
  return ['true', '1', 'tak', 'yes', 'y', 'calydzien', 'calodniowe'].includes(normalizeKey(value))
}
