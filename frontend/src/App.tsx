import { useEffect, useState } from 'react'
import { fetchOptions, type Options } from './api.ts'
import HomeScreen from './HomeScreen.tsx'

function App() {
  // 분류·결제 수단 목록은 바뀌지 않으므로 앱을 열 때 한 번만 부릅니다. (API-SPEC.md A-10)
  // 목록 이름은 S-06(P-14)과 S-05 목록(P-15)에서 씁니다. 실패 알림은 P-18에서 더합니다.
  const [, setOptions] = useState<Options | null>(null)

  useEffect(() => {
    fetchOptions()
      .then(setOptions)
      .catch(() => {})
  }, [])

  return <HomeScreen />
}

export default App
