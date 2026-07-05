"""Per-publication failure tracking with debounced alerting = self-healing.

The old Mac job alerted on *every* failure and *every* recovery, so a flaky
network produced the broke/recovered sawtooth you saw in #ops-alerts. This
tracker instead:

  * counts consecutive failing cycles per publication,
  * stays SILENT until the count crosses ALERT_AFTER_FAILURES (one alert),
  * sends exactly one "recovered" when a previously-alerted feed comes back,
  * silently forgets transient blips that never crossed the threshold.

State persists to STATE_DIR/health.json (best-effort) so a restart doesn't
immediately re-page. Alerting decisions are returned as flags; the caller owns
the actual Slack call, keeping this module pure and testable.
"""
from __future__ import annotations

import json
from pathlib import Path

import config


class FailureTracker:
    def __init__(self, state_dir: Path | None = None, threshold: int | None = None):
        self.threshold = threshold if threshold is not None else config.ALERT_AFTER_FAILURES
        self.path = Path(state_dir or config.STATE_DIR) / "health.json"
        # per-pub: {"fails": int, "alerted": bool}
        self._state: dict[str, dict] = {}
        self._load()

    def _load(self) -> None:
        if self.path.exists():
            try:
                self._state = json.loads(self.path.read_text("utf-8"))
            except (json.JSONDecodeError, OSError):
                self._state = {}

    def _save(self) -> None:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps(self._state), encoding="utf-8")
        except OSError:
            pass  # health state is best-effort; never crash the cycle over it

    def _entry(self, pub: str) -> dict:
        return self._state.setdefault(pub, {"fails": 0, "alerted": False})

    def record_failure(self, pub: str) -> bool:
        """Return True only on the cycle that first crosses the alert threshold."""
        e = self._entry(pub)
        e["fails"] += 1
        should_alert = e["fails"] >= self.threshold and not e["alerted"]
        if should_alert:
            e["alerted"] = True
        self._save()
        return should_alert

    def record_success(self, pub: str) -> bool:
        """Return True only if this publication was in an alerted-failing state."""
        e = self._entry(pub)
        recovered = e["alerted"]
        e["fails"] = 0
        e["alerted"] = False
        self._save()
        return recovered

    def snapshot(self) -> dict[str, dict]:
        return {k: dict(v) for k, v in self._state.items()}
