import { useEffect, useRef, useState } from 'react'
import {
  deleteRecord,
  fetchOptions,
  fetchRecords,
  type Options,
  type Order,
  type RecordList,
  type SavedRecord,
} from './api.ts'
import DeleteDialog from './DeleteDialog.tsx'
import HomeScreen, { type View } from './HomeScreen.tsx'
import { failureNotice, failureOf, NOTICES, type Failure } from './messages.ts'
import { currentMonth, monthPeriod, shiftMonth, type Period } from './period.ts'
import RecordForm from './RecordForm.tsx'
import { MESSAGES } from './recordRules.ts'

// "저장했습니다."를 보여 주는 시간 [AI 제안·채택] (P-14)
const NOTICE_MS = 3000

// 화면 위쪽 알림 줄. 하나만 두고 마지막 알림을 보여 줍니다. [AI 제안·채택] (P-18)
type Notice = { text: string; kind: 'info' | 'error' }

function App() {
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)

  // 분류·결제 수단 목록은 바뀌지 않으므로 앱을 열 때 한 번만 부릅니다. (API-SPEC.md A-10)
  const [options, setOptions] = useState<Options | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  // 앱을 열면 한 달 단위로 이번 달, 최근 순입니다. (R-009, R-012)
  // 순서는 저장·취소·기간 바꾸기 뒤에도 그대로 두고, 앱을 새로 열 때만 최근 순으로 돌아갑니다. (SCREEN-SPEC.md S-05)
  const [view, setView] = useState<View>(() => ({ mode: 'month', month: currentMonth() }))
  const [order, setOrder] = useState<Order>('desc')
  const [list, setList] = useState<RecordList | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // S-07에서 지울 기록
  const [deleteTarget, setDeleteTarget] = useState<SavedRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const period: Period = view.mode === 'month' ? monthPeriod(view.month) : view.period

  const showError = (text: string) => {
    window.clearTimeout(noticeTimer.current)
    setNotice({ text, kind: 'error' })
  }
  const showFailure = (failure: Failure) => showError(failureNotice(failure))

  // 사용자가 요청을 보내는 일을 하면 이전 실패 알림을 지웁니다. [AI 제안·채택] (P-18)
  // 저장·지우기 뒤에 저절로 다시 불러오는 요청은 지우지 않습니다. ("이미 지워진 기록입니다."가 바로 사라지지 않게)
  const clearError = () => setNotice((n) => (n?.kind === 'error' ? null : n))
  const userAction = (action: () => void) => () => {
    clearError()
    action()
  }

  // A-10 실패: 알림. 다시 하려면 새로고침합니다. 자동으로 다시 부르지 않습니다. [AI 제안·채택] (P-18)
  useEffect(() => {
    fetchOptions()
      .then(setOptions)
      .catch((error) => showFailure(failureOf(error)))
  }, [])

  // A-07. 기간이나 순서를 빨리 바꾸면 늦게 온 이전 응답은 버립니다. [AI 제안·채택] (P-15)
  // 실패하면 알림을 보이고 목록과 합계를 비웁니다. [AI 제안·채택] (P-18)
  useEffect(() => {
    let latest = true
    fetchRecords(period.from, period.to, order)
      .then((result) => {
        if (latest) setList(result)
      })
      .catch((error) => {
        if (!latest) return
        setList(null)
        showFailure(failureOf(error))
      })
    return () => {
      latest = false
    }
  }, [period.from, period.to, order, reloadKey])

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  const handleSaved = () => {
    setFormOpen(false)
    setNotice({ text: MESSAGES.saved, kind: 'info' })
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), NOTICE_MS)
    // 목록과 합계를 다시 불러옵니다. 고른 기간과 순서는 바꾸지 않습니다. (SCREEN-SPEC.md S-06)
    setReloadKey((k) => k + 1)
  }

  const handleDeleteYes = async () => {
    if (deleteTarget === null) return
    clearError()
    setDeleting(true)
    try {
      const result = await deleteRecord(deleteTarget.id)
      if (result === 'deleted' || result === 'notFound') {
        setDeleteTarget(null)
        // 다른 탭에서 이미 지운 기록이면 알리고 목록을 다시 불러옵니다. (SCREEN-SPEC.md 5절, ARCHITECTURE.md 6절)
        if (result === 'notFound') showError(NOTICES.alreadyDeleted)
        // 지운 뒤 목록과 합계를 다시 불러옵니다. 고른 기간과 순서는 바꾸지 않습니다. (SCREEN-SPEC.md S-07)
        setReloadKey((k) => k + 1)
      } else {
        // 그 밖의 서버 오류: 창을 열어 둡니다. 사용자가 [예]로 다시 하거나 [아니요]를 누릅니다. [AI 제안·채택] (P-18)
        showFailure('server')
      }
    } catch (error) {
      // 연결 실패: 위와 같음. 자동으로 다시 보내지 않습니다. (ARCHITECTURE.md 6절)
      showFailure(failureOf(error))
    } finally {
      setDeleting(false)
    }
  }

  const moveMonth = (delta: number) => {
    if (view.mode === 'month') setView({ mode: 'month', month: shiftMonth(view.month, delta) })
  }

  return (
    <>
      {/* 화면 맨 위 알림 줄. 창(S-06, S-07)보다 위에 보입니다. [AI 제안·채택] (P-18) */}
      {notice && (
        <p className={`notice-bar ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}
      <HomeScreen
        view={view}
        period={period}
        onPrevMonth={userAction(() => moveMonth(-1))}
        onNextMonth={userAction(() => moveMonth(1))}
        onMonthMode={userAction(() => setView({ mode: 'month', month: currentMonth() }))}
        onCustomMode={() => {
          if (view.mode !== 'custom') setView({ mode: 'custom', period })
        }}
        onApplyCustom={(custom) => userAction(() => setView({ mode: 'custom', period: custom }))()}
        order={order}
        onToggleOrder={userAction(() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc')))}
        list={list}
        options={options}
        onAddRecord={() => setFormOpen(true)}
        onDeleteRecord={setDeleteTarget}
      />
      {formOpen && (
        <RecordForm
          options={options}
          onSaved={handleSaved}
          onCancel={() => setFormOpen(false)}
          onSubmitStart={clearError}
          onFailure={showFailure}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          record={deleteTarget}
          deleting={deleting}
          onYes={handleDeleteYes}
          onNo={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}

export default App
