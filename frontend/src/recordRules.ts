// 기록 적기 화면 검사 규칙 (SCREEN-SPEC.md S-06, DATA-MODEL.md 3절)
// 서버 검사(backend/app/records.py)와 같은 기준이어야 합니다.

export const MAX_AMOUNT = 1_000_000_000
export const MAX_MEMO_LENGTH = 50

// 공백 글자: 서버 Python의 str.strip()이 지우는 글자와 같은 목록입니다.
// 보통 띄어쓰기, 탭, 줄바꿈, 전각 띄어쓰기(U+3000) 등을 모두 포함합니다. (DATA-MODEL.md 3절)
const SPACE_CHARS =
  '\\t\\n\\v\\f\\r\\u001c-\\u001f \\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000'
const EDGE_SPACES = new RegExp(`^[${SPACE_CHARS}]+|[${SPACE_CHARS}]+$`, 'g')

export function trimSpaces(text: string): string {
  return text.replace(EDGE_SPACES, '')
}

// 유니코드 글자(코드 포인트) 하나를 1자로 셉니다. .length는 이모지를 2자로 셀 수 있어 쓰지 않습니다.
export function countChars(text: string): number {
  return Array.from(text).length
}

export function limitChars(text: string, max: number): string {
  const chars = Array.from(text)
  return chars.length <= max ? text : chars.slice(0, max).join('')
}

// 한국 시간 기준 지금 (D-014). 컴퓨터의 시간대와 상관없이 한국 시간으로 셉니다.
export function nowKst(now: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

export type RecordType = 'INCOME' | 'EXPENSE'

export type RecordFormValues = {
  type: RecordType | ''
  amount: string
  date: string
  time: string
  memo: string
  category: string
  paymentMethod: string
}

export type FieldName = 'type' | 'amount' | 'occurredAt' | 'memo' | 'category' | 'paymentMethod'
export type FieldErrors = Partial<Record<FieldName, string>>

// 알림 문구 (SCREEN-SPEC.md S-06 "알림", 5절)
export const MESSAGES = {
  typeRequired: '수입인지 지출인지 골라 주세요.',
  amountTooSmall: '금액은 0원보다 커야 합니다.',
  amountTooLarge: '금액은 10억 원까지 적을 수 있습니다.',
  occurredAtRequired: '날짜와 시간을 적어 주세요.',
  inFuture: '지금보다 뒤의 날짜와 시간은 저장할 수 없습니다.',
  memoRequired: '메모를 적어 주세요.',
  saveFailed: '저장하지 못했습니다. 입력한 내용을 확인해 주세요.',
  saved: '저장했습니다.',
}

// [저장]을 눌렀을 때 하는 화면 검사. 틀린 칸을 모두 돌려줍니다.
export function validateForm(values: RecordFormValues, now: Date = new Date()): FieldErrors {
  const errors: FieldErrors = {}

  if (values.type === '') {
    errors.type = MESSAGES.typeRequired
  }

  const amount = values.amount === '' ? 0 : Number(values.amount)
  if (amount <= 0) {
    errors.amount = MESSAGES.amountTooSmall
  } else if (amount > MAX_AMOUNT) {
    errors.amount = MESSAGES.amountTooLarge
  }

  if (values.date === '' || values.time === '') {
    errors.occurredAt = MESSAGES.occurredAtRequired
  } else {
    // 분 단위로 비교합니다. 지금과 같은 분은 저장됩니다. (DATA-MODEL.md 5절)
    const current = nowKst(now)
    if (`${values.date}T${values.time}` > `${current.date}T${current.time}`) {
      errors.occurredAt = MESSAGES.inFuture
    }
  }

  if (trimSpaces(values.memo) === '') {
    errors.memo = MESSAGES.memoRequired
  }

  return errors
}

// 서버가 돌려준 칸별 오류 코드의 문구 (API-SPEC.md 4절)
export function serverFieldMessage(field: string, code: string): string {
  if (field === 'type' && code === 'REQUIRED') return MESSAGES.typeRequired
  if (field === 'amount' && (code === 'REQUIRED' || code === 'TOO_SMALL')) return MESSAGES.amountTooSmall
  if (field === 'amount' && code === 'TOO_LARGE') return MESSAGES.amountTooLarge
  if (field === 'occurredAt' && code === 'REQUIRED') return MESSAGES.occurredAtRequired
  if (field === 'occurredAt' && code === 'IN_FUTURE') return MESSAGES.inFuture
  if (field === 'memo' && code === 'REQUIRED') return MESSAGES.memoRequired
  return MESSAGES.saveFailed
}
