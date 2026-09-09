import logging

from mediatorx import IPipelineBehavior, MessageHandlerDelegate


class ExceptionLoggingBehavior(IPipelineBehavior):
    def __init__(self, logger: logging.Logger) -> None:
        self._logger = logger

    async def handle(self, message, next: MessageHandlerDelegate):
        try:
            return await next()
        except Exception:
            self._logger.exception("%s failed", type(message).__name__)
            raise
