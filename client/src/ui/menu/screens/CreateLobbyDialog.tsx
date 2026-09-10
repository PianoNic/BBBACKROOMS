import { useEffect, useRef, useState } from "preact/hooks";
import { Button, TextInput } from "../components/controls";
import { Heading } from "../components/layout";
import { Modal, Overlay } from "../components/Overlay";
import { createLobbyOpen } from "../routes";
import { pickLobby } from "../state/titleFlow";
import type { LobbyInfo } from "./ServerBrowser";

const API = import.meta.env.VITE_SERVER_URL ?? "";

export function CreateLobbyDialog() {
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("8");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const close = () => { createLobbyOpen.value = false; };

  const create = async () => {
    if (busy) return;
    setBusy(true);
    const pwd = password.trim() || null;
    const max = Math.max(1, Math.min(100, parseInt(maxPlayers || "8", 10)));
    try {
      const res = await fetch(`${API}/lobbies`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, maxPlayers: max, password: pwd }),
      });
      if (!res.ok) throw new Error("create failed");
      const lobby = (await res.json()) as LobbyInfo;
      close();
      pickLobby(lobby.id, pwd ?? undefined);
    } catch {
      setBusy(false);
    }
  };

  const createRef = useRef(create);
  createRef.current = create;

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter") { e.preventDefault(); void createRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Overlay id="create-modal" onClose={close}>
      <Modal>
        <Heading>NEW LOBBY</Heading>
        <div class="bb-field">
          <label for="create-lobby-name">Name</label>
          <TextInput
            id="create-lobby-name"
            inputRef={nameRef}
            placeholder="lobby name"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="bb-field">
          <label for="create-lobby-max">Max players</label>
          <TextInput
            id="create-lobby-max"
            type="number"
            min="1"
            max="100"
            value={maxPlayers}
            onInput={(e) => setMaxPlayers((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="bb-field">
          <label for="create-lobby-pwd">Password (optional)</label>
          <TextInput
            id="create-lobby-pwd"
            type="password"
            placeholder="leave blank for no password"
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="modal-footer">
          <Button variant="back" onClick={close}>← CANCEL</Button>
          <Button variant="primary" disabled={busy} onClick={() => void create()}>CREATE</Button>
        </div>
      </Modal>
    </Overlay>
  );
}
