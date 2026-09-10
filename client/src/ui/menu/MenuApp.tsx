import type { ComponentChildren } from "preact";
import { direction, infoOpen, route } from "./routes";
import { ScreenStage } from "./transition/ScreenStage";
import { Footnote, SocialLinks, Sysbar } from "./screens/TitleChrome";
import { TitleLogo, TitleScreen } from "./screens/TitleScreen";
import { InfoOverlay } from "./screens/InfoOverlay";
import { ServerBrowser } from "./screens/ServerBrowser";
import { OptionsScreen } from "./screens/OptionsScreen";
import { ShopScreen } from "./screens/ShopScreen";
import { TutorialScreen } from "./screens/TutorialScreen";
import { LobbyRoom } from "./screens/LobbyRoom";

function titleScreenFor(name: string): ComponentChildren {
  switch (name) {
    case "servers": return <ServerBrowser />;
    case "options": return <OptionsScreen />;
    case "shop": return <ShopScreen />;
    case "tutorial": return <TutorialScreen />;
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
    </>
  );
}
