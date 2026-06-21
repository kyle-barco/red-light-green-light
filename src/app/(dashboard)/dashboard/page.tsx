import prisma from '@/lib/prisma'
import PoleMap from '@/components/map/PoleMapClient'
import { PoleStatus } from '@/lib/generated/prisma/client'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

async function getDashboardStats() {
  const [poles, openFaults, resolvedOrders] = await Promise.all([
    prisma.pole.groupBy({ by: ['status'], _count: true }),
    prisma.faultReport.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.workOrder.findMany({
      where: { status: 'RESOLVED', resolvedAt: { not: null } },
      select: { assignedAt: true, resolvedAt: true },
    }),
  ])
  const statusMap = Object.fromEntries(poles.map((p) => [p.status, p._count]))
  const totalPoles = poles.reduce((acc, p) => acc + p._count, 0)
  let avgResolutionHours: number | null = null
  if (resolvedOrders.length > 0) {
    const totalMs = resolvedOrders.reduce((acc, o) => {
      return acc + (o.resolvedAt!.getTime() - o.assignedAt.getTime())
    }, 0)
    avgResolutionHours = Math.round(totalMs / resolvedOrders.length / 1000 / 60 / 60)
  }
  return {
    totalPoles,
    activePoles: statusMap[PoleStatus.ACTIVE] ?? 0,
    faultyPoles: statusMap[PoleStatus.FAULTY] ?? 0,
    underMaintenancePoles: statusMap[PoleStatus.UNDER_MAINTENANCE] ?? 0,
    openFaults,
    avgResolutionHours,
  }
}

async function getTechnicianStats(userId: string) {
  const [assigned, inProgress, resolvedThisWeek] = await Promise.all([
    prisma.workOrder.count({ where: { assignedToId: userId, status: { in: ['ASSIGNED', 'PENDING'] } } }),
    prisma.workOrder.count({ where: { assignedToId: userId, status: 'IN_PROGRESS' } }),
    prisma.workOrder.count({
      where: {
        assignedToId: userId,
        status: 'RESOLVED',
        resolvedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])
  return { assigned, inProgress, resolvedThisWeek }
}

const statCards = (stats: Awaited<ReturnType<typeof getDashboardStats>>) => [
  { label: 'Total poles', value: stats.totalPoles, color: 'text-gray-900' },
  { label: 'Active', value: stats.activePoles, color: 'text-green-600' },
  { label: 'Faulty', value: stats.faultyPoles, color: 'text-red-500' },
  { label: 'Under maintenance', value: stats.underMaintenancePoles, color: 'text-amber-500' },
  { label: 'Open fault reports', value: stats.openFaults, color: 'text-orange-500' },
  {
    label: 'Avg resolution time',
    value: stats.avgResolutionHours != null ? `${stats.avgResolutionHours}h` : '—',
    color: 'text-blue-600',
  },
]

function StatGrid({ cards }: { cards: { label: string; value: string | number; color: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">{card.label}</p>
          <p className={`text-2xl font-semibold mt-1 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.user.role
  const userId = session.user.id

  if (role === 'USER') redirect('/user/dashboard')

  // SUPERADMIN & ADMIN: full network overview
  if (role === 'SUPERADMIN' || role === 'ADMIN') {
    const [stats, poles] = await Promise.all([
      getDashboardStats(),
      prisma.pole.findMany({ select: { id: true, poleCode: true, address: true, latitude: true, longitude: true, status: true } }),
    ])
    return (
      <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <StatGrid cards={statCards(stats)} />
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Pole locations</p>
          <div style={{ height: '420px' }}>
            <PoleMap poles={poles} />
          </div>
        </div>
      </div>
    )
  }

  // TECHNICIAN: their work orders
  if (role === 'TECHNICIAN') {
    const stats = await getTechnicianStats(userId)
    return (
      <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
        <h1 className="text-lg font-semibold text-gray-900">My Work</h1>
        <StatGrid
          cards={[
            { label: 'Assigned to me', value: stats.assigned, color: 'text-blue-600' },
            { label: 'In progress', value: stats.inProgress, color: 'text-amber-500' },
            { label: 'Resolved this week', value: stats.resolvedThisWeek, color: 'text-green-600' },
          ]}
        />
        {/* TODO: list of assigned work orders */}
      </div>
    )
  }

  redirect('/login')
}