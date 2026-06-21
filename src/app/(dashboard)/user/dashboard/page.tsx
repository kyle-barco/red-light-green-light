import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { ReportStatus } from '@/lib/generated/prisma'
import UserStatsRow from './_components/UserStatsRow'
import MyReportsTable from './_components/MyReportsTable'
import MyRecentActivity from './_components/MyRecentActivity'
import TechnicianApplyCard from './_components/TechnicianApplyCard'
import UserCharts from './_components/UserCharts'
import AnnouncementsFeed from './_components/AnnouncementsFeed'
import { Hand } from 'lucide-react'

async function getUserData(userId: string) {
  const notDeleted = { reportedById: userId, status: { not: ReportStatus.DELETED } }
  const [myReports, openReports, resolvedReports, recentReports, chartReports] = await Promise.all([
    prisma.faultReport.count({ where: notDeleted }),
    prisma.faultReport.count({ where: { ...notDeleted, status: { in: [ReportStatus.OPEN, ReportStatus.IN_PROGRESS] } } }),
    prisma.faultReport.count({ where: { ...notDeleted, status: { in: [ReportStatus.RESOLVED, ReportStatus.CLOSED] } } }),
    prisma.faultReport.findMany({
      where: notDeleted,
      orderBy: { reportedAt: 'desc' },
      take: 10,
      include: {
        pole: { select: { poleCode: true, address: true, barangay: true } },
        workOrder: { select: { status: true, assignedTo: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.faultReport.findMany({
      where: notDeleted,
      select: { faultType: true, status: true, reportedAt: true },
    }),
  ])

  return { myReports, openReports, resolvedReports, recentReports, chartReports }
}

export default async function UserDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== 'USER') redirect('/dashboard')

  const data = await getUserData(session.user.id)
  const firstName = session.user.name?.split(' ')[0] ?? 'there'

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">Hi, {firstName} <Hand className="w-6 h-6" /></h1>
        <p className="text-sm text-gray-500 mt-1">
          Here's a summary of your reported issues and their current status.
        </p>
      </div>

      {/* Technician Application */}
      <TechnicianApplyCard />

      <AnnouncementsFeed />

      {/* Stats Row */}
      <UserStatsRow
        total={data.myReports}
        open={data.openReports}
        resolved={data.resolvedReports}
      />

      {/* Analytics Charts */}
      {data.chartReports.length > 0 && <UserCharts reports={data.chartReports} />}

      {/* Two-column: recent activity + report a new issue CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MyReportsTable reports={data.recentReports} />
        </div>
        <MyRecentActivity />
      </div>
    </div>
  )
}