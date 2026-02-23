"""Abstract base class for trail event stores."""

from abc import ABC, abstractmethod

from trailproof.types import QueryFilters, QueryResult, TrailEvent


class TrailStore(ABC):
    """Append-only storage backend for trail events.

    All store implementations must implement these five methods.
    Stores are append-only — events cannot be modified or deleted.
    """

    @abstractmethod
    def append(self, event: TrailEvent) -> None:
        """Append a single event to the store.

        Args:
            event: The trail event to store.
        """

    @abstractmethod
    def read_all(self) -> list[TrailEvent]:
        """Return all events in insertion order.

        Returns:
            List of all stored events.
        """

    @abstractmethod
    def query(self, filters: QueryFilters) -> QueryResult:
        """Query events with optional filters and pagination.

        Args:
            filters: Filter criteria and pagination parameters.

        Returns:
            Matching events and optional next_cursor for pagination.
        """

    @abstractmethod
    def last_hash(self) -> str:
        """Return the hash of the most recent event.

        Returns the genesis hash if the store is empty.

        Returns:
            The hash string of the last event, or genesis hash.
        """

    @abstractmethod
    def count(self) -> int:
        """Return the total number of stored events.

        Returns:
            The event count.
        """
