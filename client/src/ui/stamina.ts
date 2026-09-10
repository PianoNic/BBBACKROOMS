import { staminaValue } from "./hud/state";

export class StaminaBar {
  update(value: number): void {
    staminaValue.value = value;
  }
}
