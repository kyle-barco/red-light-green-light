import prisma  from '@/lib/prisma'

export default async function ReportsPage() {
  const [polesByBarangay, faultsByType, recentLogs] = await Promise.all([
    prisma.pole.groupBy({
      by: ['barangay', 'status'],
      _count: true,
      orderBy: { barangay: 'asc' },
    }),
    prisma.faultReport.groupBy({
      by: ['faultType'],
      _count: true,
      orderBy: { _count: { faultType: 'desc' } },
    }),
    prisma.statusLog.findMany({
      take: 20,
      orderBy: { changedAt: 'desc' },
      include: { pole: true, changedBy: true },
    }),
  ])

  // Group poles by barangay
  const barangayMap: Record<string, Record<string, number>> = {}
  for (const row of polesByBarangay) {
    if (!barangayMap[row.barangay]) barangayMap[row.barangay] = {}
    barangayMap[row.barangay][row.status] = row._count
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <h1 className="text-lg font-semibold text-gray-900">Reports</h1>

      {/* Poles by barangay */}
      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Poles by barangay</h2>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left pb-2 text-xs font-medium text-gray-500">Barangay</th>
              <th className="text-right pb-2 text-xs font-medium text-green-600">Active</th>
              <th className="text-right pb-2 text-xs font-medium text-red-500">Faulty</th>
              <th className="text-right pb-2 text-xs font-medium text-amber-500">Maintenance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Object.entries(barangayMap).map(([barangay, counts]) => (
              <tr key={barangay}>
                <td className="py-2 text-gray-700">{barangay}</td>
                <td className="py-2 text-right text-green-600">{counts.ACTIVE ?? 0}</td>
                <td className="py-2 text-right text-red-500">{counts.FAULTY ?? 0}</td>
                <td className="py-2 text-right text-amber-500">{counts.UNDER_MAINTENANCE ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      {/* Faults by type */}
      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Faults by type</h2>
        <div className="space-y-2">
          {faultsByType.map((row) => (
            <div key={row.faultType} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40">{row.faultType.replace(/_/g, ' ')}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(row._count / (faultsByType[0]?._count ?? 1)) * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-500 w-6 text-right">{row._count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Recent status changes</h2>
        <div className="space-y-3">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-gray-600">{log.pole.poleCode}</span>
                <span className="text-xs text-gray-400 mx-2">→</span>
                <span className="text-xs text-gray-700">{log.toStatus.replace('_', ' ')}</span>
                {log.reason && <p className="text-xs text-gray-400 mt-0.5">{log.reason}</p>}
              </div>
              <span className="text-xs text-gray-400 shrink-0 ml-4">
                {new Date(log.changedAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
