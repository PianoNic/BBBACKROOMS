import { signal } from "@preact/signals";
import type { ToastAction } from "../toast";

export const hudActive = signal(false);

export const staminaValue = signal(1);
export const reviveProgress = signal(-1);

export type TaskRow = { text: string; done: boolean };
export const tasks = signal<TaskRow[]>([]);
export const taskCounter = signal("0 / 0");

export type InventoryCounts = {
  medkits: number;
  potions: number;
  compasses: number;
  trackers: number;
  goggles: number;
  gps: number;
};
export const inventoryCounts = signal<InventoryCounts>({
  medkits: 0, potions: 0, compasses: 0, trackers: 0, goggles: 0, gps: 0,
});

export type GogglesHintState = "idle" | "active" | "cooldown";
export type GogglesHint = { text: string; state: GogglesHintState };
export const gogglesHint = signal<GogglesHint>({ text: "[F]", state: "idle" });

export const compassEnabled = signal(false);
export const compassLabel = signal("");

export const interactLabel = signal<string | null>(null);
export const interactX = signal(0);
export const interactY = signal(0);

export const bannerText = signal("");
export const bannerVisible = signal(false);

export type ToastState = { text: string; action: ToastAction | null; visible: boolean };
export const toastState = signal<ToastState>({ text: "", action: null, visible: false });

export const loadingText = signal<string | null>(null);

export type IntroPhase = "hidden" | "visible" | "out";
export const introPhase = signal<IntroPhase>("hidden");

export const hideOverlayVisible = signal(false);

export type TeacherCellView = { imgSrc: string; name: string; ability: string };
export type ReelView = {
  cells: [TeacherCellView, TeacherCellView];
  translateY: number;
  spinning: boolean;
  locked: boolean;
};
export type TeacherSlotsView = {
  reels: ReelView[];
  descriptions: { text: string; show: boolean }[];
  countdownText: string | null;
} | null;
export const teacherSlotsView = signal<TeacherSlotsView>(null);
