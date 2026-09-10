import type { ComponentChildren } from "preact";
import type { LaptopChallenge, LaptopGame } from "../../net/protocol";
import { closeLaptop, laptopChallenge, laptopDone, laptopGame } from "./state";
import { BrandHeader, chromeFor, isAppShell, shellClassFor, Titlebar, Toolbar } from "./layout/chrome";
import { SlotsGame } from "./casino/slots";
import { DiceGame } from "./casino/dice";
import { CoinflipGame } from "./casino/coinflip";
import { TeamsCallApp } from "./teams/call";
import { TeamsDmApp } from "./teams/dm";
import { TeamsFileApp } from "./teams/file";
import { MoodleCourseApp } from "./moodle/course";
import { MoodleFileApp } from "./moodle/file";
import { MoodleQuizApp } from "./moodle/quiz";
import { RpgBattleApp } from "./rpg/battle";

function appFor(game: LaptopGame, challenge: LaptopChallenge): ComponentChildren {
  switch (game) {
    case "slots": return <SlotsGame />;
    case "dice": return <DiceGame />;
    case "coinflip": return <CoinflipGame />;
    case "teams_call": return <TeamsCallApp challenge={challenge} />;
    case "teams_dm": return <TeamsDmApp challenge={challenge} />;
    case "teams_file": return <TeamsFileApp challenge={challenge} />;
    case "moodle_course": return <MoodleCourseApp challenge={challenge} />;
    case "moodle_quiz": return <MoodleQuizApp challenge={challenge} />;
    case "rpg_battle": return <RpgBattleApp challenge={challenge} />;
    default: return <MoodleFileApp challenge={challenge} />;
  }
}

export function LaptopApp() {
  const game = laptopGame.value;
  if (!game) return null;

  const spec = chromeFor(game);
  const appShell = isAppShell(game);
  const challenge = laptopChallenge.value;

  return (
    <div id="laptop">
      <div class={`browser ${shellClassFor(game)}`}>
        <Titlebar title={spec.tabTitle} onClose={closeLaptop} />
        <Toolbar url={spec.url} />
        <div class={"page" + (appShell ? " page-app" : "")}>
          {!appShell ? <BrandHeader spec={spec} game={game} done={laptopDone.value} /> : null}
          <div class={appShell ? "app-wrap" : "game-wrap"}>
            {appFor(game, challenge)}
          </div>
        </div>
      </div>
    </div>
  );
}
