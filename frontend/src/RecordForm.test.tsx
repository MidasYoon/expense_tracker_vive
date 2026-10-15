/// <reference types="node" />
// S-06 기록 적기 (TEST-PLAN.md 5.1 T-121 ~ T-126)
// process.env.TZ로 컴퓨터 시간대를 바꿔 보기 위해 Node 형식을 씁니다.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Options } from './api.ts'
import RecordForm from './RecordForm.tsx'
import { MESSAGES } from './recordRules.ts'

const OPTIONS: Options = {
  incomeCategories: [
    { code: 'SALARY', name: '월급' },
    { code: 'ALLOWANCE', name: '용돈' },
  ],
  expenseCategories: [
    { code: 'FOOD', name: '식비' },
    { code: 'TRANSPORT', name: '교통' },
  ],
  paymentMethods: [{ code: 'CASH', name: '현금' }],
}

// "지금": 한국 시간 2026-10-14 15:30:20 (TEST-PLAN.md 4절)
const NOW = new Date('2026-10-14T06:30:20Z')

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function renderForm(onSaved = vi.fn(), onFailure = vi.fn()) {
  render(
    <RecordForm
      options={OPTIONS}
      onSaved={onSaved}
      onCancel={vi.fn()}
      onSubmitStart={vi.fn()}
      onFailure={onFailure}
    />,
  )
  return onSaved
}

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement
const change = (label: string, value: string) => fireEvent.change(input(label), { target: { value } })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

function fillValid() {
  click('지출')
  change('금액', '12000')
  change('메모', '점심')
}

describe('T-121 화면 검사 알림', () => {
  it.each([
    ['구분 안 고름', () => fillWithout('type'), MESSAGES.typeRequired],
    ['금액 빈칸', () => fillWithout('amount'), MESSAGES.amountTooSmall],
    ['금액 0', () => (fillValid(), change('금액', '0')), MESSAGES.amountTooSmall],
    ['금액 10억 초과', () => (fillValid(), change('금액', '1000000001')), MESSAGES.amountTooLarge],
    ['날짜 빈칸', () => (fillValid(), change('날짜', '')), MESSAGES.occurredAtRequired],
    ['시간 빈칸', () => (fillValid(), change('시간', '')), MESSAGES.occurredAtRequired],
    ['지금보다 뒤', () => (fillValid(), change('시간', '15:31')), MESSAGES.inFuture],
    ['메모 빈칸', () => fillWithout('memo'), MESSAGES.memoRequired],
    ['메모 띄어쓰기만', () => (fillValid(), change('메모', ' 　\t')), MESSAGES.memoRequired],
  ])('%s', (_, act, message) => {
    renderForm()
    act()

    click('저장')

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('지금과 같은 분은 통과한다', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderForm()
    fillValid()
    change('시간', '15:30')

    click('저장')

    expect(screen.queryByText(MESSAGES.inFuture)).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// 한 칸만 빼고 나머지를 올바르게 채움
function fillWithout(field: 'type' | 'amount' | 'memo') {
  if (field !== 'type') click('지출')
  if (field !== 'amount') change('금액', '12000')
  if (field !== 'memo') change('메모', '점심')
}

it('T-122 여러 칸이 틀리면 알림이 모두 보인다', () => {
  renderForm()

  click('저장')

  expect(screen.getByText(MESSAGES.typeRequired)).toBeInTheDocument()
  expect(screen.getByText(MESSAGES.amountTooSmall)).toBeInTheDocument()
  expect(screen.getByText(MESSAGES.memoRequired)).toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
})

describe('T-123 메모 50자', () => {
  it('51자를 적거나 붙여 넣으면 50자까지만 들어간다', () => {
    renderForm()

    change('메모', '가'.repeat(51))

    expect(input('메모').value).toBe('가'.repeat(50))
    expect(screen.getByText('50/50')).toBeInTheDocument()
  })

  it('👍는 1자로 센다', () => {
    renderForm()

    change('메모', '👍')
    expect(screen.getByText('1/50')).toBeInTheDocument()

    change('메모', '👍'.repeat(51))
    expect(input('메모').value).toBe('👍'.repeat(50))
    expect(screen.getByText('50/50')).toBeInTheDocument()
  })
})

describe('T-124 날짜·시간 처음 값', () => {
  const originalTz = process.env.TZ
  afterEach(() => {
    process.env.TZ = originalTz
  })

  it.each(['Asia/Seoul', 'UTC'])('컴퓨터 시간대 %s: 한국 시간 오늘과 지금 시각(분)', (tz) => {
    process.env.TZ = tz
    renderForm()

    expect(input('날짜').value).toBe('2026-10-14')
    expect(input('시간').value).toBe('15:30')
  })
})

it('T-125 구분을 바꾸면 분류 목록이 바뀌고 고른 분류는 지워진다', () => {
  renderForm()
  const category = screen.getByLabelText('분류') as HTMLSelectElement
  expect(category.disabled).toBe(true)

  click('지출')
  fireEvent.change(category, { target: { value: 'FOOD' } })
  expect(category.value).toBe('FOOD')

  click('수입')

  expect(category.value).toBe('')
  const names = within(category).getAllByRole('option').map((o) => o.textContent)
  expect(names).toEqual(['고르지 않음', '월급', '용돈'])
})

describe('T-126 서버가 VALIDATION_FAILED를 돌려줌', () => {
  it.each([
    ['type', 'REQUIRED', MESSAGES.typeRequired],
    ['type', 'INVALID', MESSAGES.saveFailed],
    ['amount', 'REQUIRED', MESSAGES.amountTooSmall],
    ['amount', 'TOO_SMALL', MESSAGES.amountTooSmall],
    ['amount', 'TOO_LARGE', MESSAGES.amountTooLarge],
    ['amount', 'INVALID', MESSAGES.saveFailed],
    ['occurredAt', 'REQUIRED', MESSAGES.occurredAtRequired],
    ['occurredAt', 'INVALID_FORMAT', MESSAGES.saveFailed],
    ['occurredAt', 'IN_FUTURE', MESSAGES.inFuture],
    ['memo', 'REQUIRED', MESSAGES.memoRequired],
    ['memo', 'TOO_LONG', MESSAGES.saveFailed],
    ['category', 'INVALID', MESSAGES.saveFailed],
    ['paymentMethod', 'INVALID', MESSAGES.saveFailed],
  ])('%s %s → 문구', async (field, code, message) => {
    fetchMock.mockResolvedValue({
      status: 400,
      json: async () => ({ code: 'VALIDATION_FAILED', fieldErrors: [{ field, code }] }),
    })
    const onSaved = renderForm()
    fillValid()

    click('저장')

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })
})

describe('저장', () => {
  it('통과하면 A-08로 보내고 onSaved를 부른다', async () => {
    fetchMock.mockResolvedValue({ status: 201, json: async () => ({}) })
    const onSaved = renderForm()
    click('지출')
    change('금액', '12000')
    change('메모', '  점심  ')
    fireEvent.change(screen.getByLabelText('분류'), { target: { value: 'FOOD' } })

    click('저장')

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/records')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({
      type: 'EXPENSE',
      amount: 12000,
      occurredAt: '2026-10-14T15:30',
      memo: '점심',
      category: 'FOOD',
      paymentMethod: null,
    })
  })

  it('금액 칸에는 숫자만 들어간다', () => {
    renderForm()

    change('금액', '12,000원a-1.5')

    expect(input('금액').value).toBe('1200015')
  })

  it('응답을 기다리는 동안 [저장]을 다시 눌러도 한 번만 보낸다', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderForm()
    fillValid()

    click('저장')
    click('저장')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('저장 실패 (P-18)', () => {
  it('T-911 연결 실패: 연결 실패를 알리고, 적던 내용을 남기고, 다시 보내지 않는다', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const onFailure = vi.fn()
    const onSaved = renderForm(vi.fn(), onFailure)
    fillValid()

    click('저장')

    await vi.waitFor(() => expect(onFailure).toHaveBeenCalledWith('connection'))
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(input('금액').value).toBe('12000')
    expect(input('메모').value).toBe('점심')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
  })

  it.each([415, 500])('%d: 그 밖의 서버 오류를 알리고 적던 내용을 남긴다', async (status) => {
    fetchMock.mockResolvedValue({ status, json: async () => ({ code: 'X' }) })
    const onFailure = vi.fn()
    renderForm(vi.fn(), onFailure)
    fillValid()

    click('저장')

    await vi.waitFor(() => expect(onFailure).toHaveBeenCalledWith('server'))
    expect(input('메모').value).toBe('점심')
  })

  it('VALIDATION_FAILED는 칸 아래에 알리고 화면 위쪽 실패 알림은 부르지 않는다', async () => {
    fetchMock.mockResolvedValue({
      status: 400,
      json: async () => ({ code: 'VALIDATION_FAILED', fieldErrors: [{ field: 'memo', code: 'TOO_LONG' }] }),
    })
    const onFailure = vi.fn()
    renderForm(vi.fn(), onFailure)
    fillValid()

    click('저장')

    expect(await screen.findByText(MESSAGES.saveFailed)).toBeInTheDocument()
    expect(onFailure).not.toHaveBeenCalled()
  })
})
