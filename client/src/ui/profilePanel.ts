/** Right-side profile column on the server-browser screen.
    Owns the avatar cube, name input, and avatar-upload button. */
import { el } from "./dom";

const AVATAR_KEY = "bbb_avatar";
const NAME_KEY = "bbb_name";
const COLOR_KEY = "bbb_color";
const AVATAR_SIZE = 128;

export function getStoredName(): string {
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function getStoredAvatar(): string | null {
  return localStorage.getItem(AVATAR_KEY);
}

export function getStoredColor(): string {
  let c = localStorage.getItem(COLOR_KEY);
  if (!c) {
    c = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    localStorage.setItem(COLOR_KEY, c);
  }
  return c;
}

async function fileToAvatarDataUrl(file: File): Promise<string> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("image load failed"));
    img.src = url;
  });
  URL.revokeObjectURL(url);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  return canvas.toDataURL("image/jpeg", 0.8);
}

async function sampleCornerColor(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("image load failed"));
  });
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, img.width - 1, img.height - 1, 1, 1, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

export function buildProfilePanel(): HTMLElement {
  const wrap = el<HTMLDivElement>("div", "profile-panel panel-brackets");
  wrap.appendChild(el("div", "col-header", "PROFILE"));

  // Name (editable, persisted live, defaults to "player-XXXX").
  const nameRow = el<HTMLDivElement>("div", "p-name-row");
  nameRow.appendChild(el("label", undefined, "Name"));
  const nameInput = el<HTMLInputElement>("input");
  nameInput.placeholder = "your name";
  nameInput.maxLength = 24;
  if (!getStoredName()) {
    const tag = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
    localStorage.setItem(NAME_KEY, `player-${tag}`);
  }
  nameInput.value = getStoredName();
  nameInput.oninput = () => localStorage.setItem(NAME_KEY, nameInput.value);
  nameRow.appendChild(nameInput);
  wrap.appendChild(nameRow);

  // Spinning voxel cube — proportions match the in-game player box.
  const stage = el<HTMLDivElement>("div", "p-avatar-stage");
  const cube = el<HTMLDivElement>("div", "p-cube");
  const img = el<HTMLImageElement>("img", "p-cube-face-img");
  const front = el<HTMLDivElement>("div", "face front");
  front.appendChild(img);
  const back = el<HTMLDivElement>("div", "face back");
  const left = el<HTMLDivElement>("div", "face left");
  const right = el<HTMLDivElement>("div", "face right");
  const top = el<HTMLDivElement>("div", "face top");
  const bottom = el<HTMLDivElement>("div", "face bottom");
  cube.append(front, back, left, right, top, bottom);
  stage.appendChild(cube);
  wrap.appendChild(stage);

  const playerColor = getStoredColor();
  const sideFaces = [back, left, right, top, bottom];

  const repaint = async (avatarDataUrl: string | null) => {
    if (avatarDataUrl) {
      img.src = avatarDataUrl;
      img.style.display = "";
      front.style.background = "transparent";
      const side = await sampleCornerColor(avatarDataUrl).catch(() => playerColor);
      for (const f of sideFaces) f.style.background = side;
    } else {
      img.style.display = "none";
      for (const f of [front, ...sideFaces]) f.style.background = playerColor;
    }
  };
  void repaint(getStoredAvatar());

  // Change-avatar control.
  const fileInput = el<HTMLInputElement>("input", "file-input-hidden");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  const changeBtn = el<HTMLButtonElement>("button", "menu-btn change-avatar", "CHANGE AVATAR");
  changeBtn.type = "button";
  changeBtn.onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    const dataUrl = await fileToAvatarDataUrl(f);
    localStorage.setItem(AVATAR_KEY, dataUrl);
    await repaint(dataUrl);
  };
  wrap.append(changeBtn, fileInput);
  return wrap;
}
