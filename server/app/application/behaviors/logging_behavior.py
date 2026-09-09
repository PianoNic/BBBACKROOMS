import logging
import time

from mediatorx import IPipelineBehavior, MessageHandlerDelegate


class LoggingBehavior(IPipelineBehavior):
    def __init__(self, logger: logging.Logger) -> None:
        self._logger = logger

    async def handle(self, message, next: MessageHandlerDelegate):
        start = time.perf_counter()
        result = await next()
        elapsed_ms = (time.perf_counter() - start) * 1000
        self._logger.debug("%s handled in %.1fms", type(message).__name__, elapsed_ms)
        return result
