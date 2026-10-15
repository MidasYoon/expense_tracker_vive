// S-06 기록 적기 (SCREEN-SPEC.md S-06). S-05 위에 뜨는 창입니다.
import { useState } from 'react'
import { createRecord, type Options } from './api.ts'
import { failureOf, type Failure } from './messages.ts'
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
  // 서버로 보내기 직전. 이전 실패 알림을 지웁니다.
  onSubmitStart: () => void
  // 연결 실패나 그 밖의 서버 오류(415, 500 등). 알림은 화면 위쪽에 보이고, 이 창과 적던 내용은 남겨 둡니다.
  onFailure: (failure: Failure) => void
}

function initialValues(): RecordFormValues {
  const { date, time } = nowKst()
  return { type: '', amount: '', date, time, memo: '', category: '', paymentMethod: '' }
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="field-error">{message}</p> : null
}

function RecordForm({ options, onSaved, onCancel, onSubmitStart, onFailure }: Props) {
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
    onSubmitStart()
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
        return
      }
      onFailure('server')
    } catch (error) {
      // 자동으로 다시 보내지 않습니다. 사용자가 다시 [저장]합니다. (ARCHITECTURE.md 6절)
      onFailure(failureOf(error))
    } finally {
      setSaving(false)
    }
  }

  // 이름표는 칸 위, 날짜·시간과 분류·결제 수단은 두 칸씩 나란히 (SCREEN-SPEC.md 10.5)
  return (
    <div className="modal-backdrop">
      <section className="modal modal-form" role="dialog" aria-label="기록 적기">
        <h2 className="modal-title">기록 적기</h2>

        <div className="field">
          <span className="field-label">구분</span>
          <div className={errors.type ? 'type-choice invalid' : 'type-choice'}>
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
          <label className="field-label" htmlFor="amount">
            금액
          </label>
          <input
            id="amount"
            className="input"
            type="text"
            inputMode="numeric"
            aria-invalid={errors.amount ? true : undefined}
            value={values.amount}
            onChange={(e) => set({ amount: e.target.value.replace(/[^0-9]/g, '') })}
          />
          <FieldError message={errors.amount} />
        </div>

        <div className="field">
          <div className="field-pair">
            <div className="field">
              <label className="field-label" htmlFor="date">
                날짜
              </label>
              <input
                id="date"
                className="input"
                type="date"
                aria-invalid={errors.occurredAt ? true : undefined}
                value={values.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="time">
                시간
              </label>
              <input
                id="time"
                className="input"
                type="time"
                aria-invalid={errors.occurredAt ? true : undefined}
                value={values.time}
                onChange={(e) => set({ time: e.target.value })}
              />
            </div>
          </div>
          <FieldError message={errors.occurredAt} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="memo">
            메모
          </label>
          <input
            id="memo"
            className="input"
            type="text"
            aria-invalid={errors.memo ? true : undefined}
            value={values.memo}
            onChange={(e) => set({ memo: limitChars(e.target.value, MAX_MEMO_LENGTH) })}
          />
          <div className="field-foot">
            <FieldError message={errors.memo} />
            <span className="char-count">
              {countChars(values.memo)}/{MAX_MEMO_LENGTH}
            </span>
          </div>
        </div>

        <div className="field-pair">
          <div className="field">
            {/* "(선택)"은 이름표 밖에 둡니다. [사람 결정] (2026-10-15) */}
            <div className="field-label">
              <label htmlFor="category">분류</label> <span className="optional">(선택)</span>
            </div>
            <select
              id="category"
              className="input"
              aria-invalid={errors.category ? true : undefined}
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
            <div className="field-label">
              <label htmlFor="paymentMethod">결제 수단</label> <span className="optional">(선택)</span>
            </div>
            <select
              id="paymentMethod"
              className="input"
              aria-invalid={errors.paymentMethod ? true : undefined}
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
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            저장
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            취소
          </button>
        </div>
      </section>
    </div>
  )
}

export default RecordForm
