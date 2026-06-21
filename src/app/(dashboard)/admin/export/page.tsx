"use client"

import { useState } from "react"
import { exportFaultReportsCsv, exportFaultReportsTemplate, exportFaultReportsExcel } from "@/actions/admin"
import { Download, Loader2, Calendar, MapPin, Filter } from "lucide-react"

export default function AdminExportPage() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [barangay, setBarangay] = useState("")
  const [status, setStatus] = useState("")
  const [exporting, setExporting] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [count, setCount] = useState<number | null>(null)

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault()
    setExporting(true)
    try {
      const csv = await exportFaultReportsCsv({ from, to, barangay, status: status || undefined })
      const blob = new Blob([csv], { type: "text/csv" })
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
      setExporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const csv = await exportFaultReportsTemplate()
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fault-reports-template.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
  }

  const handleExportExcel = async (e: React.FormEvent) => {
    e.preventDefault()
    setExportingExcel(true)
    try {
      const buffer = await exportFaultReportsExcel({ from, to, barangay, status: status || undefined })
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fault-reports-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      setCount(buffer.byteLength > 0 ? 1 : 0)
    } catch (err) {
      console.error(err)
    } finally {
      setExportingExcel(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Export Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Download fault reports as CSV with optional filters.</p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {count !== null && (
        <div className="mb-4 bg-green-50 text-green-700 text-sm font-medium px-4 py-3 rounded-xl">
          Exported {count} record(s).
        </div>
      )}

      <form onSubmit={handleExport} className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
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

        <div className="grid grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={exporting}
            className="py-2.5 rounded-xl text-sm font-bold text-white bg-brand-blue hover:bg-brand-royal-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="w-4 h-4" /> Download CSV</>
            )}
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {exportingExcel ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="w-4 h-4" /> Download Excel</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
