"""
Triage engine — converts an Ollama-derived severity label into
actionable home remedies or a doctor-visit recommendation.

This module is pure Python (no DB, no HTTP) so it is fast and easy to test.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


# ── Data class ─────────────────────────────────────────────────────────────

@dataclass
class TriageOutput:
    severity: str
    recommendation: str
    remedies: List[str] = field(default_factory=list)
    see_doctor: bool = False


# ── Remedy knowledge base ──────────────────────────────────────────────────

_MILD_REMEDIES = [
    "Apply a warm heating pad or hot-water bottle to the lower abdomen for 15–20 minutes.",
    "Gentle yoga stretches (child's pose, cat-cow) can relieve cramping.",
    "Stay well hydrated — aim for 8–10 glasses of water per day.",
    "Chamomile or ginger tea may help reduce bloating and discomfort.",
    "Over-the-counter ibuprofen (400 mg) or naproxen taken with food can ease mild pain.",
    "Light walking or low-impact aerobic exercise releases endorphins and reduces pain.",
    "Track your symptoms in a cycle diary to identify patterns.",
]

_MODERATE_REMEDIES = [
    "Use a prescription-strength NSAID (e.g. mefenamic acid) if over-the-counter options are insufficient — consult a pharmacist first.",
    "Magnesium glycinate supplement (200–400 mg/day) may reduce cramping severity.",
    "Consider a TENS (transcutaneous electrical nerve stimulation) device for pain relief.",
    "Reduce caffeine and salty foods, which can worsen bloating.",
    "Ensure 7–9 hours of sleep; fatigue amplifies pain perception.",
    "If symptoms significantly disrupt daily activities for more than 2 days, consult a GP.",
]

_SEVERE_REMEDIES = [
    "Seek medical evaluation promptly — severe or sudden-onset pelvic pain warrants a clinical assessment.",
    "If you experience fever, heavy bleeding (soaking more than 1 pad/hour), or fainting, go to an emergency department.",
    "Conditions such as endometriosis, fibroids, or ovarian cysts can cause severe symptoms and require imaging.",
    "Do not self-medicate with high-dose opioids or unverified supplements.",
]

_RECOMMENDATION_MAP = {
    "mild": (
        "Your symptoms appear manageable at home. Try the suggested home remedies and monitor for improvement. "
        "If symptoms worsen or persist beyond 3–4 days, consult a healthcare provider."
    ),
    "moderate": (
        "Your symptoms are moderately impacting daily life. Home remedies and OTC medication may help, "
        "but schedule an appointment with your GP if there is no improvement within 48 hours."
    ),
    "severe": (
        "Your symptoms indicate a potentially serious condition. Please seek prompt medical attention. "
        "Do not ignore severe pain, heavy bleeding, or fever."
    ),
}


# ── Public function ────────────────────────────────────────────────────────

def run_triage(severity: str) -> TriageOutput:
    """
    Given a severity label (mild | moderate | severe), return a TriageOutput
    with a recommendation string, a list of targeted remedies, and a
    ``see_doctor`` flag.

    Unknown severity values are treated as "moderate" to err on the side of
    caution.

    Args:
        severity: The severity string produced by the Ollama service.

    Returns:
        A TriageOutput dataclass instance.
    """
    severity = severity.lower().strip()

    if severity == "mild":
        return TriageOutput(
            severity="mild",
            recommendation=_RECOMMENDATION_MAP["mild"],
            remedies=_MILD_REMEDIES,
            see_doctor=False,
        )
    elif severity == "severe":
        return TriageOutput(
            severity="severe",
            recommendation=_RECOMMENDATION_MAP["severe"],
            remedies=_SEVERE_REMEDIES,
            see_doctor=True,
        )
    else:
        # "moderate" or anything unexpected → default to moderate advice
        return TriageOutput(
            severity="moderate",
            recommendation=_RECOMMENDATION_MAP["moderate"],
            remedies=_MODERATE_REMEDIES,
            see_doctor=False,  # Advises scheduling only if no improvement in 48h, not immediately
        )
