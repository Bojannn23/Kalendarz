import assert from 'node:assert/strict'
import test from 'node:test'
import { getPolishStatutoryHolidays } from './polishHolidays.js'

test('returns Polish public holidays for the 2026/2027 school year', () => {
  const holidays = getPolishStatutoryHolidays('2026-09-01', '2027-08-31')
  const datesByTitle = new Map(holidays.map(({ dateKey, title }) => [title, dateKey]))

  assert.equal(datesByTitle.get('Wszystkich Świętych'), '2026-11-01')
  assert.equal(datesByTitle.get('Wielkanoc'), '2027-03-28')
  assert.equal(datesByTitle.get('Poniedziałek Wielkanocny'), '2027-03-29')
  assert.equal(datesByTitle.get('Święto Pracy'), '2027-05-01')
  assert.equal(datesByTitle.get('Boże Ciało'), '2027-05-27')
})

test('limits holidays to the requested date range', () => {
  const holidays = getPolishStatutoryHolidays('2027-05-01', '2027-05-03')

  assert.deepEqual(
    holidays.map(({ dateKey }) => dateKey),
    ['2027-05-01', '2027-05-03'],
  )
})
