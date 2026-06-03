/** One-time CSS injection for the start-of-game teacher slot machine. */

let injected = false;

export function ensureTeacherSlotStyle(): void {
  if (injected) return;
  injected = true;
  const css = `
    #teacher-slots {
      position: fixed; inset: 0; z-index: 90;
      background: radial-gradient(ellipse at center, rgba(20,14,4,0.96), rgba(0,0,0,0.98));
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 28px;
      font-family: 'VT323', monospace;
      color: #f3d98a;
    }
    #teacher-slots h2 {
      margin: 0; font-family: 'Rubik Glitch', 'VT323', monospace;
      font-size: clamp(36px, 6vh, 64px); letter-spacing: 0.12em;
      color: #c8a25a; text-shadow: 0 0 18px rgba(200,162,90,0.5);
    }
    #teacher-slots .sub { color: #a78250; letter-spacing: 0.2em; font-size: 18px; }
    #teacher-slots .reels {
      display: flex; gap: 22px; padding: 22px;
      background: rgba(0,0,0,0.6);
      border: 2px solid #5a4520;
      box-shadow: inset 0 0 60px rgba(200,162,90,0.15), 0 0 60px rgba(0,0,0,0.7);
    }
    #teacher-slots .reel {
      width: 220px; height: 320px; overflow: hidden;
      background: #0a0703; border: 1px solid #6d5424;
      position: relative;
    }
    #teacher-slots .reel .strip {
      position: absolute; left: 0; right: 0; top: 0;
      display: flex; flex-direction: column;
    }
    #teacher-slots .reel .cell {
      width: 100%; height: 320px; flex: 0 0 320px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 8px;
      box-sizing: border-box;
    }
    #teacher-slots .reel .cell img {
      width: 180px; height: 180px; object-fit: cover;
      filter: contrast(1.15) saturate(0.85) brightness(0.92);
      border: 1px solid #4a3818;
    }
    #teacher-slots .reel .cell .name {
      margin-top: 8px; font-size: 20px; color: #f3d98a;
      text-align: center; line-height: 1.1;
    }
    #teacher-slots .reel .cell .ability {
      margin-top: 4px; font-size: 16px; color: #c8a25a;
      text-align: center; letter-spacing: 0.08em;
    }
    #teacher-slots .reel.locked {
      border-color: #c8a25a;
      box-shadow: 0 0 24px rgba(200,162,90,0.55), inset 0 0 24px rgba(200,162,90,0.25);
      animation: slot-lock-flash 0.5s ease-out;
    }
    @keyframes slot-lock-flash {
      0%   { background: rgba(200,162,90,0.4); }
      100% { background: #0a0703; }
    }
    #teacher-slots .descriptions {
      display: flex; gap: 22px; width: min(740px, 90vw);
      justify-content: center; min-height: 70px;
    }
    #teacher-slots .descriptions .desc {
      width: 220px; font-size: 17px; color: #d9c282;
      text-align: center; opacity: 0; transition: opacity 0.4s;
    }
    #teacher-slots .descriptions .desc.show { opacity: 1; }
    #teacher-slots .countdown {
      font-family: 'VT323', monospace; font-size: 26px;
      letter-spacing: 0.2em; color: #c8a25a;
      text-shadow: 0 0 14px rgba(200,162,90,0.4);
      opacity: 0; transition: opacity 0.4s;
    }
    #teacher-slots .countdown.show { opacity: 1; }
    #teacher-slots .countdown b { color: #f3d98a; font-weight: normal; }
  `;
  const s = document.createElement("style");
  s.textContent = css;
  document.head.appendChild(s);
}
