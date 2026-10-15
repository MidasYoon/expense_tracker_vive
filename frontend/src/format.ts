// 화면 표시 형식

const numberFormat = new Intl.NumberFormat('en-US')

// 세 자리마다 쉼표, "원". 마이너스는 앞에 부호. (D-021)
export function formatAmount(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}${numberFormat.format(Math.abs(amount))}원`
}

// 목록의 날짜·시간: "2026-10-12T18:30" → "10/12 18:30" (SCREEN-SPEC.md S-05 예시)
export function formatListDateTime(occurredAt: string): string {
  const [date, time] = occurredAt.split('T')
  const [, month, day] = date.split('-')
  return `${month}/${day} ${time}`
}
