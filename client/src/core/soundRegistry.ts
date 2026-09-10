export type SoundDefinition = { id: string; label: string; defaults: string[] };

export const TEACHER_TAUNT_ID = "teacher.taunt";

export const SOUND_DEFINITIONS: SoundDefinition[] = [
  { id: "jumpscare.hit", label: "Jumpscare-Schrei", defaults: ["/sounds/jumpscare/scream.wav"] },
  { id: "door.open", label: "Tür öffnen", defaults: ["/sounds/actions/door-open.ogg"] },
  { id: "door.slam", label: "Tür zuschlagen", defaults: ["/sounds/actions/door-close.ogg"] },
  {
    id: "footstep.tile",
    label: "Schritte",
    defaults: [
      "/sounds/footsteps/step-1.ogg",
      "/sounds/footsteps/step-2.ogg",
      "/sounds/footsteps/step-3.ogg",
      "/sounds/footsteps/step-4.ogg",
      "/sounds/footsteps/step-5.ogg",
    ],
  },
  { id: "locker.open", label: "Spind öffnen", defaults: ["/sounds/actions/locker-open.ogg"] },
  { id: "chair.impact", label: "Stuhl-Aufprall", defaults: ["/sounds/actions/chair-impact.ogg"] },
  { id: "pickup", label: "Gegenstand aufheben", defaults: ["/sounds/actions/pickup.ogg"] },
  { id: "ping", label: "Ping-Markierung", defaults: ["/sounds/actions/ping.ogg"] },
  { id: "revive", label: "Wiederbeleben", defaults: ["/sounds/actions/revive.ogg"] },
  { id: "throw", label: "Wurf", defaults: ["/sounds/actions/throw.ogg"] },
  { id: "task.done", label: "Aufgabe erledigt", defaults: ["/sounds/actions/task-done.ogg"] },
  { id: "objective.done", label: "Ziel erledigt", defaults: ["/sounds/actions/objective-done.ogg"] },
  { id: "escape.phase", label: "Flucht-Phase beginnt", defaults: ["/sounds/actions/escape-phase.ogg"] },
  { id: "extract", label: "Extraktion", defaults: ["/sounds/actions/extract.ogg"] },
  { id: "win", label: "Sieg", defaults: ["/sounds/actions/win.ogg"] },
  { id: "wrong", label: "Falsche Eingabe", defaults: ["/sounds/actions/wrong.ogg"] },
  { id: "lever", label: "Hebel", defaults: ["/sounds/actions/lever.ogg"] },
  { id: "fusebox.door", label: "Sicherungskasten-Tür", defaults: ["/sounds/actions/fusebox-door.ogg"] },
  { id: "logo.sting", label: "Logo-Sting", defaults: ["/sounds/actions/logo-sting.ogg"] },
  { id: "ambient.drone", label: "Ambient-Drone", defaults: ["/sounds/ambient/drone.mp3"] },
  { id: TEACHER_TAUNT_ID, label: "Lehrer-Verhöhnung (allgemein)", defaults: [] },
];

export const MUSIC_DEFINITIONS: SoundDefinition[] = [
  {
    id: "music.title",
    label: "Titelmusik",
    defaults: ["/sounds/music/backroomsbaden-1.mp3", "/sounds/music/backroomsbaden-2.mp3"],
  },
  {
    id: "music.liminal",
    label: "Aufgaben-Musik",
    defaults: ["/sounds/music/liminal-lernatelier-1.mp3", "/sounds/music/liminal-lernatelier-2.mp3"],
  },
  {
    id: "music.corridor_chase",
    label: "Verfolgungsjagd-Musik",
    defaults: ["/sounds/music/korridorjagd-1.mp3", "/sounds/music/korridorjagd-2.mp3"],
  },
  {
    id: "music.extraction",
    label: "Extraktions-Musik",
    defaults: ["/sounds/music/extraktion-1.mp3", "/sounds/music/extraktion-2.mp3"],
  },
];

const urlToId = new Map<string, string>();
for (const def of [...SOUND_DEFINITIONS, ...MUSIC_DEFINITIONS]) {
  for (const url of def.defaults) urlToId.set(url, def.id);
}

export function soundIdForUrl(url: string): string | null {
  return urlToId.get(url) ?? null;
}
