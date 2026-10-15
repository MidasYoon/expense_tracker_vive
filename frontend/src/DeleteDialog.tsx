// S-07 지우기 확인 창 (SCREEN-SPEC.md S-07). S-05 위에 열립니다.
import type { SavedRecord } from './api.ts'
import { formatAmount, formatListDateTime } from './format.ts'

export const DELETE_QUESTION = '정말 지울까요?'
export const DELETE_WARNING = '지운 기록은 되살릴 수 없습니다.'

type Props = {
  record: SavedRecord
  // [예]를 누른 뒤 응답을 기다리는 중이면 [예]를 막습니다. [AI 제안·채택] (P-17)
  deleting: boolean
  onYes: () => void
  onNo: () => void
}

function DeleteDialog({ record, deleting, onYes, onNo }: Props) {
  const income = record.type === 'INCOME'
  return (
    <div className="modal-backdrop">
      <section className="modal modal-delete" role="dialog" aria-label="지우기 확인">
        <h2 className="modal-title">{DELETE_QUESTION}</h2>
        {/* 지울 기록은 합계 칸 바탕의 상자에 담습니다. (SCREEN-SPEC.md 10.5) */}
        <div className="delete-summary">
          <div className="record-head">
            <span className="record-when">{formatListDateTime(record.occurredAt)}</span>{' '}
            <span className={income ? 'chip chip-income' : 'chip chip-expense'}>{income ? '수입' : '지출'}</span>{' '}
            <span className={income ? 'record-amount income-amount' : 'record-amount'}>
              {formatAmount(record.amount)}
            </span>
          </div>
          {/* 메모는 자르지 않고 전부 보여 줍니다. [AI 제안·채택] (P-17) */}
          <div className="memo">{record.memo}</div>
        </div>
        <p className="delete-warning">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3.5l9.5 16.5h-19z" />
            <path d="M12 10v4.5M12 17.5v.01" />
          </svg>
          {DELETE_WARNING}
        </p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onNo}>
            아니요
          </button>
          <button type="button" className="btn btn-danger" onClick={onYes} disabled={deleting}>
            예
          </button>
        </div>
      </section>
    </div>
  )
}

export default DeleteDialog
