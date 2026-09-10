import { useEffect, useState } from "preact/hooks";
import { laptopResult } from "../state";

export type ChallengeApi = {
  locked: boolean;
  chosen: string | null;
  outcome: "win" | "lose" | null;
  status: string;
  choose(choice: string): void;
  outcomeClassFor(choice: string): string;
};

export function useChallenge(
  send: (choice: string) => void,
  winText: string,
  loseText: string,
): ChallengeApi {
  const pkt = laptopResult.value;
  const [locked, setLocked] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"win" | "lose" | null>(null);

  useEffect(() => {
    if (!pkt) return undefined;
    setLocked(true);
    setChosen(pkt.choice ?? null);
    setOutcome(pkt.win ? "win" : "lose");
    if (!pkt.win) {
      const t = window.setTimeout(() => setLocked(false), 800);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [pkt]);

  function choose(choice: string): void {
    if (locked) return;
    setLocked(true);
    send(choice);
  }

  function outcomeClassFor(choice: string): string {
    if (chosen !== choice) return "";
    return outcome === "win" ? "ok" : outcome === "lose" ? "bad" : "";
  }

  const status = outcome === "win" ? winText : outcome === "lose" ? loseText : "";

  return { locked, chosen, outcome, status, choose, outcomeClassFor };
}
