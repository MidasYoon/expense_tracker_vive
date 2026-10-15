// S-07 지우기 확인 창 (SCREEN-SPEC.md S-07, TEST-PLAN.md T-321 화면 부분)
import { render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { SavedRecord } from './api.ts'
import DeleteDialog, { DELETE_QUESTION, DELETE_WARNING } from './DeleteDialog.tsx'

const RECORD: SavedRecord = {
  id: 7,
  type: 'EXPENSE',
  amount: 12000,
  occurredAt: '2026-10-12T18:30',
  memo: '가'.repeat(50),
  category: 'FOOD',
  paymentMethod: null,
}

it('질문, 기록의 날짜·시간·구분·금액·메모(전부), 경고 문구, [아니요] [예]', () => {
  render(<DeleteDialog record={RECORD} deleting={false} onYes={vi.fn()} onNo={vi.fn()} />)
  const dialog = screen.getByRole('dialog')

  expect(within(dialog).getByText(DELETE_QUESTION)).toBeInTheDocument()
  expect(dialog).toHaveTextContent('10/12 18:30 지출 12,000원')
  expect(within(dialog).getByText('가'.repeat(50))).toBeInTheDocument()
  expect(within(dialog).getByText(DELETE_WARNING)).toBeInTheDocument()
  const buttons = within(dialog).getAllByRole('button').map((b) => b.textContent)
  expect(buttons).toEqual(['아니요', '예'])
})

it('지우는 중이면 [예]를 막는다', () => {
  render(<DeleteDialog record={RECORD} deleting={true} onYes={vi.fn()} onNo={vi.fn()} />)

  expect(screen.getByRole('button', { name: '예' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '아니요' })).toBeEnabled()
})
