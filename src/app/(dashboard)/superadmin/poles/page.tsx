import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import SuperAdminPolesClient from './SuperAdminPolesClient'

export default async function SuperAdminPoles() {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPERADMIN') redirect('/dashboard')

  const [poles, barangays] = await Promise.all([
    prisma.pole.findMany({
      orderBy: { poleCode: 'asc' },
      include: { _count: { select: { faultReports: true, statusLogs: true } } },
    }),
    prisma.pole.findMany({
      distinct: ['barangay'],
      select: { barangay: true },
      orderBy: { barangay: 'asc' },
    }),
  ])

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pole Registry</h1>
        <p className="text-sm text-gray-500 mt-1">Full CRUD management of all streetlight poles in the network.</p>
      </div>
      <SuperAdminPolesClient
        poles={poles}
        barangays={barangays.map(b => b.barangay)}
        userId={session.user.id}
      />
    </div>
  )
}
