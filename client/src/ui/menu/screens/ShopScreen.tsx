import { Button } from "../components/controls";
import { Heading, Panel } from "../components/layout";
import { navigate } from "../routes";

export function ShopScreen() {
  return (
    <Panel class="shop-panel">
      <Heading>SHOP</Heading>
      <Button variant="back" class="screen-back" onClick={() => navigate("title", "back")}>
        ← BACK
      </Button>
    </Panel>
  );
}
