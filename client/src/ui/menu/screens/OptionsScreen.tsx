import { Button } from "../components/controls";
import { Heading, Panel, Scroll } from "../components/layout";
import { useMediaQuery } from "../components/useMediaQuery";
import { navigate } from "../routes";
import { SECTION_ORDER, SECTION_TITLES, SettingsBody } from "./options/SettingsBody";

function scrollToSection(id: string): void {
  document.getElementById(`options-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function OptionsScreen() {
  const wide = useMediaQuery("(min-width: 1100px)");

  return (
    <Panel class="options-panel">
      <Heading>OPTIONS</Heading>
      {wide ? (
        <div class="options-layout">
          <nav class="options-nav">
            {SECTION_ORDER.map((id) => (
              <button
                key={id} type="button" class="options-nav-link bb-focus"
                onClick={() => scrollToSection(id)}
              >
                {SECTION_TITLES[id]}
              </button>
            ))}
          </nav>
          <Scroll class="options-scroll">
            <SettingsBody mode="nav" />
          </Scroll>
        </div>
      ) : (
        <Scroll class="options-scroll">
          <SettingsBody mode="accordion" />
        </Scroll>
      )}
      <Button variant="back" class="screen-back" onClick={() => navigate("title", "back")}>
        ← BACK
      </Button>
    </Panel>
  );
}
