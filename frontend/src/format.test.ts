import { expect, it } from 'vitest'
import { formatAmount, formatListDateTime } from './format.ts'

it.each([
  [12000, '12,000원'],
  [-12000, '-12,000원'],
  [0, '0원'],
  [3000000000, '3,000,000,000원'],
])('T-511 금액 %d → %s', (amount, text) => {
  expect(formatAmount(amount)).toBe(text)
})

it('목록 날짜·시간 (SCREEN-SPEC.md S-05 예시)', () => {
  expect(formatListDateTime('2026-10-12T18:30')).toBe('10/12 18:30')
  expect(formatListDateTime('2026-01-05T09:05')).toBe('01/05 09:05')
})
