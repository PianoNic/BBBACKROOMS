import { Button } from "../components/controls";
import { Heading, Panel } from "../components/layout";
import { navigate } from "../routes";

export function OptionsScreen() {
  return (
    <Panel class="options-panel">
      <Heading>OPTIONS</Heading>
      <Button variant="back" class="screen-back" onClick={() => navigate("title", "back")}>
        ← BACK
      </Button>
    </Panel>
  );
}
