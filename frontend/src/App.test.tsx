import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { MESSAGES } from './recordRules.ts'

const OPTIONS = { incomeCategories: [], expenseCategories: [], paymentMethods: [] }

function stubServer(createStatus = 201) {
  const fetchMock = vi.fn(async (url: string) =>
    url === '/api/options'
      ? { ok: true, status: 200, json: async () => OPTIONS }
      : { ok: createStatus === 201, status: createStatus, json: async () => ({}) },
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('앱 열기 (P-13)', () => {
  it('앱을 열면 A-10(/api/options)을 한 번 부른다', async () => {
    const fetchMock = stubServer()

    render(<App />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/options')
  })
})

describe('S-05 ↔ S-06 (P-14)', () => {
  const openForm = () => fireEvent.click(screen.getByRole('button', { name: '+ 기록 적기' }))
  const change = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } })

  it('T-131(일부) 저장에 성공하면 창이 닫히고 위쪽에 "저장했습니다."가 보인다', async () => {
    stubServer(201)
    render(<App />)
    openForm()
    fireEvent.click(screen.getByRole('button', { name: '지출' }))
    change('금액', '12000')
    change('메모', '점심')

    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('status')).toHaveTextContent(MESSAGES.saved)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('T-133 [취소]하면 저장하지 않고, 다시 열면 칸이 처음 값으로 돌아가 있다', async () => {
    const fetchMock = stubServer()
    render(<App />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    openForm()
    change('금액', '12000')
    change('메모', '점심')

    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    openForm()

    expect((screen.getByLabelText('금액') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('메모') as HTMLInputElement).value).toBe('')
    expect(fetchMock).toHaveBeenCalledTimes(1) // A-10만 불림. A-08은 보내지 않음
  })
})
