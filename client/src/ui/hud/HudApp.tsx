import { Crosshair } from "./Crosshair";
import { StaminaBar } from "./StaminaBar";
import { ReviveBar } from "./ReviveBar";
import { hudActive } from "./state";

export function HudApp() {
  return (
    <>
      <Crosshair />
      {hudActive.value ? (
        <>
          <StaminaBar />
          <ReviveBar />
        </>
      ) : null}
    </>
  );
}
