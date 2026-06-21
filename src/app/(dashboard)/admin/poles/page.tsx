import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import AdminPolesClient from './AdminPolesClient'

export default async function AdminPolesPage() {
  const session = await getSession()
  if (!session || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  const [poles, barangays] = await Promise.all([
    prisma.pole.findMany({
      orderBy: { poleCode: 'asc' },
      include: { _count: { select: { faultReports: true } } },
    }),
    prisma.pole.findMany({
      distinct: ['barangay'],
      select: { barangay: true },
      orderBy: { barangay: 'asc' },
    }),
  ])

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Pole Data Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Search, filter, and update streetlight pole statuses.</p>
        </div>
      </div>
      <AdminPolesClient
        poles={poles}
        barangays={barangays.map((b) => b.barangay)}
        userId={session.user.id}
      />
    </div>
  )
}
