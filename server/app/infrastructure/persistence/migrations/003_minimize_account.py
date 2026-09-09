"""Peewee migrations -- 003_minimize_account.py.

Drops the account email column; identity is (provider, provider_subject).
"""

from contextlib import suppress

import peewee as pw
from peewee_migrate import Migrator


with suppress(ImportError):
    import playhouse.postgres_ext as pw_pext


def migrate(migrator: Migrator, database: pw.Database, *, fake=False):
    """Write your migrations here."""

    migrator.remove_fields("account", "email")


def rollback(migrator: Migrator, database: pw.Database, *, fake=False):
    """Write your rollback migrations here."""

    migrator.add_fields("account", email=pw.CharField(max_length=255, null=True))
