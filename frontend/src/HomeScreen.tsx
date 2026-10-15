// S-05 가계부 기본 화면 (SCREEN-SPEC.md S-05)
// 기간 고르기, 합계, 목록, 순서 바꾸기는 아직 틀만 있습니다. P-15에서 채웁니다.

type Props = {
  // 화면 위쪽에 보여 줄 알림 (예: "저장했습니다.")
  notice: string | null
  onAddRecord: () => void
}

function HomeScreen({ notice, onAddRecord }: Props) {
  return (
    <main>
      {notice && <p role="status">{notice}</p>}

      <section aria-label="기간 고르기">
        <div>
          <button type="button">한 달 단위</button>
          <button type="button">직접 고르기</button>
        </div>
        <div>
          <button type="button">◀</button>
          <span></span>
          <button type="button">▶</button>
        </div>
      </section>

      <section aria-label="합계">
        <dl>
          <dt>수입 합계</dt>
          <dd></dd>
          <dt>지출 합계</dt>
          <dd></dd>
          <dt>남은 돈</dt>
          <dd></dd>
        </dl>
      </section>

      <div>
        <button type="button" onClick={onAddRecord}>
          + 기록 적기
        </button>
      </div>
      <div>
        <button type="button">최근 순 ▼</button>
      </div>

      <section aria-label="목록"></section>
    </main>
  )
}

export default HomeScreen
