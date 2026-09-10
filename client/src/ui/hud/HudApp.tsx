import { Crosshair } from "./Crosshair";
import { StaminaBar } from "./StaminaBar";
import { ReviveBar } from "./ReviveBar";
import { TaskBoard } from "./TaskBoard";
import { TaskCounter } from "./TaskCounter";
import { InventoryHud } from "./InventoryHud";
import { InteractPrompt } from "./InteractPrompt";
import { Minimap } from "./Minimap";
import { TaskCompass } from "./Compass";
import { hudActive } from "./state";

export function HudApp() {
  return (
    <>
      <Crosshair />
      <InteractPrompt />
      {hudActive.value ? (
        <>
          <TaskBoard />
          <TaskCounter />
          <StaminaBar />
          <ReviveBar />
          <InventoryHud />
          <Minimap />
          <TaskCompass />
        </>
      ) : null}
    </>
  );
}
