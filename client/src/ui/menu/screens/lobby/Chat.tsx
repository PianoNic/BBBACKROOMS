import { useEffect, useRef, useState } from "preact/hooks";
import type { NetClient } from "../../../../net/client";
import { Button, TextInput } from "../../components/controls";
import { lobbyChat, lobbyPlayers } from "../../state/lobby";

export function Chat(props: { client: NetClient }) {
  const [text, setText] = useState("");
  const logRef = useRef<HTMLDivElement | null>(null);
  const messages = lobbyChat.value;

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length]);

  const send = (): void => {
    const t = text.trim();
    if (!t) return;
    props.client.send({ type: "chat_send", text: t });
    setText("");
  };

  return (
    <>
      <div class="bb-scroll chat-log" ref={logRef}>
        {messages.map((m) => (
          <div class="chat-line" key={`${m.author}-${m.ts}-${m.text}`}>
            <span class="chat-author">{lobbyPlayers.value.get(m.author)?.name ?? m.author.slice(0, 6)}</span>
            <span class="chat-text">{m.text}</span>
          </div>
        ))}
      </div>
      <form
        class="chat-form"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <TextInput
          placeholder="say something…"
          maxLength={300}
          value={text}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
        />
        <Button type="submit">SEND</Button>
      </form>
    </>
  );
}
