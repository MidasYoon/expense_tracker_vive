/// <reference types="node" />
// 화면 흐름 (P-13 ~ P-17). process.env.TZ를 바꾸기 위해 Node 형식을 씁니다.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordList, SavedRecord } from './api.ts'
import App from './App.tsx'
import { EMPTY_MESSAGE } from './HomeScreen.tsx'
import { PERIOD_ERROR } from './period.ts'
import { MESSAGES } from './recordRules.ts'

const OPTIONS = { incomeCategories: [], expenseCategories: [], paymentMethods: [] }
const EMPTY: RecordList = { records: [], totals: { income: 0, expense: 0, balance: 0 } }

type ListResponder = (url: string) => Promise<RecordList> | RecordList
type DeleteResponder = () => Promise<{ status: number }> | { status: number }

let fetchMock: ReturnType<typeof vi.fn>

function stubServer(list: ListResponder = () => EMPTY, remove: DeleteResponder = () => ({ status: 204 })) {
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/options') return { ok: true, status: 200, json: async () => OPTIONS }
    if (url === '/api/records' && init?.method === 'POST') return { ok: true, status: 201, json: async () => ({}) }
    if (init?.method === 'DELETE') {
      const { status } = await remove()
      return { ok: status === 204, status, json: async () => ({ code: 'RECORD_NOT_FOUND' }) }
    }
    const body = await list(url)
    return { ok: true, status: 200, json: async () => body }
  })
  vi.stubGlobal('fetch', fetchMock)
}

// 보낸 A-07 요청 주소들
const listRequests = (): string[] =>
  fetchMock.mock.calls.map((call) => call[0] as string).filter((url) => url.startsWith('/api/records?'))
const lastListRequest = () => listRequests().at(-1)

const setNow = (iso: string) => vi.setSystemTime(new Date(iso))
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

async function renderApp() {
  const result = render(<App />)
  await waitFor(() => expect(listRequests().length).toBeGreaterThan(0))
  return result
}

async function saveRecord() {
  click('+ 기록 적기')
  click('지출')
  change('금액', '12000')
  change('메모', '점심')
  const before = listRequests().length
  click('저장')
  await waitFor(() => expect(listRequests().length).toBe(before + 1))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  setNow('2026-10-14T15:30:20+09:00')
  stubServer()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('앱을 열면 A-10(/api/options)을 한 번 부른다 (P-13)', async () => {
  await renderApp()

  expect(fetchMock.mock.calls.filter((c) => c[0] === '/api/options')).toHaveLength(1)
})

it('T-211 앱을 열면 이번 달을 최근 순(order=desc)으로 요청한다', async () => {
  await renderApp()

  expect(listRequests()).toEqual(['/api/records?from=2026-10-01&to=2026-10-31&order=desc'])
})

describe('T-412 컴퓨터 시간대가 UTC여도 한국 시간 기준', () => {
  const originalTz = process.env.TZ
  afterEach(() => {
    process.env.TZ = originalTz
  })

  it('UTC 2026-10-31 15:30 → 11월을 요청한다', async () => {
    process.env.TZ = 'UTC'
    setNow('2026-10-31T15:30:00Z')

    await renderApp()

    expect(lastListRequest()).toBe('/api/records?from=2026-11-01&to=2026-11-30&order=desc')
  })
})

describe('T-413 앞뒤 달과 한 달 단위로 돌아오기', () => {
  it('2026년 12월에서 ▶ → 2027년 1월', async () => {
    setNow('2026-12-10T12:00:00+09:00')
    await renderApp()

    click('다음 달')

    expect(screen.getByText('2027년 1월')).toBeInTheDocument()
    await waitFor(() => expect(lastListRequest()).toBe('/api/records?from=2027-01-01&to=2027-01-31&order=desc'))
  })

  it('2026년 1월에서 ◀ → 2025년 12월', async () => {
    setNow('2026-01-10T12:00:00+09:00')
    await renderApp()

    click('이전 달')

    expect(screen.getByText('2025년 12월')).toBeInTheDocument()
    await waitFor(() => expect(lastListRequest()).toBe('/api/records?from=2025-12-01&to=2025-12-31&order=desc'))
  })

  it('직접 고르기에서 [한 달 단위]로 돌아오면 이번 달', async () => {
    await renderApp()
    click('다음 달')
    click('직접 고르기')
    change('시작일', '2026-01-01')
    click('보기')

    click('한 달 단위')

    expect(screen.getByText('2026년 10월')).toBeInTheDocument()
    await waitFor(() => expect(lastListRequest()).toBe('/api/records?from=2026-10-01&to=2026-10-31&order=desc'))
  })
})

describe('T-414 직접 고르기', () => {
  it('칸의 처음 값은 보던 기간', async () => {
    await renderApp()

    click('직접 고르기')

    expect((screen.getByLabelText('시작일') as HTMLInputElement).value).toBe('2026-10-01')
    expect((screen.getByLabelText('끝날') as HTMLInputElement).value).toBe('2026-10-31')
  })

  it('시작일이 끝날보다 뒤이면 알림을 보이고 요청하지 않는다', async () => {
    await renderApp()
    click('직접 고르기')
    const before = listRequests().length
    change('시작일', '2026-10-20')
    change('끝날', '2026-10-10')

    click('보기')

    expect(screen.getByText(PERIOD_ERROR)).toBeInTheDocument()
    expect(listRequests()).toHaveLength(before)
  })

  it('시작일과 끝날이 같은 날이면 요청한다', async () => {
    await renderApp()
    click('직접 고르기')
    change('시작일', '2026-10-12')
    change('끝날', '2026-10-12')

    click('보기')

    await waitFor(() => expect(lastListRequest()).toBe('/api/records?from=2026-10-12&to=2026-10-12&order=desc'))
    expect(screen.queryByText(PERIOD_ERROR)).not.toBeInTheDocument()
  })
})

describe('T-212 고른 순서 유지', () => {
  it('오래된 순으로 바꾼 뒤 ① 저장 ② 취소 ④ 기간 바꾸기에도 그대로, ⑤ 새로 열면 최근 순', async () => {
    const { unmount } = await renderApp()
    click('최근 순 ▼')
    await waitFor(() => expect(lastListRequest()).toContain('order=asc'))
    expect(screen.getByRole('button', { name: '오래된 순 ▼' })).toBeInTheDocument()

    // ① 저장
    await saveRecord()
    expect(lastListRequest()).toContain('order=asc')

    // ② 취소
    click('+ 기록 적기')
    click('취소')
    expect(screen.getByRole('button', { name: '오래된 순 ▼' })).toBeInTheDocument()

    // ④ 기간 바꾸기
    click('다음 달')
    await waitFor(() => expect(lastListRequest()).toBe('/api/records?from=2026-11-01&to=2026-11-30&order=asc'))

    // ⑤ 앱 새로 열기
    // (③ 지우기는 P-17에서 확인)
    unmount()
    render(<App />)
    await waitFor(() => expect(lastListRequest()).toBe('/api/records?from=2026-10-01&to=2026-10-31&order=desc'))
  })
})

describe('저장 뒤 (P-14에서 넘어온 T-131 나머지, T-132)', () => {
  it('T-131 저장하면 같은 기간을 다시 불러와 목록에 반영한다', async () => {
    let saved = false
    stubServer(() =>
      saved
        ? {
            records: [
              { id: 1, type: 'EXPENSE', amount: 12000, occurredAt: '2026-10-14T15:30', memo: '점심', category: null, paymentMethod: null },
            ],
            totals: { income: 0, expense: 12000, balance: -12000 },
          }
        : EMPTY,
    )
    await renderApp()
    expect(await screen.findByText(EMPTY_MESSAGE)).toBeInTheDocument()

    saved = true
    await saveRecord()

    expect(await screen.findByText('점심')).toBeInTheDocument()
    expect(screen.getByText('-12,000원')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(MESSAGES.saved)
  })

  it('T-132 보던 기간은 바뀌지 않는다', async () => {
    await renderApp()
    click('이전 달')
    await waitFor(() => expect(lastListRequest()).toContain('from=2026-09-01'))

    await saveRecord()

    expect(lastListRequest()).toBe('/api/records?from=2026-09-01&to=2026-09-30&order=desc')
    expect(screen.getByText('2026년 9월')).toBeInTheDocument()
  })
})

it('기간을 빨리 바꾸면 늦게 온 이전 응답은 버린다', async () => {
  let resolveOctober: (value: RecordList) => void = () => {}
  const november: RecordList = { records: [], totals: { income: 0, expense: 0, balance: 0 } }
  stubServer((url) =>
    url.includes('from=2026-10-01')
      ? new Promise<RecordList>((resolve) => {
          resolveOctober = resolve
        })
      : november,
  )
  await renderApp()

  click('다음 달')
  expect(await screen.findByText(EMPTY_MESSAGE)).toBeInTheDocument()
  await act(async () => {
    resolveOctober({ records: [], totals: { income: 999, expense: 0, balance: 999 } })
  })

  expect(screen.queryByText('999원')).not.toBeInTheDocument()
})

describe('지우기 (P-17)', () => {
  const RECORD: SavedRecord = {
    id: 7,
    type: 'EXPENSE',
    amount: 12000,
    occurredAt: '2026-10-12T18:30',
    memo: '저녁',
    category: null,
    paymentMethod: null,
  }
  const WITH_RECORD: RecordList = { records: [RECORD], totals: { income: 0, expense: 12000, balance: -12000 } }
  const deleteRequests = () =>
    fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'DELETE')

  async function renderWithRecord(remove?: DeleteResponder) {
    stubServer(() => WITH_RECORD, remove)
    await renderApp()
    await screen.findByText('저녁')
  }

  it('T-311 [지우기]만 누르면 S-07이 열리고 요청하지 않는다. [아니요]는 요청 없이 닫는다', async () => {
    await renderWithRecord()

    click('지우기')
    expect(within(screen.getByRole('dialog')).getByText('정말 지울까요?')).toBeInTheDocument()
    expect(deleteRequests()).toHaveLength(0)

    click('아니요')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleteRequests()).toHaveLength(0)
  })

  it('T-311 [예]는 A-09를 보내고, 성공하면 창을 닫고 A-07을 다시 부른다', async () => {
    await renderWithRecord()
    const before = listRequests().length
    click('지우기')

    click('예')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(deleteRequests().map((call) => call[0])).toEqual(['/api/records/7'])
    await waitFor(() => expect(listRequests()).toHaveLength(before + 1))
    expect(lastListRequest()).toBe('/api/records?from=2026-10-01&to=2026-10-31&order=desc')
  })

  it('T-212 ③ 오래된 순으로 바꾼 뒤 지워도 오래된 순 그대로', async () => {
    await renderWithRecord()
    click('최근 순 ▼')
    await waitFor(() => expect(lastListRequest()).toContain('order=asc'))
    click('지우기')

    click('예')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(listRequests().filter((u) => u.includes('order=asc'))).toHaveLength(2))
    expect(screen.getByRole('button', { name: '오래된 순 ▼' })).toBeInTheDocument()
  })

  it('응답을 기다리는 동안 [예]를 다시 눌러도 한 번만 보낸다', async () => {
    await renderWithRecord(() => new Promise(() => {}))
    click('지우기')

    click('예')
    click('예')

    expect(deleteRequests()).toHaveLength(1)
  })

  it('실패하면(예: 404) 알림 없이 창을 열어 둔다 (알림은 P-18)', async () => {
    await renderWithRecord(() => ({ status: 404 }))
    click('지우기')

    click('예')

    await waitFor(() => expect(screen.getByRole('button', { name: '예' })).toBeEnabled())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
