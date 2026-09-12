from pixel_lane_simulation.health import get_status


def test_get_status() -> None:
    assert get_status() == {"status": "ok", "service": "simulation"}
