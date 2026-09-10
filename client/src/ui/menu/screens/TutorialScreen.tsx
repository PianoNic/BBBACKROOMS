import { Button } from "../components/controls";
import { Heading, Panel } from "../components/layout";
import { navigate } from "../routes";

export function TutorialScreen() {
  return (
    <Panel class="tutorial-panel">
      <Heading>HOW TO PLAY</Heading>
      <Button variant="back" class="screen-back" onClick={() => navigate("title", "back")}>
        ← BACK
      </Button>
    </Panel>
  );
}
