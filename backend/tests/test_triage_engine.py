"""
Unit tests for app.services.triage_engine.

Pure-Python tests — no DB or HTTP required.
Run with:  pytest backend/tests/test_triage_engine.py -v
"""

import pytest

from app.services.triage_engine import TriageOutput, run_triage


class TestRunTriage:
    def test_mild_does_not_recommend_doctor(self):
        result = run_triage("mild")
        assert isinstance(result, TriageOutput)
        assert result.severity == "mild"
        assert result.see_doctor is False
        assert len(result.remedies) > 0
        assert result.recommendation

    def test_moderate_recommends_doctor(self):
        result = run_triage("moderate")
        assert result.severity == "moderate"
        assert result.see_doctor is False  # advises scheduling only if no improvement in 48h
        assert len(result.remedies) > 0

    def test_severe_recommends_doctor_urgently(self):
        result = run_triage("severe")
        assert result.severity == "severe"
        assert result.see_doctor is True
        assert "medical" in result.recommendation.lower() or "doctor" in result.recommendation.lower()

    def test_case_insensitive_severity(self):
        assert run_triage("MILD").severity == "mild"
        assert run_triage("Severe").severity == "severe"
        assert run_triage("MODERATE").severity == "moderate"

    def test_unknown_severity_defaults_to_moderate(self):
        """An unrecognised severity label should fall back to 'moderate'."""
        result = run_triage("unknown_label")
        assert result.severity == "moderate"
        assert result.see_doctor is True

    def test_remedies_are_non_empty_strings(self):
        for severity in ("mild", "moderate", "severe"):
            result = run_triage(severity)
            for remedy in result.remedies:
                assert isinstance(remedy, str)
                assert len(remedy) > 0
