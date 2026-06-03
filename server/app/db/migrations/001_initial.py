"""Peewee migrations -- 001_initial.py.

Some examples (model - class or model name)::

    > Model = migrator.orm['table_name']            # Return model in current state by name
    > Model = migrator.ModelClass                   # Return model in current state by name

    > migrator.sql(sql)                             # Run custom SQL
    > migrator.run(func, *args, **kwargs)           # Run python function with the given args
    > migrator.create_model(Model)                  # Create a model (could be used as decorator)
    > migrator.remove_model(model, cascade=True)    # Remove a model
    > migrator.add_fields(model, **fields)          # Add fields to a model
    > migrator.change_fields(model, **fields)       # Change fields
    > migrator.remove_fields(model, *field_names, cascade=True)
    > migrator.rename_field(model, old_field_name, new_field_name)
    > migrator.rename_table(model, new_table_name)
    > migrator.add_index(model, *col_names, unique=False)
    > migrator.add_not_null(model, *field_names)
    > migrator.add_default(model, field_name, default)
    > migrator.add_constraint(model, name, sql)
    > migrator.drop_index(model, *col_names)
    > migrator.drop_not_null(model, *field_names)
    > migrator.drop_constraints(model, *constraints)

"""

from contextlib import suppress

import peewee as pw
from peewee_migrate import Migrator


with suppress(ImportError):
    import playhouse.postgres_ext as pw_pext


def migrate(migrator: Migrator, database: pw.Database, *, fake=False):
    """Write your migrations here."""
    
    @migrator.create_model
    class Account(pw.Model):
        id = pw.AutoField()
        provider = pw.CharField(max_length=255)
        provider_subject = pw.CharField(max_length=255)
        email = pw.CharField(max_length=255, null=True)
        display_name = pw.CharField(max_length=255, null=True)
        created_at = pw.DateTimeField()

        class Meta:
            table_name = "account"
            indexes = [(('provider', 'provider_subject'), True)]

    @migrator.create_model
    class CosmeticEquipped(pw.Model):
        account = pw.ForeignKeyField(column_name='account_id', field='id', model=migrator.orm['account'], on_delete='CASCADE')
        category = pw.CharField(max_length=255)
        cosmetic_id = pw.CharField(max_length=255)

        class Meta:
            table_name = "cosmetic_equipped"
            primary_key = pw.CompositeKey('account', 'category')

    @migrator.create_model
    class CosmeticOwnership(pw.Model):
        account = pw.ForeignKeyField(column_name='account_id', field='id', model=migrator.orm['account'], on_delete='CASCADE')
        cosmetic_id = pw.CharField(max_length=255)
        acquired_at = pw.DateTimeField()

        class Meta:
            table_name = "cosmetic_ownership"
            primary_key = pw.CompositeKey('account', 'cosmetic_id')

    @migrator.create_model
    class Profile(pw.Model):
        account = pw.ForeignKeyField(column_name='account_id', field='id', model=migrator.orm['account'], on_delete='CASCADE', primary_key=True)
        xp = pw.IntegerField(default=0)
        coins = pw.IntegerField(default=0)

        class Meta:
            table_name = "profile"


def rollback(migrator: Migrator, database: pw.Database, *, fake=False):
    """Write your rollback migrations here."""
    
    migrator.remove_model('profile')

    migrator.remove_model('cosmetic_ownership')

    migrator.remove_model('cosmetic_equipped')

    migrator.remove_model('account')
