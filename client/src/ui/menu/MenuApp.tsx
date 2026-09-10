import type { ComponentChildren } from "preact";
import { direction, infoOpen, packEditorOpen, route, settingsOverlayOpen } from "./routes";
import { ScreenStage } from "./transition/ScreenStage";
import { Footnote, SocialLinks, Sysbar } from "./screens/TitleChrome";
import { TitleLogo, TitleScreen } from "./screens/TitleScreen";
import { InfoOverlay } from "./screens/InfoOverlay";
import { ServerBrowser } from "./screens/ServerBrowser";
import { OptionsScreen } from "./screens/OptionsScreen";
import { PackEditor } from "./screens/PackEditor";
import { SettingsOverlay } from "./screens/options/SettingsOverlay";
import { ShopScreen } from "./screens/ShopScreen";
import { TutorialScreen } from "./screens/TutorialScreen";
import { NewsScreen } from "./screens/NewsScreen";
import { LobbyRoom } from "./screens/LobbyRoom";
import { PauseMenu } from "./screens/PauseMenu";
import { EndgameOverlay } from "./screens/EndgameOverlay";
import { endgame, pauseMenu } from "./state/overlays";
import { packEditorRoster, refreshPacks } from "./state/packs";

function titleScreenFor(name: string): ComponentChildren {
  switch (name) {
    case "servers": return <ServerBrowser />;
    case "options": return <OptionsScreen />;
    case "shop": return <ShopScreen />;
    case "tutorial": return <TutorialScreen />;
    case "news": return <NewsScreen />;
    default: return <TitleScreen />;
  }
}

export function MenuApp() {
  const current = route.value;
  const inTitle = current !== null && current !== "lobby";

  return (
    <>
      {inTitle ? (
        <div id="title" class="bb-screen">
          <Sysbar />
          <TitleLogo />
          <ScreenStage routeKey={current} direction={direction.value}>
            {titleScreenFor(current)}
          </ScreenStage>
          <Footnote />
          <SocialLinks />
        </div>
      ) : null}
      {current === "lobby" ? (
        <ScreenStage routeKey="lobby" direction={direction.value} overlay>
          <LobbyRoom />
        </ScreenStage>
      ) : null}
      {infoOpen.value ? <InfoOverlay /> : null}
      {pauseMenu.value ? <PauseMenu options={pauseMenu.value} /> : null}
      {endgame.value ? <EndgameOverlay state={endgame.value} /> : null}
      {settingsOverlayOpen.value ? <SettingsOverlay /> : null}
      {packEditorOpen.value && packEditorRoster.value ? (
        <PackEditor
          roster={packEditorRoster.value}
          onClose={() => { packEditorOpen.value = false; }}
          onInstalled={() => void refreshPacks()}
        />
      ) : null}
    </>
  );
}
