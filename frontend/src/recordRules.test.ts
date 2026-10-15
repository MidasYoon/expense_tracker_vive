/// <reference types="node" />
// process.env.TZ로 컴퓨터 시간대를 바꿔 보기 위해 Node 형식을 씁니다.
import { afterEach, describe, expect, it } from 'vitest'
import { countChars, limitChars, nowKst, trimSpaces } from './recordRules.ts'

const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}'

describe('글자 수 세기 (DATA-MODEL.md 3절)', () => {
  it('코드 포인트 하나를 1자로 센다', () => {
    expect(countChars('가나다')).toBe(3)
    expect(countChars('👍')).toBe(1)
    expect(countChars(FAMILY)).toBe(7)
  })

  it('50자에서 자른다 (이모지를 반으로 자르지 않음)', () => {
    expect(limitChars('👍'.repeat(51), 50)).toBe('👍'.repeat(50))
    expect(limitChars('가'.repeat(10), 50)).toBe('가'.repeat(10))
  })
})

describe('앞뒤 띄어쓰기 지우기 (DATA-MODEL.md 3절, 서버와 같은 기준)', () => {
  it.each([
    ['  점심  ', '점심'],
    ['\t점심\n', '점심'],
    ['　점심　', '점심'],
    [' 점심 값 ', '점심 값'],
    [' \t\n　', ''],
  ])('%j → %j', (input, expected) => {
    expect(trimSpaces(input)).toBe(expected)
  })
})

describe('한국 시간 지금 (D-014)', () => {
  const originalTz = process.env.TZ
  afterEach(() => {
    process.env.TZ = originalTz
  })

  it.each(['Asia/Seoul', 'UTC', 'America/New_York'])('컴퓨터 시간대가 %s여도 한국 시간', (tz) => {
    process.env.TZ = tz
    expect(nowKst(new Date('2026-10-14T06:30:20Z'))).toEqual({ date: '2026-10-14', time: '15:30' })
    // UTC로는 14일이지만 한국 시간으로는 이미 15일
    expect(nowKst(new Date('2026-10-14T15:30:00Z'))).toEqual({ date: '2026-10-15', time: '00:30' })
  })
})
