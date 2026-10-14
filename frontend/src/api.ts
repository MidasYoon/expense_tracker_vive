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
