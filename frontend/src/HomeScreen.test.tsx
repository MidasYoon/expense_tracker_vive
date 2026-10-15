// S-05 화면 표시 (TEST-PLAN.md T-512, T-611, 목록 모양)
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Options, RecordList, SavedRecord } from './api.ts'
import HomeScreen, { EMPTY_MESSAGE } from './HomeScreen.tsx'

const OPTIONS: Options = {
  incomeCategories: [{ code: 'SALARY', name: '월급' }],
  expenseCategories: [{ code: 'FOOD', name: '식비' }],
  paymentMethods: [{ code: 'DEBIT_CARD', name: '체크카드' }],
}

const noop = () => {}

function renderHome(list: RecordList | null) {
  render(
    <HomeScreen
      view={{ mode: 'month', month: { year: 2026, month: 10 } }}
      period={{ from: '2026-10-01', to: '2026-10-31' }}
      onPrevMonth={noop}
      onNextMonth={noop}
      onMonthMode={noop}
      onCustomMode={noop}
      onApplyCustom={noop}
      order="desc"
      onToggleOrder={noop}
      list={list}
      options={OPTIONS}
      onAddRecord={noop}
      onDeleteRecord={noop}
    />,
  )
}

const record = (changes: Partial<SavedRecord>): SavedRecord => ({
  id: 1,
  type: 'EXPENSE',
  amount: 12000,
  occurredAt: '2026-10-12T18:30',
  memo: '저녁',
  category: null,
  paymentMethod: null,
  ...changes,
})

const totalsOf = (balance: number) => ({ income: 300000, expense: 300000 - balance, balance })

describe('S-05 틀', () => {
  it('기간 고르기, 합계 이름, 기록 적기·순서 버튼이 보인다', () => {
    renderHome(null)

    expect(screen.getByText('2026년 10월')).toBeInTheDocument()
    expect(screen.getByText('수입 합계')).toBeInTheDocument()
    expect(screen.getByText('지출 합계')).toBeInTheDocument()
    expect(screen.getByText('남은 돈')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ 기록 적기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '최근 순 ▼' })).toBeInTheDocument()
  })
})

describe('T-512 남은 돈 색', () => {
  it('마이너스이면 부호와 빨간색', () => {
    renderHome({ records: [], totals: totalsOf(-12000) })

    const balance = screen.getByText('-12,000원')
    expect(balance).toHaveClass('negative')
  })

  it.each([0, 5000])('%d원은 빨간색이 아니다', (balance) => {
    renderHome({ records: [], totals: totalsOf(balance) })

    const label = screen.getByText('남은 돈')
    expect(label.nextElementSibling).not.toHaveClass('negative')
  })
})

it('T-611 기록이 없는 기간', () => {
  renderHome({ records: [], totals: { income: 0, expense: 0, balance: 0 } })

  expect(screen.getByText(EMPTY_MESSAGE)).toBeInTheDocument()
  expect(screen.getAllByText('0원')).toHaveLength(3)
  // 기록 적기로 가는 안내는 없고, [+ 기록 적기] 버튼은 그대로 있음 (R-025)
  expect(screen.getAllByRole('button', { name: /기록 적기/ })).toHaveLength(1)
  expect(screen.getByRole('region', { name: '목록' }).textContent).toBe(EMPTY_MESSAGE)
})

describe('목록 한 건 (T-221 화면 부분)', () => {
  it('날짜·시간, 구분, 금액, 메모, 분류·결제 수단의 한국어 이름', () => {
    renderHome({
      records: [record({ category: 'FOOD', paymentMethod: 'DEBIT_CARD' })],
      totals: totalsOf(0),
    })

    const item = within(screen.getByRole('region', { name: '목록' })).getByRole('listitem')
    expect(item).toHaveTextContent('10/12 18:30 지출 12,000원')
    expect(item).toHaveTextContent('저녁')
    expect(item).toHaveTextContent('식비 · 체크카드')
  })

  it('하나만 적으면 그것만, 둘 다 없으면 비운다', () => {
    renderHome({
      records: [
        record({ id: 1, type: 'INCOME', category: 'SALARY' }),
        record({ id: 2, paymentMethod: 'DEBIT_CARD' }),
        record({ id: 3 }),
      ],
      totals: totalsOf(0),
    })

    const items = screen.getAllByRole('listitem')
    expect(items[0].lastElementChild!.textContent).toBe('월급')
    expect(items[0]).toHaveTextContent('수입')
    expect(items[1].lastElementChild!.textContent).toBe('체크카드')
    expect(items[2].lastElementChild!.textContent).toBe('')
  })

  it('50자 메모를 자르지 않는다', () => {
    const memo = '가'.repeat(50)
    renderHome({ records: [record({ memo })], totals: totalsOf(0) })

    expect(screen.getByText(memo)).toBeInTheDocument()
  })
})
