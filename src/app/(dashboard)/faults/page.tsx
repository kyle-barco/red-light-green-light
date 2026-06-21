import { getFaultReports } from '@/actions/faults'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import FaultsClient from './FaultsClient'

const statusBadge: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-600',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  RESOLVED: 'bg-green-50 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
}

export default async function FaultsPage() {
  const session = await getSession()
  const reports = await getFaultReports()
  const role = session?.user?.role ?? ''

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <h1 className="text-lg font-semibold text-gray-900">Fault reports</h1>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Pole</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Reported By</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Description</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Reported</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Work order</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/poles/${report.poleId}`} className="text-blue-600 font-mono text-xs hover:underline">
                    {report.pole.poleCode}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {report.reportedBy
                    ? `${report.reportedBy.firstName} ${report.reportedBy.lastName}`
                    : report.reporterName || 'Anonymous'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{report.faultType.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{report.description}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[report.status]}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(report.reportedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {report.workOrder ? (
                    <span className="text-green-600">Created</span>
                  ) : (
                    <span>None</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {report.status === 'OPEN' && (
                    <FaultsClient
                      faultReportId={report.id}
                      role={role}
                      userId={session?.user?.id}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
