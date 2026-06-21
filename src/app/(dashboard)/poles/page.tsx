import { getPoles } from '@/actions/poles'
import Link from 'next/link'

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  FAULTY: 'bg-red-50 text-red-600',
  UNDER_MAINTENANCE: 'bg-amber-50 text-amber-700',
  DECOMMISSIONED: 'bg-gray-100 text-gray-500',
}

export default async function PolesPage() {
  const poles = await getPoles()

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Poles</h1>
        <Link
          href="/poles/new"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add pole
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[550px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Code</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Address</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Barangay</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Faults</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {poles.map((pole) => (
              <tr key={pole.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{pole.poleCode}</td>
                <td className="px-4 py-3 text-gray-700">{pole.address}</td>
                <td className="px-4 py-3 text-gray-500">{pole.barangay}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[pole.status]}`}>
                    {pole.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{pole._count.faultReports}</td>
                <td className="px-4 py-3">
                  <Link href={`/poles/${pole.id}`} className="text-blue-600 text-xs hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
