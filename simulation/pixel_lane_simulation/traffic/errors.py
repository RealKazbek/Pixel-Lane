"""Domain errors for the Traffic Engine.

The City Model is already validated by the backend, but the engine still
fails clearly on input it cannot turn into a consistent network, instead
of silently ignoring bad references.
"""


class TrafficEngineError(Exception):
    """Base class for all Traffic Engine domain errors."""


class UnknownReferenceError(TrafficEngineError):
    """A road/intersection reference does not resolve within the given city."""


class InvalidNetworkTopologyError(TrafficEngineError):
    """The network structure cannot be resolved unambiguously.

    Example: a road is listed as connected by more than two intersections,
    which this engine's road-has-two-endpoints model cannot represent.
    """
