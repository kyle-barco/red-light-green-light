"use client"

import { useState } from "react"
import { exportFaultReportsCsv } from "@/actions/admin"
import { Download, Loader2, Calendar, MapPin, Filter, FileText } from "lucide-react"
import { csvBranding, downloadPdf } from "@/lib/export-template"

export default function AdminExportPage() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [barangay, setBarangay] = useState("")
  const [status, setStatus] = useState("")
  const [exporting, setExporting] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)

  const getFilters = () => ({
    from,
    to,
    barangay,
    status: status || undefined,
  })

  const handleExportCsv = async (e: React.FormEvent) => {
    e.preventDefault()
    setExporting("csv")
    try {
      const csv = await exportFaultReportsCsv(getFilters())
      const branded = csvBranding("Fault Reports Export") + csv
      const blob = new Blob([branded], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fault-reports-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setCount(csv.split("\n").length - 1)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(null)
    }
  }

  const handleExportPdf = async () => {
    setExporting("pdf")
    try {
      const csv = await exportFaultReportsCsv(getFilters())
      const lines = csv.trim().split("\n")
      const headers = lines[0].split(",")
      const rows = lines.slice(1).map((l) => l.split(","))

      await downloadPdf(
        "Fault Reports Export",
        headers,
        rows,
        `fault-reports-${new Date().toISOString().slice(0, 10)}.pdf`,
      )
      setCount(rows.length)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Export Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Download fault reports as CSV or PDF with optional filters.</p>
      </div>

      {count !== null && (
        <div className="mb-4 bg-green-50 text-green-700 text-sm font-medium px-4 py-3 rounded-xl">
          Exported {count} record(s).
        </div>
      )}

      <form onSubmit={handleExportCsv} className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" />
              From Date
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" />
              To Date
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1" />
              Barangay
            </label>
            <input
              type="text"
              placeholder="Filter by barangay..."
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              <Filter className="w-3 h-3 inline mr-1" />
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={exporting === "csv"}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-blue hover:bg-brand-royal-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {exporting === "csv" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Exporting CSV...</>
            ) : (
              <><Download className="w-4 h-4" /> Download CSV</>
            )}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting === "pdf"}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {exporting === "pdf" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Exporting PDF...</>
            ) : (
              <><FileText className="w-4 h-4" /> Download PDF</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
