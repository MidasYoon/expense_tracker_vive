// 화면과 서버가 주고받는 요청 (API-SPEC.md)
// 서버에 연결하지 못하면 fetch가 TypeError를 던집니다. 응답이 왔지만 실패면 Error를 던지거나 결과로 돌려줍니다.
// (실패 종류 나누기: messages.ts의 failureOf)

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

export type SavedRecord = {
  id: number
  type: 'INCOME' | 'EXPENSE'
  amount: number
  occurredAt: string
  memo: string
  category: string | null
  paymentMethod: string | null
}

export type Totals = { income: number; expense: number; balance: number }

export type RecordList = { records: SavedRecord[]; totals: Totals }

export type Order = 'desc' | 'asc'

// A-07 기간 목록과 합계
export async function fetchRecords(from: string, to: string, order: Order): Promise<RecordList> {
  const response = await fetch(`/api/records?from=${from}&to=${to}&order=${order}`)
  if (!response.ok) {
    throw new Error(`A-07 failed: ${response.status}`)
  }
  return response.json()
}

// A-09 기록 지우기. 404는 다른 탭에서 이미 지운 기록입니다. (API-SPEC.md A-09)
export async function deleteRecord(id: number): Promise<'deleted' | 'notFound' | 'failed'> {
  const response = await fetch(`/api/records/${id}`, { method: 'DELETE' })
  if (response.status === 204) return 'deleted'
  if (response.status === 404) return 'notFound'
  return 'failed'
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
