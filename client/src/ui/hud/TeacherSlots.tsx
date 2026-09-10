import { teacherSlotsView } from "./state";

export function TeacherSlots() {
  const view = teacherSlotsView.value;
  if (!view) return null;
  return (
    <div id="teacher-slots">
      <h2>TONIGHT'S TEACHERS</h2>
      <div class="sub">spinning the roster…</div>
      <div class="reels">
        {view.reels.map((r, i) => (
          <div class={"reel" + (r.spinning ? " spinning" : "") + (r.locked ? " locked" : "")} key={i}>
            <div class="strip" style={{ transform: `translateY(${r.translateY}px)` }}>
              {r.cells.map((c, j) => (
                <div class="cell" key={j}>
                  <img src={c.imgSrc} alt="" />
                  <div class="name">{c.name}</div>
                  <div class="ability">{c.ability}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div class="descriptions">
        {view.descriptions.map((d, i) => (
          <div class={"desc" + (d.show ? " show" : "")} key={i}>{d.text}</div>
        ))}
      </div>
      <div class={"countdown" + (view.countdown !== null ? " show" : "")}>
        {view.countdown !== null ? (
          <>
            starting in <b>{view.countdown}</b>{view.countdown === 1 ? " second…" : " seconds…"}
          </>
        ) : null}
      </div>
    </div>
  );
}
