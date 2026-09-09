import logging

import pytest

from app.application.behaviors.exception_logging_behavior import ExceptionLoggingBehavior
from app.application.behaviors.logging_behavior import LoggingBehavior
from app.application.dtos.health_dto import HealthDto
from app.application.dtos.version_dto import VersionDto
from app.application.queries.get_health_query import GetHealthHandler, GetHealthQuery
from app.application.queries.get_version_query import GetVersionHandler, GetVersionQuery
from app.presentation.dependencies import build_mediator
from app.version import VERSION


async def test_get_health_handler_returns_ok():
    result = await GetHealthHandler().handle(GetHealthQuery())
    assert result == HealthDto(status="ok")


async def test_get_version_handler_returns_injected_version():
    result = await GetVersionHandler("9.9.9").handle(GetVersionQuery())
    assert result == VersionDto(version="9.9.9")


async def test_mediator_dispatches_get_health_query():
    mediator = build_mediator()
    result = await mediator.send(GetHealthQuery())
    assert isinstance(result, HealthDto)
    assert result.status == "ok"


async def test_mediator_dispatches_get_version_query():
    mediator = build_mediator()
    result = await mediator.send(GetVersionQuery())
    assert result.version == VERSION


async def test_logging_behavior_returns_next_result():
    behavior = LoggingBehavior(logging.getLogger("test"))
    sentinel = object()

    async def next():
        return sentinel

    result = await behavior.handle(GetHealthQuery(), next)
    assert result is sentinel


async def test_exception_logging_behavior_reraises():
    behavior = ExceptionLoggingBehavior(logging.getLogger("test"))

    async def next():
        raise ValueError("boom")

    with pytest.raises(ValueError):
        await behavior.handle(GetHealthQuery(), next)
