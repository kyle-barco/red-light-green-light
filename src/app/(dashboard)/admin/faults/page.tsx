"use client"

import { useState, useEffect } from "react"
import { getAdminFaultReports, getTechnicians, assignWorkOrder, triageFaultReport } from "@/actions/admin"
import { Search, CheckCircle, XCircle, MessageSquare, UserCheck } from "lucide-react"

interface FaultReport {
  id: string
  faultType: string
  description: string
  status: string
  reportedAt: Date
  adminNotes: string | null
  pole: { id: string; poleCode: string; barangay: string; address: string }
  reportedBy: { id: string; firstName: string; lastName: string } | null
  workOrder: {
    id: string
    status: string
    assignedTo: { id: string; firstName: string; lastName: string } | null
  } | null
}

interface Technician {
  id: string
  firstName: string
  lastName: string
  barangay: string
}

const statusBadge: Record<string, string> = {
  OPEN: "bg-red-50 text-red-600",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-green-50 text-green-700",
  CLOSED: "bg-gray-100 text-gray-500",
}

export default function AdminFaultsPage() {
  const [reports, setReports] = useState<FaultReport[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [assigning, setAssigning] = useState<string | null>(null)
  const [selectedTech, setSelectedTech] = useState<Record<string, string>>({})
  const [noteInput, setNoteInput] = useState<Record<string, string>>({})
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    getAdminFaultReports().then(setReports)
    getTechnicians().then(setTechnicians)
  }, [])

  const filtered = reports.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.pole.poleCode.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.faultType.toLowerCase().includes(q)
    )
  })

  const handleAssign = async (reportId: string) => {
    const techId = selectedTech[reportId]
    if (!techId) return
    setAssigning(reportId)
    await assignWorkOrder(reportId, techId)
    const updated = await getAdminFaultReports()
    setReports(updated)
    setAssigning(null)
  }

  const handleTriage = async (reportId: string, action: "CLOSE_INVALID" | "MARK_DUPLICATE") => {
    await triageFaultReport(reportId, action, noteInput[reportId])
    const updated = await getAdminFaultReports()
    setReports(updated)
  }

  const handleAddNote = async (reportId: string) => {
    await triageFaultReport(reportId, "ADD_NOTE", noteInput[reportId])
    const updated = await getAdminFaultReports()
    setReports(updated)
    setNoteOpen((prev) => ({ ...prev, [reportId]: false }))
    setNoteInput((prev) => ({ ...prev, [reportId]: "" }))
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Fault Report Inbox</h1>
        <p className="text-sm text-gray-500 mt-0.5">Triage, assign, and manage incoming fault reports.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <option value="ALL">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <span className="text-xs text-gray-400">{filtered.length} report(s)</span>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No fault reports found.</p>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-100 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-brand-blue">
                      {r.pole.poleCode}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[r.status]}`}>
                      {r.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400">{r.pole.barangay}</span>
                    <span className="text-xs text-gray-400">{new Date(r.reportedAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {r.faultType.replace("_", " ")} — {r.description}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Reported by: {r.reportedBy ? `${r.reportedBy.firstName} ${r.reportedBy.lastName}` : "Anonymous"}
                  </p>
                  {r.adminNotes && (
                    <p className="text-xs text-amber-600 mt-1 italic">Note: {r.adminNotes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {r.status === "OPEN" && (
                    <div className="flex items-center gap-1">
                      <select
                        value={selectedTech[r.id] || ""}
                        onChange={(e) =>
                          setSelectedTech((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        className="text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none"
                      >
                        <option value="">Assign to...</option>
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssign(r.id)}
                        disabled={assigning === r.id || !selectedTech[r.id]}
                        className="p-1.5 rounded-lg bg-brand-blue text-white hover:bg-brand-royal-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Assign"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {r.status === "OPEN" && (
                    <>
                      <button
                        onClick={() => handleTriage(r.id, "CLOSE_INVALID")}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        title="Close as invalid"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleTriage(r.id, "MARK_DUPLICATE")}
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                        title="Mark as duplicate"
                      >
                        <CopyIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() =>
                      setNoteOpen((prev) => ({ ...prev, [r.id]: !prev[r.id] }))
                    }
                    className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                    title="Add note"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {r.workOrder && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  Work order: {r.workOrder.status.replace("_", " ")}
                  {r.workOrder.assignedTo && (
                    <> — {r.workOrder.assignedTo.firstName} {r.workOrder.assignedTo.lastName}</>
                  )}
                </div>
              )}

              {noteOpen[r.id] && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={noteInput[r.id] || ""}
                    onChange={(e) =>
                      setNoteInput((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    placeholder="Add an admin note..."
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                  <button
                    onClick={() => handleAddNote(r.id)}
                    disabled={!noteInput[r.id]?.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-blue text-white hover:bg-brand-royal-blue disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}
