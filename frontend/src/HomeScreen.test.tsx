import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HomeScreen from './HomeScreen.tsx'

describe('S-05 가계부 기본 화면 틀 (P-11)', () => {
  it('합계 이름과 기록 적기·순서 버튼이 보인다', () => {
    render(<HomeScreen notice={null} onAddRecord={() => {}} />)

    expect(screen.getByText('수입 합계')).toBeInTheDocument()
    expect(screen.getByText('지출 합계')).toBeInTheDocument()
    expect(screen.getByText('남은 돈')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ 기록 적기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '최근 순 ▼' })).toBeInTheDocument()
  })
})
