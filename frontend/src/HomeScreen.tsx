// S-05 가계부 기본 화면 (SCREEN-SPEC.md S-05)
// P-11에서는 배치만 둔 틀입니다. 버튼 동작, 금액, 목록은 P-14 ~ P-18에서 채웁니다.

function HomeScreen() {
  return (
    <main>
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
        <button type="button">+ 기록 적기</button>
      </div>
      <div>
        <button type="button">최근 순 ▼</button>
      </div>

      <section aria-label="목록"></section>
    </main>
  )
}

export default HomeScreen
