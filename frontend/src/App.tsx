import { useEffect, useRef, useState } from 'react'
import { fetchOptions, fetchRecords, type Options, type Order, type RecordList } from './api.ts'
import HomeScreen, { type View } from './HomeScreen.tsx'
import { currentMonth, monthPeriod, shiftMonth, type Period } from './period.ts'
import RecordForm from './RecordForm.tsx'
import { MESSAGES } from './recordRules.ts'

// "저장했습니다."를 보여 주는 시간 [AI 제안·채택] (P-14)
const NOTICE_MS = 3000

function App() {
  // 분류·결제 수단 목록은 바뀌지 않으므로 앱을 열 때 한 번만 부릅니다. (API-SPEC.md A-10)
  // 실패 알림은 P-18에서 더합니다.
  const [options, setOptions] = useState<Options | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)

  // 앱을 열면 한 달 단위로 이번 달, 최근 순입니다. (R-009, R-012)
  // 순서는 저장·취소·기간 바꾸기 뒤에도 그대로 두고, 앱을 새로 열 때만 최근 순으로 돌아갑니다. (SCREEN-SPEC.md S-05)
  const [view, setView] = useState<View>(() => ({ mode: 'month', month: currentMonth() }))
  const [order, setOrder] = useState<Order>('desc')
  const [list, setList] = useState<RecordList | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const period: Period = view.mode === 'month' ? monthPeriod(view.month) : view.period

  useEffect(() => {
    fetchOptions()
      .then(setOptions)
      .catch(() => {})
  }, [])

  // A-07. 기간이나 순서를 빨리 바꾸면 늦게 온 이전 응답은 버립니다. [AI 제안·채택] (P-15)
  // 실패 알림은 P-18에서 더합니다.
  useEffect(() => {
    let latest = true
    fetchRecords(period.from, period.to, order)
      .then((result) => {
        if (latest) setList(result)
      })
      .catch(() => {})
    return () => {
      latest = false
    }
  }, [period.from, period.to, order, reloadKey])

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  const handleSaved = () => {
    setFormOpen(false)
    setNotice(MESSAGES.saved)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), NOTICE_MS)
    // 목록과 합계를 다시 불러옵니다. 고른 기간과 순서는 바꾸지 않습니다. (SCREEN-SPEC.md S-06)
    setReloadKey((k) => k + 1)
  }

  const moveMonth = (delta: number) => {
    if (view.mode === 'month') setView({ mode: 'month', month: shiftMonth(view.month, delta) })
  }

  return (
    <>
      <HomeScreen
        notice={notice}
        view={view}
        period={period}
        onPrevMonth={() => moveMonth(-1)}
        onNextMonth={() => moveMonth(1)}
        onMonthMode={() => setView({ mode: 'month', month: currentMonth() })}
        onCustomMode={() => {
          if (view.mode !== 'custom') setView({ mode: 'custom', period })
        }}
        onApplyCustom={(custom) => setView({ mode: 'custom', period: custom })}
        order={order}
        onToggleOrder={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
        list={list}
        options={options}
        onAddRecord={() => setFormOpen(true)}
      />
      {formOpen && (
        <RecordForm options={options} onSaved={handleSaved} onCancel={() => setFormOpen(false)} />
      )}
    </>
  )
}

export default App
