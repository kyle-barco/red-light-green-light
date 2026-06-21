import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { Role, WorkOrderStatus } from "@/lib/generated/prisma/client"
import { Wrench, CheckCircle, Clock, Briefcase } from "lucide-react"

async function getData() {
  const technicians = await prisma.user.findMany({
    where: { role: Role.TECHNICIAN, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      barangay: true,
      createdAt: true,
      workOrdersAssigned: {
        select: { id: true, status: true, assignedAt: true, resolvedAt: true },
      },
    },
    orderBy: { firstName: "asc" },
  })

  return technicians.map((t) => {
    const all = t.workOrdersAssigned
    const resolved = all.filter((wo) => wo.status === WorkOrderStatus.RESOLVED)
    const pending = all.filter((wo) =>
      ([WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.PENDING] as WorkOrderStatus[]).includes(wo.status)
    )
    const avgMs = resolved.reduce((sum, wo) => {
      if (wo.resolvedAt) return sum + (wo.resolvedAt.getTime() - wo.assignedAt.getTime())
      return sum
    }, 0)
    const avgHours = resolved.length > 0 ? Math.round(avgMs / resolved.length / 3600000) : 0

    return {
      id: t.id,
      name: `${t.firstName} ${t.lastName}`,
      email: t.email,
      phone: t.phone,
      barangay: t.barangay,
      totalJobs: all.length,
      resolvedJobs: resolved.length,
      pendingJobs: pending.length,
      avgResolutionHours: avgHours,
      memberSince: t.createdAt,
    }
  })
}

export default async function AdminTechniciansPage() {
  const session = await getSession()
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
    redirect("/dashboard")
  }

  const data = await getData()

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Technician Performance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Monitor technician workload and resolution metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{t.name}</h3>
                <p className="text-xs text-gray-400">{t.email}</p>
              </div>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                {t.barangay}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <Briefcase className="w-3 h-3" />
                  Total Jobs
                </div>
                <p className="text-lg font-black text-gray-800 mt-1">{t.totalJobs}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 uppercase tracking-wider">
                  <CheckCircle className="w-3 h-3" />
                  Resolved
                </div>
                <p className="text-lg font-black text-green-700 mt-1">{t.resolvedJobs}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  <Clock className="w-3 h-3" />
                  Pending
                </div>
                <p className="text-lg font-black text-amber-700 mt-1">{t.pendingJobs}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  <Clock className="w-3 h-3" />
                  Avg time
                </div>
                <p className="text-lg font-black text-blue-700 mt-1">
                  {t.avgResolutionHours}h
                </p>
              </div>
            </div>

            <p className="text-[10px] text-gray-400">
              Member since {new Date(t.memberSince).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {data.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No active technicians found.</p>
      )}
    </div>
  )
}
