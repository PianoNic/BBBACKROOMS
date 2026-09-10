import { Crosshair } from "./Crosshair";
import { StaminaBar } from "./StaminaBar";
import { ReviveBar } from "./ReviveBar";
import { TaskBoard } from "./TaskBoard";
import { TaskCounter } from "./TaskCounter";
import { InventoryHud } from "./InventoryHud";
import { InteractPrompt } from "./InteractPrompt";
import { Minimap } from "./Minimap";
import { TaskCompass } from "./Compass";
import { Banner } from "./Banner";
import { Toast } from "./Toast";
import { Loading } from "./Loading";
import { IntroSplash } from "./IntroSplash";
import { HideOverlay } from "./HideOverlay";
import { TeacherSlots } from "./TeacherSlots";
import { hudActive } from "./state";

export function HudApp() {
  return (
    <>
      <Crosshair />
      <InteractPrompt />
      <Loading />
      <IntroSplash />
      <TeacherSlots />
      {hudActive.value ? (
        <>
          <TaskBoard />
          <TaskCounter />
          <StaminaBar />
          <ReviveBar />
          <InventoryHud />
          <Minimap />
          <TaskCompass />
          <Banner />
          <Toast />
          <HideOverlay />
        </>
      ) : null}
    </>
  );
}
