import { useEffect, useRef, useState } from "preact/hooks";
import { laptopResult, sendLaptopChoice } from "../state";

const MIN_FLIP_MS = 1300;
const TIMEOUT_MS = 6000;

const FACE_TRANSFORM = {
  heads: "rotateX(0deg)",
  tails: "rotateX(180deg)",
} as const;

type Side = "heads" | "tails";
type State = "idle" | "flipping" | "settled";

export function CoinflipGame() {
  const [choice, setChoice] = useState<Side>("heads");
  const [state, setState] = useState<State>("idle");
  const [face, setFace] = useState<Side>("heads");
  const [status, setStatus] = useState("");
  const [statusClass, setStatusClass] = useState("status");
  const stateRef = useRef<State>("idle");
  const choiceRef = useRef<Side>("heads");
  const flipStart = useRef(0);
  const finalOutcome = useRef<Side | null>(null);
  const finalWin = useRef(false);
  const timeoutId = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    choiceRef.current = choice;
  }, [choice]);

  const settle = (): void => {
    if (stateRef.current !== "flipping" || !finalOutcome.current) return;
    setState("settled");
    setFace(finalOutcome.current);
    const win = finalWin.current;
    setStatus(win ? `${finalOutcome.current} - winner!` : `${finalOutcome.current} - try again`);
    setStatusClass("status " + (win ? "win" : "lose"));
    if (timeoutId.current !== null) {
      window.clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
    setState("idle");
  };

  const pkt = laptopResult.value;
  useEffect(() => {
    if (!pkt || pkt.game !== "coinflip" || !pkt.outcome || stateRef.current !== "flipping") return;
    finalOutcome.current = pkt.outcome;
    finalWin.current = pkt.win;
    const delay = Math.max(0, MIN_FLIP_MS - (performance.now() - flipStart.current));
    window.setTimeout(settle, delay);
  }, [pkt]);

  useEffect(() => () => {
    if (timeoutId.current !== null) window.clearTimeout(timeoutId.current);
  }, []);

  const startFlip = (): void => {
    if (stateRef.current === "flipping") return;
    setState("flipping");
    stateRef.current = "flipping";
    setStatus("flipping...");
    setStatusClass("status");
    flipStart.current = performance.now();
    finalOutcome.current = null;
    sendLaptopChoice(choiceRef.current);
    if (timeoutId.current !== null) window.clearTimeout(timeoutId.current);
    timeoutId.current = window.setTimeout(() => {
      if (stateRef.current === "flipping" && !finalOutcome.current) {
        finalOutcome.current = "heads";
        finalWin.current = false;
        settle();
      }
    }, TIMEOUT_MS);
  };

  return (
    <div class="game coinflip">
      <div class="coin-stage">
        <div
          class={`coin${state === "flipping" ? " flipping" : ""}`}
          style={state === "flipping" ? {} : { transform: FACE_TRANSFORM[face] }}
        >
          <div class="coin-face heads">H</div>
          <div class="coin-face tails">T</div>
        </div>
      </div>
      <div class="row">
        <button
          class={"choice" + (choice === "heads" ? " active" : "")}
          onClick={() => setChoice("heads")}
        >
          heads
        </button>
        <button
          class={"choice" + (choice === "tails" ? " active" : "")}
          onClick={() => setChoice("tails")}
        >
          tails
        </button>
      </div>
      <div class="row">
        <button class="flip" disabled={state === "flipping"} onClick={startFlip}>FLIP</button>
      </div>
      <div class={statusClass}>{status}</div>
    </div>
  );
}
