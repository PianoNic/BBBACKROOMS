/** Human-readable label + one-line description for each teacher ability id.
 * Used by the start-of-game slot machine to tell players what they're up against. */
export type AbilityCopy = { label: string; desc: string };

export const ABILITY_COPY: Record<string, AbilityCopy> = {
  // Sport
  basketball_throw: { label: "Basketball Toss", desc: "Lobs a basketball — short stun and slow." },
  dodgeball_throw:  { label: "Dodgeball Barrage", desc: "Quick dodgeball — light stun." },
  shotput_throw:    { label: "Shot Put", desc: "Heavy iron ball — long stun on hit." },
  endurance:        { label: "Endurance", desc: "Never tires, never gets stuck." },
  // ICT
  relock_laptop:    { label: "Re-lock Laptop", desc: "Resets a finished casino terminal." },
  minimap_xray:     { label: "Network X-Ray", desc: "Sees you across the school." },
  kill_flashlight:  { label: "EMP", desc: "Kills your flashlight." },
  fake_ping:        { label: "Fake Ping", desc: "Plants false pings on the minimap." },
  vent_lockout:     { label: "Vent Lockout", desc: "Locks the extraction temporarily." },
  short_teleport:   { label: "Short Teleport", desc: "Blinks closer to you." },
  corrupt_tasks:    { label: "Corrupt Tasks", desc: "Reverts a finished objective." },
  silent_steps:     { label: "Silent Steps", desc: "Footsteps make no sound." },
  lights_off:       { label: "Lights Off", desc: "Cuts the hallway lights." },
  // Berufsmaturität
  time_warp:        { label: "Time Warp", desc: "Remembers where you went." },
  fine_slow:        { label: "Legal Fine", desc: "Hits you with a slow-debuff fine." },
  lawsuit_stun:     { label: "Lawsuit", desc: "Throws a law book — heavy stun." },
  math_popup:       { label: "Math Popup", desc: "Forces you to solve an equation." },
  equation_aura:    { label: "Equation Aura", desc: "Slows everyone nearby." },
  geometry_walls:   { label: "Geometric Pathing", desc: "Takes optimal straight lines." },
  grammar_blur:     { label: "Grammar Blur", desc: "Blurs your screen with corrections." },
  french_ui:        { label: "Français", desc: "Translates the UI to French." },
  potion_throw:     { label: "Potion Flask", desc: "Throws a flask — leaves a slowing puddle." },
  room_teleport:    { label: "Room Teleport", desc: "Warps to a random room." },
  // Standalone
  taunt_shout:      { label: "Taunt", desc: "Sees you from very far away." },
  gravity_flip:     { label: "Gravity Flip", desc: "Inverts the world briefly." },
};

export function abilityCopy(id: string): AbilityCopy {
  return ABILITY_COPY[id] ?? { label: id, desc: "" };
}
