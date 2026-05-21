from __future__ import annotations

from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def build_ats_report_pdf(candidate: dict, run: dict) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title=f"ATS Report - {candidate['name']}",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("ReportTitle", parent=styles["Title"], fontSize=20, leading=24, textColor=colors.HexColor("#17202A"))
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"], fontSize=12, leading=15, textColor=colors.HexColor("#2563EB"), spaceBefore=10)
    body_style = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=9.5, leading=13)

    story = [
        Paragraph("AI Resume Screening & ATS Analyzer", title_style),
        Paragraph(f"Candidate ATS Report: {_safe_text(candidate['name'])}", styles["Heading3"]),
        Spacer(1, 0.12 * inch),
        _summary_table(candidate),
        Spacer(1, 0.16 * inch),
        Paragraph("Recruiter Summary", heading_style),
        Paragraph(_safe_text(candidate["summary"]), body_style),
        Paragraph("ATS Score Breakdown", heading_style),
        _breakdown_table(candidate["ats_breakdown"]),
        Paragraph("Matched Skills", heading_style),
        Paragraph(_comma_text(candidate["skills_matched"]), body_style),
        Paragraph("Missing Skills", heading_style),
        Paragraph(_comma_text(candidate["skills_missing"]), body_style),
        Paragraph("Recommendations", heading_style),
        Paragraph("<br/>".join(_safe_text(item) for item in candidate["recommended_improvements"]), body_style),
        Paragraph("Role Signals", heading_style),
        Paragraph(_comma_text(run["job_analysis"]["required_skills"] + run["job_analysis"]["preferred_skills"]), body_style),
    ]

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def _summary_table(candidate: dict) -> Table:
    rows = [
        ["Candidate", _safe_text(candidate["name"])],
        ["File", _safe_text(candidate["filename"])],
        ["ATS Match", f"{round(candidate['score'])}%"],
        ["Decision", _safe_text(candidate["decision"])],
        ["AI Score", "N/A" if candidate["llm_score"] is None else f"{round(candidate['llm_score'])}%"],
    ]
    table = Table(rows, colWidths=[1.6 * inch, 5.1 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EFF6FF")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#1D4ED8")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9DEE7")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def _breakdown_table(breakdown: dict[str, float]) -> Table:
    rows = [["Metric", "Score"]] + [[label.replace("_", " ").title(), f"{round(score)}%"] for label, score in breakdown.items()]
    table = Table(rows, colWidths=[3.4 * inch, 1.2 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17202A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9DEE7")),
                ("PADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def _comma_text(items: list[str]) -> str:
    return ", ".join(_safe_text(item) for item in items) if items else "None found."


def _safe_text(value: object) -> str:
    return escape(str(value), {'"': "&quot;", "'": "&#x27;"})
