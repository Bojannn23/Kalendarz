import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeKey, parseBoolean } from './eventImportUtils.js'

test('parseBoolean accepts Polish all-day labels with diacritics and spaces', () => {
  assert.equal(parseBoolean('Cały dzień'), true)
  assert.equal(parseBoolean('całodniowe'), true)
})

test('normalizeKey preserves Polish ł as l for field headers', () => {
  assert.equal(normalizeKey('tytuł'), 'tytul')
})

test('parseBoolean accepts common true values and rejects unrelated values', () => {
  assert.equal(parseBoolean('TAK'), true)
  assert.equal(parseBoolean('true'), true)
  assert.equal(parseBoolean('nie'), false)
  assert.equal(parseBoolean(''), false)
})
