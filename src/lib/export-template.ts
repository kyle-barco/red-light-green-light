import jsPDF from "jspdf"
import { LOGO_BASE64 } from "./logo-data"

export function csvBranding(title: string): string {
  const date = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  return `illumenate Lighting System\n${title}\nGenerated: ${date}\n\n`
}

export async function downloadPdf(
  title: string,
  headers: string[],
  rows: string[][],
  filename: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()

  // Logo
  try {
    doc.addImage(LOGO_BASE64, "PNG", 14, 10, 40, 36)
  } catch {
    // fallback: just skip logo
  }

  // Title
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("illumenate Lighting System", 60, 20)

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text(title, 60, 28)

  doc.setFontSize(9)
  doc.text(`Generated: ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`, 60, 34)

  // Table
  const colWidth = Math.min(50, (pageW - 30) / headers.length)
  const startY = 55
  const rowH = 8

  function drawTable(headers: string[], rows: string[][]) {
    let y = startY
    let pageNum = 1

    function drawHeader() {
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setFillColor(41, 128, 185)
      doc.setTextColor(255, 255, 255)
      headers.forEach((h, i) => {
        doc.rect(14 + i * colWidth, y, colWidth, rowH, "F")
        doc.text(h, 14 + i * colWidth + 1, y + 5.5)
      })
      y += rowH
    }

    function drawRows() {
      doc.setFont("helvetica", "normal")
      doc.setTextColor(50, 50, 50)
      doc.setFontSize(7)
      for (const row of rows) {
        if (y + rowH > doc.internal.pageSize.getHeight() - 14) {
          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          doc.text(`Page ${pageNum}`, pageW / 2 - 5, doc.internal.pageSize.getHeight() - 5)
          doc.addPage()
          pageNum++
          y = 20
          doc.setFontSize(8)
          doc.setFont("helvetica", "bold")
          doc.setFillColor(41, 128, 185)
          doc.setTextColor(255, 255, 255)
          headers.forEach((h, i) => {
            doc.rect(14 + i * colWidth, y, colWidth, rowH, "F")
            doc.text(h, 14 + i * colWidth + 1, y + 5.5)
          })
          y += rowH
          doc.setFont("helvetica", "normal")
          doc.setTextColor(50, 50, 50)
          doc.setFontSize(7)
        }
        doc.setFillColor(y % 16 === startY % 16 ? 245 : 255, y % 16 === startY % 16 ? 245 : 255, y % 16 === startY % 16 ? 245 : 255)
        doc.rect(14, y - 0.5, pageW - 28, rowH, "F")
        row.forEach((cell, i) => {
          doc.text(cell.toString(), 14 + i * colWidth + 1, y + 5)
        })
        y += rowH
      }
    }

    drawHeader()
    drawRows()
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`Page ${pageNum}`, pageW / 2 - 5, doc.internal.pageSize.getHeight() - 5)
  }

  drawTable(headers, rows)
  doc.save(filename)
}
