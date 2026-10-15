// 기간 고르기 (SCREEN-SPEC.md S-05, R-011, R-012)
import { nowKst } from './recordRules.ts'

export type Month = { year: number; month: number } // month: 1 ~ 12
export type Period = { from: string; to: string } // YYYY-MM-DD

const pad = (n: number) => String(n).padStart(2, '0')

// 이번 달은 한국 시간 기준입니다. (D-014)
export function currentMonth(now: Date = new Date()): Month {
  const [year, month] = nowKst(now).date.split('-').map(Number)
  return { year, month }
}

export function shiftMonth({ year, month }: Month, delta: number): Month {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

// 그 달 1일부터 마지막 날까지 (윤년 포함)
export function monthPeriod({ year, month }: Month): Period {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` }
}

export function monthLabel({ year, month }: Month): string {
  return `${year}년 ${month}월`
}

export const PERIOD_ERROR = '시작일은 끝날보다 뒤일 수 없습니다.'

// 직접 고른 기간의 화면 검사. 시작일과 끝날이 같은 날은 됩니다.
export function isStartAfterEnd({ from, to }: Period): boolean {
  return from > to
}
