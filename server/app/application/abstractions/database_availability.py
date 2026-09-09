from abc import ABC, abstractmethod


class IDatabaseAvailability(ABC):
    @property
    @abstractmethod
    def is_available(self) -> bool: ...
