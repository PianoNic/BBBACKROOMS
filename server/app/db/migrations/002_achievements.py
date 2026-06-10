"""Peewee migrations -- 002_achievements.py.

Adds the per-account achievement unlock table.
"""

from contextlib import suppress

import peewee as pw
from peewee_migrate import Migrator


with suppress(ImportError):
    import playhouse.postgres_ext as pw_pext


def migrate(migrator: Migrator, database: pw.Database, *, fake=False):
    """Write your migrations here."""

    @migrator.create_model
    class AchievementUnlock(pw.Model):
        account = pw.ForeignKeyField(
            column_name="account_id", field="id",
            model=migrator.orm["account"], on_delete="CASCADE",
        )
        achievement_id = pw.CharField(max_length=255)
        unlocked_at = pw.DateTimeField()

        class Meta:
            table_name = "achievement_unlock"
            primary_key = pw.CompositeKey("account", "achievement_id")


def rollback(migrator: Migrator, database: pw.Database, *, fake=False):
    """Write your rollback migrations here."""

    migrator.remove_model("achievement_unlock")
