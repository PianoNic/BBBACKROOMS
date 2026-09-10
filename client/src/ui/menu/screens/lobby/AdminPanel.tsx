import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { NetClient } from "../../../../net/client";
import type { RosterEntry } from "../../../../net/protocol";
import { Button, Segmented, Slider, TextInput } from "../../components/controls";
import { TeacherGrid } from "./TeacherGrid";

const MAP_SIZES = [
  { label: "SMALL", value: 40 },
  { label: "MEDIUM", value: 60 },
  { label: "LARGE", value: 80 },
  { label: "XL", value: 120 },
];

function AdminRow(props: { label: string; class?: string; children: ComponentChildren }) {
  return (
    <div class={props.class ? `admin-row ${props.class}` : "admin-row"}>
      <label>{props.label}</label>
      {props.children}
    </div>
  );
}

export type AdminPanelProps = {
  client: NetClient;
  isAdmin: boolean;
  maxPlayers: number;
  hasPassword: boolean;
  mapSize: number;
  mapSeed: number | null;
  objectiveCount: number;
  selectedTeachers: string[] | null;
  roster: RosterEntry[];
};

export function AdminPanel(props: AdminPanelProps) {
  const { client, isAdmin } = props;
  const [password, setPassword] = useState("");
  const [seed, setSeed] = useState(props.mapSeed != null ? String(props.mapSeed) : "");
  const [objectives, setObjectives] = useState(props.objectiveCount);
  const pickMode = props.selectedTeachers !== null;
  const selected = new Set(props.selectedTeachers ?? []);

  return (
    <div class="admin-settings">
      <div class="admin-rows">
        <AdminRow label="Max players">
          <TextInput
            type="number"
            min="1"
            max="100"
            step="1"
            disabled={!isAdmin}
            value={String(props.maxPlayers)}
            onChange={(e) => {
              const raw = parseInt((e.target as HTMLInputElement).value, 10);
              const v = Math.max(1, Math.min(100, raw || 8));
              client.send({ type: "lobby_settings", maxPlayers: v });
            }}
          />
        </AdminRow>

        <AdminRow label="Password">
          <TextInput
            type="text"
            maxLength={64}
            disabled={!isAdmin}
            placeholder={props.hasPassword ? "(set — type to change)" : "(none)"}
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          />
          <div class="admin-row-actions">
            <Button
              small
              disabled={!isAdmin}
              onClick={() => {
                client.send({ type: "lobby_settings", password });
                setPassword("");
              }}
            >
              SET
            </Button>
            <Button
              small
              disabled={!isAdmin}
              onClick={() => {
                client.send({ type: "lobby_settings", clearPassword: true });
                setPassword("");
              }}
            >
              CLEAR
            </Button>
          </div>
        </AdminRow>

        <AdminRow label="Map size">
          <Segmented
            ariaLabel="Map size"
            options={MAP_SIZES}
            value={props.mapSize}
            onSelect={(value) => {
              if (isAdmin) client.send({ type: "lobby_settings", mapSize: value });
            }}
          />
        </AdminRow>

        <AdminRow label="Seed">
          <TextInput
            type="number"
            min="0"
            disabled={!isAdmin}
            placeholder="(random)"
            value={seed}
            onInput={(e) => setSeed((e.target as HTMLInputElement).value)}
          />
          <div class="admin-row-actions">
            <Button
              small
              disabled={!isAdmin}
              onClick={() => {
                const raw = seed.trim();
                if (!raw) {
                  client.send({ type: "lobby_settings", clearMapSeed: true });
                  return;
                }
                const v = parseInt(raw, 10);
                if (Number.isFinite(v)) client.send({ type: "lobby_settings", mapSeed: v });
              }}
            >
              SET
            </Button>
            <Button
              small
              disabled={!isAdmin}
              onClick={() => {
                setSeed("");
                client.send({ type: "lobby_settings", clearMapSeed: true });
              }}
            >
              RANDOM
            </Button>
          </div>
        </AdminRow>

        <AdminRow label="Objectives">
          <Slider
            min={2}
            max={12}
            step={1}
            disabled={!isAdmin}
            ariaLabel="Objectives"
            value={objectives}
            onInput={setObjectives}
            onChange={(v) => {
              const clamped = Math.max(2, Math.min(12, v || 6));
              client.send({ type: "lobby_settings", objectiveCount: clamped });
            }}
          />
          <span class="set-value">{objectives}</span>
        </AdminRow>

        <AdminRow label="Teachers" class="teachers-row">
          <Segmented
            ariaLabel="Teacher selection"
            options={[
              { label: "RANDOM (ALL)", value: "all" },
              { label: "PICK SET", value: "pick" },
            ]}
            value={pickMode ? "pick" : "all"}
            onSelect={(value) => {
              if (!isAdmin) return;
              if (value === "all") {
                client.send({ type: "lobby_settings", selectAllTeachers: true });
              } else {
                client.send({
                  type: "lobby_settings",
                  selectedTeachers: props.selectedTeachers ?? [],
                });
              }
            }}
          />
          {pickMode ? (
            <TeacherGrid
              roster={props.roster}
              selected={selected}
              isAdmin={isAdmin}
              onToggle={(image) => {
                const next = new Set(props.selectedTeachers ?? []);
                if (next.has(image)) next.delete(image);
                else next.add(image);
                client.send({ type: "lobby_settings", selectedTeachers: [...next] });
              }}
            />
          ) : null}
        </AdminRow>
      </div>
    </div>
  );
}
