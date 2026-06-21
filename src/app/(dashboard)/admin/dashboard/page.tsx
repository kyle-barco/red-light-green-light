import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role, WorkOrderStatus } from '@/lib/generated/prisma/client'
import AdminStatsRow from './_components/AdminStatRow'
import UserTable from './_components/UserTable'
import RecentWorkOrders from './_components/RecentWorkOrders'
import TechnicianOverview from './_components/TechnicianOverview'
import AnnouncementsFeed from './_components/AnnouncementsFeed'

async function getAdminData() {
  const [
    totalUsers,
    totalTechnicians,
    pendingWorkOrders,
    openFaults,
    users,
    recentWorkOrders,
    technicians,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { in: [Role.USER] } } }),
    prisma.user.count({ where: { role: Role.TECHNICIAN } }),
    prisma.workOrder.count({ where: { status: { in: [WorkOrderStatus.PENDING, WorkOrderStatus.ASSIGNED] } } }),
    prisma.faultReport.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
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
    prisma.workOrder.findMany({
      orderBy: { assignedAt: 'desc' },
      take: 8,
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        assignedBy: { select: { firstName: true, lastName: true } },
        faultReport: {
          include: { pole: { select: { poleCode: true, address: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: Role.TECHNICIAN },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        barangay: true,
        workOrdersAssigned: {
          where: { status: { in: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.PENDING] } },
          select: { id: true, status: true },
        },
      },
    }),
  ])

  return { totalUsers, totalTechnicians, pendingWorkOrders, openFaults, users, recentWorkOrders, technicians }
}

export default async function AdminDashboard() {
  const session = await getSession()
  if (!session || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  const data = await getAdminData()

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage users, technicians, and monitor field operations.
        </p>
      </div>

      {/* Stats Row */}
      <AdminStatsRow
        totalUsers={data.totalUsers}
        totalTechnicians={data.totalTechnicians}
        pendingWorkOrders={data.pendingWorkOrders}
        openFaults={data.openFaults}
      />

      <AnnouncementsFeed />

      {/* Two-column grid: Technician overview + Recent Work Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TechnicianOverview technicians={data.technicians} />
        <RecentWorkOrders workOrders={data.recentWorkOrders} />
      </div>

      {/* Full-width User Table */}
      <UserTable users={data.users} />
    </div>
  )
}