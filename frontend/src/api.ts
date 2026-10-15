// 화면과 서버가 주고받는 요청 (API-SPEC.md)

export type Option = { code: string; name: string }

export type Options = {
  incomeCategories: Option[]
  expenseCategories: Option[]
  paymentMethods: Option[]
}

// A-10 분류·결제 수단 목록
export async function fetchOptions(): Promise<Options> {
  const response = await fetch('/api/options')
  if (!response.ok) {
    throw new Error(`A-10 failed: ${response.status}`)
  }
  return response.json()
}

export type NewRecord = {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  occurredAt: string
  memo: string
  category: string | null
  paymentMethod: string | null
}

export type FieldError = { field: string; code: string }

export type CreateRecordResult =
  | { kind: 'saved' }
  | { kind: 'invalid'; fieldErrors: FieldError[] }
  | { kind: 'failed' }

// A-08 기록 적기. 연결 실패는 fetch가 오류를 던집니다.
export async function createRecord(record: NewRecord): Promise<CreateRecordResult> {
  const response = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  })
  if (response.status === 201) {
    return { kind: 'saved' }
  }
  if (response.status === 400) {
    const body = await response.json()
    if (body.code === 'VALIDATION_FAILED') {
      return { kind: 'invalid', fieldErrors: body.fieldErrors }
    }
  }
  return { kind: 'failed' }
}
