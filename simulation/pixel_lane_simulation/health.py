"""Placeholder module status check.

No simulation or SUMO logic exists yet — this only confirms the package is
importable and can be tested/run as a future service entrypoint.
"""


def get_status() -> dict[str, str]:
    return {"status": "ok", "service": "simulation"}


if __name__ == "__main__":
    print(get_status())
