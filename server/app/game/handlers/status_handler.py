"""Per-player debuff state: slow auras, slow puddles, status broadcast."""
from __future__ import annotations

from app.domain.lobbies.lobby import Lobby
from app.domain.world.geom import within_radius, within_radius_xz

EQUATION_AURA_RADIUS = 6.0
EQUATION_AURA_FACTOR = 0.7


class StatusHandler:
    def apply_equation_aura(self, lobby: Lobby, now: float) -> None:
        """Slow players standing inside the equation_aura teacher's radius."""
        for t in lobby.teachers:
            if t.ability != "equation_aura":
                continue
            for p in lobby.conns.values():
                if p.id in lobby.dead or p.id in lobby.extracted:
                    continue
                if within_radius(p, t, EQUATION_AURA_RADIUS):
                    # Renew slow until just past the next tick.
                    p.slow_until = max(p.slow_until, now + 0.4)
                    if p.slow_factor > EQUATION_AURA_FACTOR:
                        p.slow_factor = EQUATION_AURA_FACTOR

    def apply_potion_puddles(self, lobby: Lobby, now: float) -> None:
        """Slow any player standing in a live puddle; expire old puddles."""
        live: list[tuple[float, float, float, float, float]] = []
        for x, z, r, until, factor in lobby.potion_puddles:
            if until <= now:
                continue
            live.append((x, z, r, until, factor))
            for p in lobby.conns.values():
                if p.id in lobby.dead or p.id in lobby.extracted:
                    continue
                if within_radius_xz(p.x, p.z, x, z, r):
                    p.slow_until = max(p.slow_until, now + 0.3)
                    if p.slow_factor > factor:
                        p.slow_factor = factor
        lobby.potion_puddles = live

    async def push_player_status(self, lobby: Lobby, now: float) -> None:
        """Send each player their current slow/stun/haste timers."""
        for p in lobby.conns.values():
            if p.id in lobby.dead or p.id in lobby.extracted:
                continue
            slow_ms = max(0, int((p.slow_until - now) * 1000))
            stun_ms = max(0, int((p.stun_until - now) * 1000))
            haste_ms = max(0, int((p.haste_until - now) * 1000))
            slow_factor = p.slow_factor if slow_ms > 0 else 1.0
            haste_factor = p.haste_factor if haste_ms > 0 else 1.0
            # Every timer is zero on the overwhelming majority of ticks; only
            # spend a frame when the payload actually differs from the last one
            # this player was sent.
            payload = (slow_ms, slow_factor, stun_ms, haste_ms, haste_factor)
            if payload != p.last_status:
                p.last_status = payload
                try:
                    await p.channel.send_json({
                        "type": "player_status",
                        "slowMs": slow_ms,
                        "slowFactor": slow_factor,
                        "stunMs": stun_ms,
                        "hasteMs": haste_ms,
                        "hasteFactor": haste_factor,
                    })
                except Exception:
                    pass
            if slow_ms <= 0:
                p.slow_factor = 1.0
            if haste_ms <= 0:
                p.haste_factor = 1.0
