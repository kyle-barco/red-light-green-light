"use client"

import { useState, useEffect } from "react"
import { getWorkOrders, updateWorkOrderStatus } from "@/actions/workorders"
import { getTechnicians, reassignWorkOrder } from "@/actions/admin"
import { GitCompareArrows, CheckCircle, Search } from "lucide-react"

interface WorkOrder {
  id: string
  status: string
  assignedAt: Date
  resolvedAt: Date | null
  resolutionNotes: string | null
  faultReport: {
    id: string
    faultType: string
    description: string
    pole: { poleCode: string; barangay: string; address: string }
  }
  assignedTo: { id: string; firstName: string; lastName: string } | null
  assignedBy: { id: string; firstName: string; lastName: string }
}

const statusBadge: Record<string, string> = {
  PENDING: "bg-gray-50 text-gray-600",
  ASSIGNED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-600",
}

export default function AdminWorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [technicians, setTechnicians] = useState<{ id: string; firstName: string; lastName: string }[]>([])
  const [reassigning, setReassigning] = useState<string | null>(null)
  const [selectedTech, setSelectedTech] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")

  useEffect(() => {
    getWorkOrders().then(setOrders)
    getTechnicians().then(setTechnicians)
  }, [])

  const filtered = orders.filter((o) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      o.faultReport.pole.poleCode.toLowerCase().includes(q) ||
      o.faultReport.faultType.toLowerCase().includes(q) ||
      o.assignedTo?.firstName.toLowerCase().includes(q) ||
      o.assignedTo?.lastName.toLowerCase().includes(q)
    )
  })

  const handleReassign = async (workOrderId: string) => {
    const techId = selectedTech[workOrderId]
    if (!techId) return
    setReassigning(workOrderId)
    await reassignWorkOrder(workOrderId, techId)
    const updated = await getWorkOrders()
    setOrders(updated)
    setReassigning(null)
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Work Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Monitor and reassign work orders.</p>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search work orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Pole</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fault</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Assigned To</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Assigned At</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((wo) => (
              <tr key={wo.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-brand-blue">
                    {wo.faultReport.pole.poleCode}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {wo.faultReport.faultType.replace("_", " ")}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[wo.status]}`}>
                    {wo.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(wo.assignedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTech[wo.id] || ""}
                      onChange={(e) =>
                        setSelectedTech((prev) => ({ ...prev, [wo.id]: e.target.value }))
                      }
                      className="text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none"
                    >
                      <option value="">Reassign to...</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleReassign(wo.id)}
                      disabled={reassigning === wo.id || !selectedTech[wo.id]}
                      className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Reassign"
                    >
                      <GitCompareArrows className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No work orders found.</p>
      )}
    </div>
  )
}
