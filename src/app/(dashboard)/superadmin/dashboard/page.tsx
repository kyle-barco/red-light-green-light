import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { Role, WorkOrderStatus } from '@/lib/generated/prisma/client'
import SuperAdminStatsRow from './_components/SuperAdminStatsRow'
import RoleManagement from './_components/RoleManagement'
import SystemOverview from './_components/SystemOverview'
import UserTable from './_components/UserTable'
import AnalyticsCharts from './_components/AnalyticsCharts'
import AnnouncementsFeed from './_components/AnnouncementsFeed'

async function getSuperAdminData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalUsers,
    totalTechnicians,
    totalAdmins,
    pendingWorkOrders,
    openFaults,
    totalPoles,
    poleGroup,
    users,
    faultsByType,
    faultsByStatus,
    usersByRole,
    workOrdersByStatus,
    faultsByBarangay,
    monthlyFaults,
    monthlyResolved,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.TECHNICIAN } }),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.workOrder.count({ where: { status: { in: [WorkOrderStatus.PENDING, WorkOrderStatus.ASSIGNED] } } }),
    prisma.faultReport.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.pole.count(),
    prisma.pole.groupBy({ by: ['status'], _count: true }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        city: true,
        barangay: true,
        createdAt: true,
      },
    }),
    prisma.faultReport.groupBy({ by: ['faultType'], _count: true }),
    prisma.faultReport.groupBy({ by: ['status'], _count: true }),
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.workOrder.groupBy({ by: ['status'], _count: true }),
    prisma.faultReport.findMany({
      select: { pole: { select: { barangay: true } } },
    }),
    prisma.faultReport.count({ where: { reportedAt: { gte: startOfMonth } } }),
    prisma.workOrder.count({ where: { status: 'RESOLVED', resolvedAt: { gte: startOfMonth } } }),
  ])

  const statusMap = Object.fromEntries(poleGroup.map((p) => [p.status, p._count]))

  const resolvedOrders = await prisma.workOrder.findMany({
    where: { status: 'RESOLVED', resolvedAt: { not: null } },
    select: { assignedAt: true, resolvedAt: true },
  })

  let avgResolutionHours: number | null = null
  if (resolvedOrders.length > 0) {
    const totalMs = resolvedOrders.reduce((acc, o) => {
      return acc + (o.resolvedAt!.getTime() - o.assignedAt.getTime())
    }, 0)
    avgResolutionHours = Math.round(totalMs / resolvedOrders.length / 1000 / 60 / 60)
  }

  const recentFixes = await prisma.workOrder.count({
    where: {
      status: WorkOrderStatus.RESOLVED,
      resolvedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  })

  const barangayMap: Record<string, number> = {}
  for (const r of faultsByBarangay) {
    const b = r.pole.barangay
    barangayMap[b] = (barangayMap[b] ?? 0) + 1
  }

  return {
    totalUsers,
    totalTechnicians,
    totalAdmins,
    pendingWorkOrders,
    openFaults,
    totalPoles,
    poleStats: {
      total: totalPoles,
      active: statusMap['ACTIVE'] ?? 0,
      faulty: statusMap['FAULTY'] ?? 0,
      underMaintenance: statusMap['UNDER_MAINTENANCE'] ?? 0,
      decommissioned: statusMap['DECOMMISSIONED'] ?? 0,
    },
    avgResolutionHours,
    recentFixes,
    users,
    analytics: {
      faultTypes: faultsByType.map(f => ({ type: f.faultType, count: f._count })),
      faultStatuses: faultsByStatus.map(f => ({ type: f.status, count: f._count })),
      usersByRole: usersByRole.map(r => ({ type: r.role, count: r._count })),
      workOrderStatuses: workOrdersByStatus.map(w => ({ type: w.status, count: w._count })),
      topFaultBarangays: Object.entries(barangayMap)
        .map(([barangay, count]) => ({ barangay, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      monthlyFaults,
      monthlyResolved,
      poleStats: {
        active: statusMap['ACTIVE'] ?? 0,
        faulty: statusMap['FAULTY'] ?? 0,
        underMaintenance: statusMap['UNDER_MAINTENANCE'] ?? 0,
        decommissioned: statusMap['DECOMMISSIONED'] ?? 0,
      },
    },
  }
}

export default async function SuperAdminDashboard() {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPERADMIN') {
    redirect('/dashboard')
  }

  const data = await getSuperAdminData()

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Full system oversight — manage roles, monitor infrastructure, and review all users.
        </p>
      </div>

      <SuperAdminStatsRow
        totalUsers={data.totalUsers}
        totalTechnicians={data.totalTechnicians}
        totalAdmins={data.totalAdmins}
        pendingWorkOrders={data.pendingWorkOrders}
        openFaults={data.openFaults}
        totalPoles={data.totalPoles}
      />

      <AnnouncementsFeed />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemOverview
          poleStats={data.poleStats}
          avgResolutionHours={data.avgResolutionHours}
          recentFixes={data.recentFixes}
        />
        <RoleManagement users={data.users} />
      </div>

      <AnalyticsCharts data={data.analytics} />

      <UserTable users={data.users} />
    </div>
  )
}
