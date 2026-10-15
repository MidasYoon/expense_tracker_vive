// S-05 가계부 기본 화면 (SCREEN-SPEC.md S-05)
import { useState } from 'react'
import type { Options, Order, RecordList, SavedRecord } from './api.ts'
import { formatAmount, formatListDateTime } from './format.ts'
import { isStartAfterEnd, monthLabel, PERIOD_ERROR, type Month, type Period } from './period.ts'

export type View = { mode: 'month'; month: Month } | { mode: 'custom'; period: Period }

type Props = {
  // 화면 위쪽에 보여 줄 알림 (예: "저장했습니다.")
  notice: string | null
  view: View
  period: Period
  onPrevMonth: () => void
  onNextMonth: () => void
  onMonthMode: () => void
  onCustomMode: () => void
  onApplyCustom: (period: Period) => void
  order: Order
  onToggleOrder: () => void
  list: RecordList | null
  options: Options | null
  onAddRecord: () => void
  // 기록의 [지우기]. S-07을 엽니다.
  onDeleteRecord: (record: SavedRecord) => void
}

export const EMPTY_MESSAGE = '이 기간에는 기록이 없습니다.'

// 직접 고르기: 시작일 칸, 끝날 칸, [보기]. 칸의 처음 값은 지금 보던 기간입니다. [AI 제안·채택] (P-15)
function CustomPeriod({ initial, onApply }: { initial: Period; onApply: (period: Period) => void }) {
  const [draft, setDraft] = useState<Period>(initial)
  const [error, setError] = useState<string | null>(null)

  const apply = () => {
    if (draft.from === '' || draft.to === '') return
    if (isStartAfterEnd(draft)) {
      setError(PERIOD_ERROR)
      return
    }
    setError(null)
    onApply(draft)
  }

  return (
    <div>
      <label htmlFor="from">시작일</label>
      <input id="from" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
      <label htmlFor="to">끝날</label>
      <input id="to" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
      <button type="button" onClick={apply}>
        보기
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

function optionName(options: Options | null, code: string | null): string | null {
  if (code === null || options === null) return null
  const all = [...options.incomeCategories, ...options.expenseCategories, ...options.paymentMethods]
  return all.find((o) => o.code === code)?.name ?? null
}

type RecordItemProps = {
  record: SavedRecord
  options: Options | null
  onDelete: (record: SavedRecord) => void
}

function RecordItem({ record, options, onDelete }: RecordItemProps) {
  // 분류와 결제 수단 가운데 적은 것만 보여 줍니다. 둘 다 없으면 비워 둡니다. [AI 제안·채택] (P-15)
  const extras = [optionName(options, record.category), optionName(options, record.paymentMethod)].filter(Boolean)
  return (
    <li className="record">
      {/* [지우기]는 첫 줄 오른쪽 [AI 제안·채택] (P-17) */}
      <div className="record-head">
        <span>
          {formatListDateTime(record.occurredAt)} {record.type === 'INCOME' ? '수입' : '지출'}{' '}
          {formatAmount(record.amount)}
        </span>
        <button type="button" onClick={() => onDelete(record)}>
          지우기
        </button>
      </div>
      <div className="memo">{record.memo}</div>
      <div>{extras.join(' · ')}</div>
    </li>
  )
}

function HomeScreen(props: Props) {
  const { notice, view, period, list, options, order } = props
  const totals = list?.totals

  return (
    <main>
      {notice && <p role="status">{notice}</p>}

      <section aria-label="기간 고르기">
        <div>
          <button type="button" aria-pressed={view.mode === 'month'} onClick={props.onMonthMode}>
            한 달 단위
          </button>
          <button type="button" aria-pressed={view.mode === 'custom'} onClick={props.onCustomMode}>
            직접 고르기
          </button>
        </div>
        {view.mode === 'month' ? (
          <div>
            <button type="button" aria-label="이전 달" onClick={props.onPrevMonth}>
              ◀
            </button>
            <span> {monthLabel(view.month)} </span>
            <button type="button" aria-label="다음 달" onClick={props.onNextMonth}>
              ▶
            </button>
          </div>
        ) : (
          <CustomPeriod key={`${period.from}~${period.to}`} initial={period} onApply={props.onApplyCustom} />
        )}
      </section>

      <section aria-label="합계">
        <dl>
          <dt>수입 합계</dt>
          <dd>{totals && formatAmount(totals.income)}</dd>
          <dt>지출 합계</dt>
          <dd>{totals && formatAmount(totals.expense)}</dd>
          <dt>남은 돈</dt>
          {/* 마이너스이면 부호를 붙이고 빨간색으로 보여 줍니다. (SCREEN-SPEC.md S-05) */}
          <dd className={totals && totals.balance < 0 ? 'negative' : undefined}>
            {totals && formatAmount(totals.balance)}
          </dd>
        </dl>
      </section>

      <div>
        <button type="button" onClick={props.onAddRecord}>
          + 기록 적기
        </button>
      </div>
      <div>
        <button type="button" onClick={props.onToggleOrder}>
          {order === 'desc' ? '최근 순 ▼' : '오래된 순 ▼'}
        </button>
      </div>

      <section aria-label="목록">
        {list &&
          (list.records.length === 0 ? (
            <p>{EMPTY_MESSAGE}</p>
          ) : (
            <ul className="records">
              {list.records.map((record) => (
                <RecordItem key={record.id} record={record} options={options} onDelete={props.onDeleteRecord} />
              ))}
            </ul>
          ))}
      </section>
    </main>
  )
}

export default HomeScreen
