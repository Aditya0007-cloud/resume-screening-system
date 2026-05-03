from pathlib import Path

from docx import Document
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
SAMPLE_DIR = ROOT / "data" / "sample_resumes"


def create_docx(source: Path, target: Path) -> None:
    document = Document()
    for block in source.read_text(encoding="utf-8").split("\n\n"):
        document.add_paragraph(block)
    document.save(target)


def create_pdf(source: Path, target: Path) -> None:
    pdf = canvas.Canvas(str(target), pagesize=LETTER)
    width, height = LETTER
    x = 54
    y = height - 54
    for line in source.read_text(encoding="utf-8").splitlines():
        if y < 54:
            pdf.showPage()
            y = height - 54
        pdf.drawString(x, y, line[:105])
        y -= 15
    pdf.save()


def main() -> None:
    for source in SAMPLE_DIR.glob("*.txt"):
        create_docx(source, source.with_suffix(".docx"))
        create_pdf(source, source.with_suffix(".pdf"))
    print(f"Generated PDF and DOCX samples in {SAMPLE_DIR}")


if __name__ == "__main__":
    main()
