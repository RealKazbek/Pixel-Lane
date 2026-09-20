from app.city.examples.editor_workspace import EDITOR_WORKSPACE_CITY_ID, build_editor_workspace


def test_editor_workspace_starter_is_deterministic_and_matches_pl005() -> None:
    first = build_editor_workspace()
    second = build_editor_workspace()

    assert first.id == EDITOR_WORKSPACE_CITY_ID
    assert first.id == second.id
    assert [road.id for road in first.roads] == [road.id for road in second.roads]
    assert [road.name for road in first.roads] == ["Road A", "Road B", "Road C"]
    assert [len(road.lanes) for road in first.roads] == [2, 2, 2]
    assert first.intersections == []
