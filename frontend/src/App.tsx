import { useEffect, useRef, useState } from 'react'
import { fetchOptions, type Options } from './api.ts'
import HomeScreen from './HomeScreen.tsx'
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

  useEffect(() => {
    fetchOptions()
      .then(setOptions)
      .catch(() => {})
  }, [])

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  const handleSaved = () => {
    setFormOpen(false)
    setNotice(MESSAGES.saved)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), NOTICE_MS)
    // 목록과 합계를 다시 불러오는 일은 P-15에서 더합니다.
  }

  return (
    <>
      <HomeScreen notice={notice} onAddRecord={() => setFormOpen(true)} />
      {formOpen && (
        <RecordForm options={options} onSaved={handleSaved} onCancel={() => setFormOpen(false)} />
      )}
    </>
  )
}

export default App
