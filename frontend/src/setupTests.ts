import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 테스트마다 그린 화면을 지웁니다. (vitest globals를 쓰지 않아 자동으로 지워지지 않음)
afterEach(() => {
  cleanup()
})
