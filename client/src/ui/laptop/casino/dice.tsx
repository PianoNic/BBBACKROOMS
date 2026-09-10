import { useEffect, useRef, useState } from "preact/hooks";
import { laptopResult, sendLaptopChoice } from "../state";

const MIN_ROLL_MS = 1200;
const TIMEOUT_MS = 6000;

const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]],
};

const VIEW = "rotateX(-18deg) rotateY(24deg)";
const FACE_TRANSFORM: Record<number, string> = {
  1: VIEW,
  2: `${VIEW} rotateY(-90deg)`,
  3: `${VIEW} rotateX(-90deg)`,
  4: `${VIEW} rotateX(90deg)`,
  5: `${VIEW} rotateY(90deg)`,
  6: `${VIEW} rotateY(180deg)`,
};

type State = "idle" | "spinning" | "settled";

function Die(props: { variant: string; face: number; spinning: boolean }) {
  return (
    <div
      class={`die die-${props.variant}${props.spinning ? " spinning" : ""}`}
      style={props.spinning ? {} : { transform: FACE_TRANSFORM[props.face] }}
    >
      {[1, 2, 3, 4, 5, 6].map((v) => (
        <div class={`face face-${v}`} key={v}>
          {PIPS[v].map(([px, py], i) => (
            <span class="pip" key={i} style={{ left: `${px * 100}%`, top: `${py * 100}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DiceGame() {
  const [state, setState] = useState<State>("idle");
  const [faces, setFaces] = useState<[number, number]>([1, 1]);
  const [status, setStatus] = useState("sum >= 7 wins");
  const [statusClass, setStatusClass] = useState("status");
  const stateRef = useRef<State>("idle");
  const spinStart = useRef(0);
  const finalRolls = useRef<[number, number] | null>(null);
  const finalWin = useRef(false);
  const finalSum = useRef(0);
  const timeoutId = useRef<number | null>(null);
  const settleTimeoutId = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const settle = (): void => {
    if (stateRef.current !== "spinning" || !finalRolls.current) return;
    setState("settled");
    setFaces(finalRolls.current);
    const win = finalWin.current;
    setStatus(win ? `WINNER ${finalSum.current}` : `${finalSum.current} - try again`);
    setStatusClass("status " + (win ? "win" : "lose"));
    if (timeoutId.current !== null) {
      window.clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
    setState("idle");
  };

  const pkt = laptopResult.value;
  useEffect(() => {
    if (!pkt || pkt.game !== "dice" || !pkt.rolls || stateRef.current !== "spinning") return;
    finalRolls.current = [
      Math.max(1, Math.min(6, pkt.rolls[0] ?? 1)),
      Math.max(1, Math.min(6, pkt.rolls[1] ?? 1)),
    ];
    finalWin.current = pkt.win;
    finalSum.current = pkt.sum ?? 0;
    const delay = Math.max(0, MIN_ROLL_MS - (performance.now() - spinStart.current));
    settleTimeoutId.current = window.setTimeout(settle, delay);
  }, [pkt]);

  useEffect(() => () => {
    if (timeoutId.current !== null) window.clearTimeout(timeoutId.current);
    if (settleTimeoutId.current !== null) window.clearTimeout(settleTimeoutId.current);
  }, []);

  const startRoll = (): void => {
    if (stateRef.current === "spinning") return;
    setState("spinning");
    stateRef.current = "spinning";
    setStatus("rolling...");
    setStatusClass("status");
    spinStart.current = performance.now();
    finalRolls.current = null;
    sendLaptopChoice();
    if (timeoutId.current !== null) window.clearTimeout(timeoutId.current);
    timeoutId.current = window.setTimeout(() => {
      if (stateRef.current === "spinning" && !finalRolls.current) {
        finalRolls.current = [1, 1];
        finalWin.current = false;
        finalSum.current = 2;
        settle();
      }
    }, TIMEOUT_MS);
  };

  return (
    <div class="game dice">
      <div class="dice-stage">
        <Die variant="a" face={faces[0]} spinning={state === "spinning"} />
        <Die variant="b" face={faces[1]} spinning={state === "spinning"} />
      </div>
      <div class="row">
        <button class="flip" disabled={state === "spinning"} onClick={startRoll}>ROLL</button>
      </div>
      <div class={statusClass}>{status}</div>
    </div>
  );
}
