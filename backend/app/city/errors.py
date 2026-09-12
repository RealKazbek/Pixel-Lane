from app.city.schemas.city import ValidationIssue


class CityValidationError(Exception):
    """Raised when a City payload fails cross-reference/domain validation."""

    def __init__(self, issues: list[ValidationIssue]) -> None:
        self.issues = issues
        super().__init__(f"City payload failed validation with {len(issues)} issue(s)")
