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
  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-label="지우기 확인">
        <p>{DELETE_QUESTION}</p>
        <div>
          {formatListDateTime(record.occurredAt)} {record.type === 'INCOME' ? '수입' : '지출'}{' '}
          {formatAmount(record.amount)}
        </div>
        {/* 메모는 자르지 않고 전부 보여 줍니다. [AI 제안·채택] (P-17) */}
        <div className="memo">{record.memo}</div>
        <p>{DELETE_WARNING}</p>
        <div>
          <button type="button" onClick={onNo}>
            아니요
          </button>
          <button type="button" onClick={onYes} disabled={deleting}>
            예
          </button>
        </div>
      </section>
    </div>
  )
}

export default DeleteDialog
