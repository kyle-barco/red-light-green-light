import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getInventory } from '@/actions/inventory'
import InventoryClient from './InventoryClient'

export default async function InventoryPage() {
  const session = await getSession()
  if (!session || !['TECHNICIAN', 'ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  const items = await getInventory()

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-0.5 mb-6">Track spare parts, bulbs, and equipment stock.</p>
      </div>
      <InventoryClient items={items} />
    </div>
  )
}
