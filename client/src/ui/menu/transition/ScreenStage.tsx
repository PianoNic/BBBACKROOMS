import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { prefersReducedMotion, setTransitioning } from "../../screenTransition";
import type { ScreenDirection } from "../../screenTransition";
import { playFootstep } from "../../../core/audio";
import { enterKeyframes, exitKeyframes, runAnimation } from "./keyframes";

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

type Entry = { key: string; children: ComponentChildren };

type Props = {
  routeKey: string;
  direction: ScreenDirection;
  overlay?: boolean;
  children: ComponentChildren;
};

export function ScreenStage({ routeKey, direction, overlay, children }: Props) {
  const [live, setLive] = useState<Entry>({ key: routeKey, children });
  const [outgoing, setOutgoing] = useState<Entry | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const incomingRef = useRef<HTMLDivElement | null>(null);
  const outgoingRef = useRef<HTMLDivElement | null>(null);
  const pending = useRef<string>(routeKey);

  useEffect(() => {
    if (routeKey === pending.current) {
      setLive({ key: routeKey, children });
      return;
    }
    pending.current = routeKey;
    setOutgoing(live);
    setLive({ key: routeKey, children });
  }, [routeKey, children]);

  useEffect(() => {
    if (!outgoing) return;
    const from = outgoingRef.current;
    const to = incomingRef.current;
    const stage = stageRef.current;
    const finish = () => {
      setOutgoing(null);
      stage?.classList.remove("is-transitioning");
      setTransitioning(false);
      to?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    };
    if (prefersReducedMotion() || !from || !to) {
      finish();
      return;
    }
    stage?.classList.add("is-transitioning");
    setTransitioning(true);
    playFootstep(0.4);
    void Promise.all([
      runAnimation(from, exitKeyframes(direction), "forwards"),
      runAnimation(to, enterKeyframes(direction), "none"),
    ]).then(finish);
  }, [outgoing]);

  return (
    <div ref={stageRef} class={overlay ? "screen-stage stage-overlay" : "screen-stage"}>
      {outgoing ? <div class="screen" ref={outgoingRef}>{outgoing.children}</div> : null}
      <div class="screen" ref={incomingRef} key={live.key}>{live.children}</div>
    </div>
  );
}
