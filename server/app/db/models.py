"""Persistence models (async-Peewee).

Schema is owned by the migrations in `app/db/migrations/`; these models are the
runtime query interface. Account is created on first OAuth login; Profile holds
XP/coins; the cosmetic tables hold ownership + per-slot equipped state.
"""
from __future__ import annotations

import datetime as _dt

import peewee
import peewee_async

from app.db.engine import database


def _utcnow() -> _dt.datetime:
    return _dt.datetime.now(_dt.timezone.utc)


class BaseModel(peewee_async.AioModel):
    # AioModel adds the async `aio_*` query methods used at runtime; it is still
    # a normal peewee.Model, so peewee-migrate introspects it for migrations.
    class Meta:
        database = database


class Account(BaseModel):
    id = peewee.AutoField()
    provider = peewee.CharField()           # "google" | "microsoft"
    provider_subject = peewee.CharField()   # OIDC `sub` — stable per provider
    email = peewee.CharField(null=True)
    display_name = peewee.CharField(null=True)
    created_at = peewee.DateTimeField(default=_utcnow)

    class Meta:
        table_name = "account"
        # Natural identity per provider; email is mutable so never key on it.
        indexes = ((("provider", "provider_subject"), True),)


class Profile(BaseModel):
    account = peewee.ForeignKeyField(
        Account, primary_key=True, backref="profile", on_delete="CASCADE",
    )
    xp = peewee.IntegerField(default=0)
    coins = peewee.IntegerField(default=0)

    class Meta:
        table_name = "profile"


class CosmeticOwnership(BaseModel):
    account = peewee.ForeignKeyField(Account, backref="owned", on_delete="CASCADE")
    cosmetic_id = peewee.CharField()
    acquired_at = peewee.DateTimeField(default=_utcnow)

    class Meta:
        table_name = "cosmetic_ownership"
        primary_key = peewee.CompositeKey("account", "cosmetic_id")


class CosmeticEquipped(BaseModel):
    account = peewee.ForeignKeyField(Account, backref="equipped", on_delete="CASCADE")
    category = peewee.CharField()
    cosmetic_id = peewee.CharField()

    class Meta:
        table_name = "cosmetic_equipped"
        # One equipped cosmetic per category slot per account.
        primary_key = peewee.CompositeKey("account", "category")


ALL_MODELS = [Account, Profile, CosmeticOwnership, CosmeticEquipped]
