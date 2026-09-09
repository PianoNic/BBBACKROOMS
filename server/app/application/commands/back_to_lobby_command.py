"""Game-over "back to lobby" trigger.

Any connected player can fire this once the round is over (`phase` in
{"won","lost"}). The lobby's runtime state is wiped and `status` flips
back to `"waiting"`. A broadcast `lobby_state` tells every client to
soft-reload — they all land back in the same lobby's waiting room and
the admin can press START again."""
from __future__ import annotations

from dataclasses import dataclass

from mediatorx import ICommand, ICommandHandler

from app.domain.lobbies.lobby import Lobby
from app.domain.lobbies.player_conn import PlayerConn


@dataclass
class BackToLobbyCommand(ICommand[bool]):
    lobby: Lobby
    player: PlayerConn


class BackToLobbyHandler(ICommandHandler[BackToLobbyCommand, bool]):
    async def handle(self, command: BackToLobbyCommand) -> bool:
        lobby = command.lobby
        # Only meaningful while the game is actually over.
        if lobby.phase not in ("won", "lost"):
            return False
        self._reset_runtime_state(lobby)
        return True

    def _reset_runtime_state(self, lobby: Lobby) -> None:
        """Wipe everything that belongs to one round. Connections + lobby
        config (admin, password, settings, chat) survive."""
        lobby.laptops.clear()
        lobby.chairs.clear()
        lobby.chair_projectiles.clear()
        lobby.lockers.clear()
        # Closets are rebuilt from the new world's props on the next start, so a
        # surviving entry would leave a phantom hideout at last round's
        # coordinates — and `hide` resolves by proximity, with no closet id.
        lobby.hideouts.clear()
        lobby.pickups.clear()
        lobby.teachers.clear()
        lobby.doors.clear()
        lobby.doors_state.clear()
        lobby.hallway_rects.clear()
        lobby.dead.clear()
        lobby.extracted.clear()
        lobby.corpses.clear()
        lobby.revives.clear()
        lobby.potion_puddles.clear()
        lobby.extraction_locked_until = 0.0
        lobby.grace_until = 0.0
        lobby.round_started_at = 0.0
        lobby.round_ended_at = 0.0
        lobby.round_rewards.clear()
        lobby.rewards_applied = False
        lobby.world = None
        lobby.phase = "tasks"
        lobby.status = "waiting"

        for p in lobby.conns.values():
            p.slow_until = p.stun_until = p.haste_until = 0.0
            p.slow_factor = p.haste_factor = 1.0
            p.medkits = p.potions = p.compasses = 0
            p.trackers = p.goggles = p.gps = 0
            p.goggles_until = p.goggles_cooldown_until = 0.0
            p.tasks_done = p.teachers_stunned = p.revives_done = p.items_collected = 0
            p.death_t = p.extracted_t = 0.0
            p.pose_dirty = False
            p.last_status = None
            # Without this a player still tucked in a closet at round end keeps a
            # dangling hideout id, and the next round drops all their move packets.
            p.hidden_in = None
