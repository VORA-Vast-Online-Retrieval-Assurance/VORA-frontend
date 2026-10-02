import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fromString } from './decimal.ts'
import type { Dec } from './decimal.ts'
import { findOutliers } from './profile.ts'

const decs = (xs: (number | null)[]): (Dec | null)[] => xs.map((x) => (x === null ? null : fromString(String(x))))

test('one stray price among ordinary ones is an outlier; the rest are not', () => {
  const prices = [450000, 470000, 520000, 480000, 455000, 510000, 495000, 45000000, 460000, null]
  const found = findOutliers(decs(prices))
  assert.deepEqual(found.map((o) => o.row), [7])
  assert.match(found[0].reason, /an outlier: \d+× the typical value/)
})

test('a genuine wide spread is not cut, and small or flat columns are left alone', () => {
  assert.deepEqual(findOutliers(decs([5, 50, 500, 5000, 50000, 500000, 5000000, 50000000])), [])
  assert.deepEqual(findOutliers(decs([1, 2, 3, 1000])), [])                  // too few values to judge
  assert.deepEqual(findOutliers(decs([7, 7, 7, 7, 7, 7, 7, 7, 900])), [])    // no spread to judge against
})

test('negative and mixed-sign values use the plain scale', () => {
  const found = findOutliers(decs([-2, -1, 0, 1, 2, -1, 1, 0, 250]))
  assert.deepEqual(found.map((o) => o.row), [8])
})
