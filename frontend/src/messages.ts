// 공통 알림 문구 (SCREEN-SPEC.md 5절). 화면 위쪽에 보여 줍니다.

export const NOTICES = {
  connectionFailed: '서버에 연결하지 못했습니다. 서버가 켜져 있는지 확인하고 다시 시도해 주세요.',
  alreadyDeleted: '이미 지워진 기록입니다.',
  requestFailed: '요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
}

export type Failure = 'connection' | 'server'

// 실패의 종류: 응답이 아예 없으면 연결 실패, 응답이 왔지만 처리하지 못했으면 그 밖의 서버 오류
export function failureOf(error: unknown): Failure {
  // fetch는 서버에 연결하지 못하면 TypeError를 던집니다.
  return error instanceof TypeError ? 'connection' : 'server'
}

export function failureNotice(failure: Failure): string {
  return failure === 'connection' ? NOTICES.connectionFailed : NOTICES.requestFailed
}
