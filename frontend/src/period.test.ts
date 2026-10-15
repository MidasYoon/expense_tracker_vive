/// <reference types="node" />
// process.env.TZ로 컴퓨터 시간대를 바꿔 보기 위해 Node 형식을 씁니다.
import { afterEach, describe, expect, it } from 'vitest'
import { currentMonth, isStartAfterEnd, monthLabel, monthPeriod, shiftMonth } from './period.ts'

describe('T-411 이번 달의 기간', () => {
  it.each([
    ['2026-10-14T12:00:00+09:00', '2026-10-01', '2026-10-31'],
    ['2026-02-10T12:00:00+09:00', '2026-02-01', '2026-02-28'],
    ['2028-02-10T12:00:00+09:00', '2028-02-01', '2028-02-29'],
    ['2026-04-10T12:00:00+09:00', '2026-04-01', '2026-04-30'],
  ])('지금 %s → %s ~ %s', (now, from, to) => {
    expect(monthPeriod(currentMonth(new Date(now)))).toEqual({ from, to })
  })
})

describe('T-412 컴퓨터 시간대가 UTC여도 한국 시간 기준', () => {
  const originalTz = process.env.TZ
  afterEach(() => {
    process.env.TZ = originalTz
  })

  it('UTC 2026-10-31 15:30 = 한국 시간 11/01 00:30 → 11월', () => {
    process.env.TZ = 'UTC'
    expect(monthPeriod(currentMonth(new Date('2026-10-31T15:30:00Z')))).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
    })
  })
})

it('T-413 앞뒤 달로 넘기면 해가 바뀐다', () => {
  expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
  expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
  expect(shiftMonth({ year: 2026, month: 10 }, 1)).toEqual({ year: 2026, month: 11 })
})

it('달 이름', () => {
  expect(monthLabel({ year: 2026, month: 10 })).toBe('2026년 10월')
})

it('T-414 시작일이 끝날보다 뒤인지 (같은 날은 됨)', () => {
  expect(isStartAfterEnd({ from: '2026-10-13', to: '2026-10-12' })).toBe(true)
  expect(isStartAfterEnd({ from: '2026-10-12', to: '2026-10-12' })).toBe(false)
  expect(isStartAfterEnd({ from: '2026-10-01', to: '2026-10-31' })).toBe(false)
})
