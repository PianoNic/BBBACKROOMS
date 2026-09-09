import logging

from mediatorx import DictResolver, Mediator

from app.application.behaviors.exception_logging_behavior import ExceptionLoggingBehavior
from app.application.behaviors.logging_behavior import LoggingBehavior
from app.application.queries.get_health_query import GetHealthHandler, GetHealthQuery
from app.application.queries.get_version_query import GetVersionHandler, GetVersionQuery
from app.version import VERSION

_log = logging.getLogger("bbb.mediator")


def build_mediator() -> Mediator:
    resolver = DictResolver()
    resolver.add_factory(GetHealthHandler, lambda: GetHealthHandler())
    resolver.add_factory(GetVersionHandler, lambda: GetVersionHandler(VERSION))
    resolver.add_instance(ExceptionLoggingBehavior, ExceptionLoggingBehavior(_log))
    resolver.add_instance(LoggingBehavior, LoggingBehavior(_log))

    mediator = Mediator(resolver=resolver)
    mediator.register(GetHealthQuery, GetHealthHandler)
    mediator.register(GetVersionQuery, GetVersionHandler)
    mediator.add_behavior(ExceptionLoggingBehavior)
    mediator.add_behavior(LoggingBehavior)
    return mediator


_mediator = build_mediator()


def get_mediator() -> Mediator:
    return _mediator
