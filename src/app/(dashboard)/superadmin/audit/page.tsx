import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import AuditLogClient from './AuditLogClient'

export default async function SuperAdminAudit() {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPERADMIN') redirect('/dashboard')

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Track all administrative actions performed across the system.</p>
      </div>
      <AuditLogClient logs={logs} />
    </div>
  )
}
