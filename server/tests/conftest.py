from __future__ import annotations

import peewee_async
import pytest

from app.db.models import ALL_MODELS
from app.domain.lobbies.chair import Chair
from app.domain.lobbies.hideout import Hideout
from app.domain.lobbies.lobby import Lobby
from app.domain.lobbies.player_conn import PlayerConn
from app.infrastructure.persistence.engine import DatabaseEngine


class FakeChannel:
    def __init__(self) -> None:
        self.json_sent: list[dict] = []
        self.text_sent: list[str] = []

    async def send_json(self, pkt: dict) -> None:
        self.json_sent.append(pkt)

    async def send_text(self, payload: str) -> None:
        self.text_sent.append(payload)


class FakeGrid:
    def __init__(self, width: int, height: int) -> None:
        self.width = width
        self.height = height
        self.cells = [1] * (width * height)   # 1 == walkable

    def block(self, cx: int, cz: int) -> None:
        self.cells[cz * self.width + cx] = 0


class FakeWorld:
    def __init__(self, grid: FakeGrid) -> None:
        self.grid = grid


def make_lobby(width: int = 40, height: int = 40) -> Lobby:
    lobby = Lobby(id="test", name="test")
    lobby.status = "running"
    lobby.world = FakeWorld(FakeGrid(width, height))
    return lobby


def add_player(
    lobby: Lobby, pid: str = "p1", x: float = 0.0, z: float = 0.0,
) -> PlayerConn:
    p = PlayerConn(id=pid, name=pid, color="#ffffff", channel=FakeChannel())
    p.x, p.z = x, z
    p.ready = True
    lobby.conns[pid] = p
    return p


def add_hideout(
    lobby: Lobby, hid: str, x: float, z: float, occupied_by: str | None = None,
) -> Hideout:
    ho = Hideout(id=hid, x=x, z=z, yaw=0.0, occupied_by=occupied_by)
    lobby.hideouts[hid] = ho
    return ho


def add_chair(lobby: Lobby, cid: str, x: float, z: float, held_by: str | None = None) -> Chair:
    chair = Chair(
        id=cid, home_x=x, home_z=z, home_yaw=0.0, x=x, z=z, yaw=0.0,
        held_by=held_by,
    )
    lobby.chairs[cid] = chair
    return chair


@pytest.fixture
def lobby() -> Lobby:
    return make_lobby()


class ReadyDatabaseEngine(DatabaseEngine):
    @property
    def is_available(self) -> bool:
        return True


@pytest.fixture
async def account_engine(tmp_path):
    db = peewee_async.SqliteDatabase(str(tmp_path / "accounts.sqlite"))
    with db.bind_ctx(ALL_MODELS):
        with db.allow_sync():
            db.create_tables(ALL_MODELS)
        engine = ReadyDatabaseEngine(db)
        yield engine
    await db.aio_close()
