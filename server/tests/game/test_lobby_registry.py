from app.game.lobby_registry import InMemoryLobbyRegistry


def test_create_clamps_max_players_above_range():
    registry = InMemoryLobbyRegistry()
    lobby = registry.create("test", max_players=500)
    assert lobby.max_players == 100


def test_create_clamps_max_players_below_range():
    registry = InMemoryLobbyRegistry()
    lobby = registry.create("test", max_players=-5)
    assert lobby.max_players == 1


def test_create_defaults_empty_name_to_lobby_id():
    registry = InMemoryLobbyRegistry()
    lobby = registry.create("")
    assert lobby.name == f"lobby-{lobby.id}"


def test_create_strips_whitespace_only_password_to_none():
    registry = InMemoryLobbyRegistry()
    lobby = registry.create("test", password="   ")
    assert lobby.password is None


def test_create_keeps_real_password():
    registry = InMemoryLobbyRegistry()
    lobby = registry.create("test", password="secret")
    assert lobby.password == "secret"


def test_get_unknown_id_returns_none():
    registry = InMemoryLobbyRegistry()
    assert registry.get("nope") is None


def test_list_reflects_creations_and_deletions():
    registry = InMemoryLobbyRegistry()
    assert registry.list() == []
    lobby = registry.create("test")
    assert registry.list() == [lobby]
    registry.delete(lobby.id)
    assert registry.list() == []


def test_delete_unknown_id_is_a_no_op():
    registry = InMemoryLobbyRegistry()
    registry.delete("nope")
    assert registry.list() == []
