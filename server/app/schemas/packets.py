"""Pydantic models for inbound client packets.

A discriminated union on `type` lets us validate and dispatch in one step
instead of pulling raw strings out of dicts.
"""
from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field, TypeAdapter


class MovePkt(BaseModel):
    type: Literal["move"]
    x: float
    z: float
    yaw: float


class InteractPkt(BaseModel):
    type: Literal["interact"]


class GambleOpenPkt(BaseModel):
    type: Literal["gamble_open"]


class GamblePlayPkt(BaseModel):
    type: Literal["gamble_play"]
    laptopId: str
    # Casino coinflip uses "heads"/"tails"; challenge laptops (Teams/Moodle)
    # send the option label the player picked. Cap length to keep payload sane.
    choice: str | None = Field(default=None, max_length=200)


class SetAvatarPkt(BaseModel):
    type: Literal["set_avatar"]
    avatar: str = Field(max_length=200_000)


class ChatSendPkt(BaseModel):
    type: Literal["chat_send"]
    text: str = Field(max_length=300)


class StartGamePkt(BaseModel):
    type: Literal["start_game"]


class SetNamePkt(BaseModel):
    type: Literal["set_name"]
    name: str = Field(max_length=24)


class ChairPickupPkt(BaseModel):
    type: Literal["chair_pickup"]
    chairId: str


class ChairThrowPkt(BaseModel):
    type: Literal["chair_throw"]
    dirX: float
    dirZ: float


class ChairDropPkt(BaseModel):
    type: Literal["chair_drop"]


class WebRTCSignalPkt(BaseModel):
    """Relay an SDP offer/answer or an ICE candidate to a single peer.

    Server is a dumb pipe here — it does NOT inspect the payload. The whole
    contract is: "deliver `data` to peer `to`, tagged with sender id".
    `data` is opaque JSON: typically {sdp, type:"offer"|"answer"} or
    {candidate, sdpMid, sdpMLineIndex}.
    """
    type: Literal["webrtc_signal"]
    to: str  # target peer id (must be in same lobby)
    kind: Literal["offer", "answer", "ice"]
    data: dict


class PickupCollectPkt(BaseModel):
    type: Literal["pickup_collect"]
    pickupId: str


class PingPkt(BaseModel):
    """Mark a world spot for teammates. Server stamps the sender + colour."""
    type: Literal["ping"]
    x: float
    z: float


class VoiceNoisePkt(BaseModel):
    """Client mic picked up speech — emits a noise at the server-known
    player position (rate-limited server-side)."""
    type: Literal["voice_noise"]


class ReviveStartPkt(BaseModel):
    type: Literal["revive_start"]
    targetId: str


class ReviveCancelPkt(BaseModel):
    type: Literal["revive_cancel"]


class UsePotionPkt(BaseModel):
    type: Literal["use_potion"]


class UseGogglesPkt(BaseModel):
    type: Literal["use_goggles"]


class BackToLobbyPkt(BaseModel):
    type: Literal["back_to_lobby"]


class LockerOpenPkt(BaseModel):
    type: Literal["locker_open"]
    lockerId: str


class DoorTogglePkt(BaseModel):
    type: Literal["door_toggle"]
    doorId: str


class WebcamStatePkt(BaseModel):
    """Broadcast my cam on/off state so peers know whether to expect a track."""
    type: Literal["webcam_state"]
    on: bool


class SetCosmeticPkt(BaseModel):
    type: Literal["set_cosmetic"]
    category: Literal["body", "facePattern", "hat", "title"]
    cosmeticId: str | None = Field(default=None, max_length=64)


class BuyCosmeticPkt(BaseModel):
    type: Literal["buy_cosmetic"]
    cosmeticId: str = Field(max_length=64)


class LobbySettingsPkt(BaseModel):
    """Admin-only update from the lobby room. Any field left as None means
    "don't change". `password` accepts an empty string to clear the password."""
    type: Literal["lobby_settings"]
    maxPlayers: int | None = None
    password: str | None = None
    clearPassword: bool = False
    selectedTeachers: list[str] | None = None
    selectAllTeachers: bool = False
    mapSize: int | None = None
    mapSeed: int | None = None
    clearMapSeed: bool = False
    objectiveCount: int | None = None


ClientPacket = Annotated[
    Union[
        MovePkt, InteractPkt, GambleOpenPkt, GamblePlayPkt,
        SetAvatarPkt, ChatSendPkt, StartGamePkt, SetNamePkt,
        ChairPickupPkt, ChairThrowPkt, ChairDropPkt, LobbySettingsPkt,
        WebRTCSignalPkt, WebcamStatePkt,
        PickupCollectPkt, ReviveStartPkt, ReviveCancelPkt, UsePotionPkt,
        UseGogglesPkt, BackToLobbyPkt, LockerOpenPkt, DoorTogglePkt,
        SetCosmeticPkt, BuyCosmeticPkt, PingPkt, VoiceNoisePkt,
    ],
    Field(discriminator="type"),
]

ClientPacketAdapter: TypeAdapter[ClientPacket] = TypeAdapter(ClientPacket)
