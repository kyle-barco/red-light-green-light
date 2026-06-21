import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { Role, WorkOrderStatus } from '@/lib/generated/prisma/client'
import TechnicianStatsRow from './_components/TechnicianStatsRow'
import MyWorkOrders from './_components/MyWorkOrders'
import ActiveFaults from './_components/ActiveFaults'
import AnnouncementsFeed from './_components/AnnouncementsFeed'

async function getTechnicianDashboardData(userId: string) {
  const [assigned, inProgress, resolvedThisWeek, workOrders, activeFaults] = await Promise.all([
    prisma.workOrder.count({ where: { assignedToId: userId, status: { in: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.PENDING] } } }),
    prisma.workOrder.count({ where: { assignedToId: userId, status: WorkOrderStatus.IN_PROGRESS } }),
    prisma.workOrder.count({
      where: {
        assignedToId: userId,
        status: WorkOrderStatus.RESOLVED,
        resolvedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.workOrder.findMany({
      where: { assignedToId: userId },
      orderBy: { assignedAt: 'desc' },
      take: 10,
      include: {
        faultReport: {
          select: { faultType: true, pole: { select: { poleCode: true, address: true } } },
        },
      },
    }),
    prisma.faultReport.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      orderBy: { reportedAt: 'desc' },
      take: 8,
      include: {
        pole: { select: { poleCode: true, address: true } },
      },
    }),
  ])

  const latestAssignment = await prisma.workOrder.findFirst({
    where: { assignedToId: userId },
    orderBy: { assignedAt: 'desc' },
    include: { faultReport: { include: { pole: { select: { poleCode: true } } } } },
  })

  return {
    assigned,
    inProgress,
    resolvedThisWeek,
    latestPole: latestAssignment?.faultReport.pole.poleCode ?? '—',
    workOrders,
    activeFaults,
  }
}

export default async function TechnicianDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== Role.TECHNICIAN) redirect('/dashboard')

  const data = await getTechnicianDashboardData(session.user.id)
  const firstName = session.user.name?.split(' ')[0] ?? 'there'

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hi, {firstName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Here&apos;s an overview of your assigned tasks and field operations.
        </p>
      </div>

      <TechnicianStatsRow
        assigned={data.assigned}
        inProgress={data.inProgress}
        resolvedThisWeek={data.resolvedThisWeek}
        latestPole={data.latestPole}
      />

      <AnnouncementsFeed />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyWorkOrders workOrders={data.workOrders} />
        <ActiveFaults faults={data.activeFaults} />
      </div>
    </div>
  )
}
