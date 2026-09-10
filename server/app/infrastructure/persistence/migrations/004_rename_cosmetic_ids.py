"""Peewee migrations -- 004_rename_cosmetic_ids.py.

Renames the "body_bbb" cosmetic id to "body_schulrot".
"""

from contextlib import suppress

import peewee as pw
from peewee_migrate import Migrator


with suppress(ImportError):
    import playhouse.postgres_ext as pw_pext


def migrate(migrator: Migrator, database: pw.Database, *, fake=False):
    """Write your migrations here."""

    migrator.sql("UPDATE cosmetic_ownership SET cosmetic_id = 'body_schulrot' WHERE cosmetic_id = 'body_bbb'")
    migrator.sql("UPDATE cosmetic_equipped SET cosmetic_id = 'body_schulrot' WHERE cosmetic_id = 'body_bbb'")


def rollback(migrator: Migrator, database: pw.Database, *, fake=False):
    """Write your rollback migrations here."""

    migrator.sql("UPDATE cosmetic_ownership SET cosmetic_id = 'body_bbb' WHERE cosmetic_id = 'body_schulrot'")
    migrator.sql("UPDATE cosmetic_equipped SET cosmetic_id = 'body_bbb' WHERE cosmetic_id = 'body_schulrot'")
