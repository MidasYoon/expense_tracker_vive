// S-06 기록 적기 (SCREEN-SPEC.md S-06). S-05 위에 뜨는 창입니다.
import { useState } from 'react'
import { createRecord, type Options } from './api.ts'
import {
  countChars,
  limitChars,
  MAX_MEMO_LENGTH,
  nowKst,
  serverFieldMessage,
  trimSpaces,
  validateForm,
  type FieldErrors,
  type FieldName,
  type RecordFormValues,
  type RecordType,
} from './recordRules.ts'

type Props = {
  options: Options | null
  onSaved: () => void
  onCancel: () => void
}

function initialValues(): RecordFormValues {
  const { date, time } = nowKst()
  return { type: '', amount: '', date, time, memo: '', category: '', paymentMethod: '' }
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="field-error">{message}</p> : null
}

function RecordForm({ options, onSaved, onCancel }: Props) {
  const [values, setValues] = useState<RecordFormValues>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  const set = (changes: Partial<RecordFormValues>) => setValues((v) => ({ ...v, ...changes }))

  const categories =
    values.type === 'INCOME'
      ? (options?.incomeCategories ?? [])
      : values.type === 'EXPENSE'
        ? (options?.expenseCategories ?? [])
        : []

  // 구분을 바꾸면 고른 분류는 지웁니다.
  const chooseType = (type: RecordType) => {
    if (type !== values.type) set({ type, category: '' })
  }

  const save = async () => {
    const formErrors = validateForm(values)
    setErrors(formErrors)
    if (Object.keys(formErrors).length > 0) return

    setSaving(true)
    try {
      const result = await createRecord({
        type: values.type as RecordType,
        amount: Number(values.amount),
        occurredAt: `${values.date}T${values.time}`,
        memo: trimSpaces(values.memo),
        category: values.category || null,
        paymentMethod: values.paymentMethod || null,
      })
      if (result.kind === 'saved') {
        onSaved()
        return
      }
      if (result.kind === 'invalid') {
        const serverErrors: FieldErrors = {}
        for (const { field, code } of result.fieldErrors) {
          serverErrors[field as FieldName] = serverFieldMessage(field, code)
        }
        setErrors(serverErrors)
      }
      // 연결 실패와 그 밖의 서버 오류 알림은 P-18에서 더합니다. 적던 내용은 남겨 둡니다.
    } catch {
      // 위와 같음 (P-18)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-label="기록 적기">
        <div className="field">
          <span>구분</span>
          <div>
            <button type="button" aria-pressed={values.type === 'INCOME'} onClick={() => chooseType('INCOME')}>
              수입
            </button>
            <button type="button" aria-pressed={values.type === 'EXPENSE'} onClick={() => chooseType('EXPENSE')}>
              지출
            </button>
          </div>
          <FieldError message={errors.type} />
        </div>

        <div className="field">
          <label htmlFor="amount">금액</label>
          <input
            id="amount"
            type="text"
            inputMode="numeric"
            value={values.amount}
            onChange={(e) => set({ amount: e.target.value.replace(/[^0-9]/g, '') })}
          />
          <FieldError message={errors.amount} />
        </div>

        <div className="field">
          <label htmlFor="date">날짜</label>
          <input id="date" type="date" value={values.date} onChange={(e) => set({ date: e.target.value })} />
          <label htmlFor="time">시간</label>
          <input id="time" type="time" value={values.time} onChange={(e) => set({ time: e.target.value })} />
          <FieldError message={errors.occurredAt} />
        </div>

        <div className="field">
          <label htmlFor="memo">메모</label>
          <input
            id="memo"
            type="text"
            value={values.memo}
            onChange={(e) => set({ memo: limitChars(e.target.value, MAX_MEMO_LENGTH) })}
          />
          <span>
            {countChars(values.memo)}/{MAX_MEMO_LENGTH}
          </span>
          <FieldError message={errors.memo} />
        </div>

        <div className="field">
          <label htmlFor="category">분류</label>
          <select
            id="category"
            value={values.category}
            disabled={values.type === ''}
            onChange={(e) => set({ category: e.target.value })}
          >
            <option value="">고르지 않음</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.category} />
        </div>

        <div className="field">
          <label htmlFor="paymentMethod">결제 수단</label>
          <select
            id="paymentMethod"
            value={values.paymentMethod}
            onChange={(e) => set({ paymentMethod: e.target.value })}
          >
            <option value="">고르지 않음</option>
            {(options?.paymentMethods ?? []).map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.paymentMethod} />
        </div>

        <div>
          <button type="button" onClick={save} disabled={saving}>
            저장
          </button>
          <button type="button" onClick={onCancel}>
            취소
          </button>
        </div>
      </section>
    </div>
  )
}

export default RecordForm
