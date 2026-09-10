import { useState } from "preact/hooks";
import type { LobbyPlayer } from "../../../../net/protocol";
import type { LobbyMediaControls } from "../../../lobbyMediaControls";
import { icon, Volume2 } from "../../../icons";
import {
  lobbyAdminId, lobbyPlayers, lobbyRemoteStreams, lobbySelfId, lobbyWebcam,
} from "../../state/lobby";

function SpeakerIcon() {
  const [node] = useState(() => icon(Volume2, 16));
  return <span class="p-speaker" ref={(el) => { el?.appendChild(node); }} />;
}

function AvatarTile(props: { player: LobbyPlayer; media: LobbyMediaControls }) {
  const { player } = props;
  const isSelf = player.id === lobbySelfId.value;
  const webcam = lobbyWebcam.value;
  const stream = isSelf
    ? (props.media.camOn.value ? (webcam?.getLocalStream() ?? null) : null)
    : (lobbyRemoteStreams.value.get(player.id) ?? null);

  return (
    <div class="p-avatar-tile" style={{ boxShadow: `0 0 0 2px ${player.color}` }}>
      {stream ? (
        <video
          class="p-avatar-img"
          autoplay
          muted
          playsInline
          ref={(v) => { if (v) v.srcObject = stream; }}
        />
      ) : player.avatar ? (
        <img class="p-avatar-img" src={player.avatar} alt="" />
      ) : (
        <div class="p-avatar-img" style={{ background: player.color }} />
      )}
    </div>
  );
}

function VolumeSlider(props: { playerId: string; media: LobbyMediaControls }) {
  const [value, setValue] = useState(() => props.media.getPeerVolume(props.playerId));
  return (
    <div class="p-volume">
      <input
        type="range"
        class="p-volume-range"
        min="-200"
        max="200"
        step="10"
        value={value}
        onInput={(e) => {
          const v = parseInt((e.target as HTMLInputElement).value, 10);
          setValue(v);
          props.media.setPeerVolume(props.playerId, v);
        }}
      />
      <span class="p-volume-label">{value >= 0 ? `+${value}%` : `${value}%`}</span>
    </div>
  );
}

function PlayerRow(props: { player: LobbyPlayer; media: LobbyMediaControls }) {
  const [volumeOpen, setVolumeOpen] = useState(false);
  const { player, media } = props;
  const isSelf = player.id === lobbySelfId.value;
  const speaking = media.isSpeaking(player.id, lobbySelfId.value);
  const isAdmin = player.id === lobbyAdminId.value;

  return (
    <li class="player-row">
      <AvatarTile player={player} media={media} />
      <span class="p-name">{player.name}{isSelf ? "  (you)" : ""}</span>
      <span class="p-meta">
        {speaking ? <SpeakerIcon /> : null}
        {isAdmin ? <span class="p-tag">ADMIN</span> : null}
      </span>
      {!isSelf ? (
        <>
          <button
            type="button"
            class="p-volume-toggle"
            aria-expanded={volumeOpen}
            onClick={() => setVolumeOpen((v) => !v)}
          >
            VOL
          </button>
          <div class={volumeOpen ? "p-volume-cell is-open" : "p-volume-cell"}>
            <VolumeSlider playerId={player.id} media={media} />
          </div>
        </>
      ) : <span class="p-volume-toggle" aria-hidden="true" />}
    </li>
  );
}

export function PlayersList(props: { media: LobbyMediaControls }) {
  const players = [...lobbyPlayers.value.values()];

  return (
    <ul class="players-list">
      {players.map((p) => <PlayerRow key={p.id} player={p} media={props.media} />)}
    </ul>
  );
}
