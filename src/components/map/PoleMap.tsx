//polemap.tsx

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

type Pole = {
  id: string
  poleCode: string
  address: string
  latitude: number
  longitude: number
  status: 'ACTIVE' | 'FAULTY' | 'UNDER_MAINTENANCE' | 'DECOMMISSIONED'
}

const statusColor: Record<Pole['status'], string> = {
  ACTIVE: '#16a34a',
  FAULTY: '#ef4444',
  UNDER_MAINTENANCE: '#d97706',
  DECOMMISSIONED: '#9ca3af',
}

const statusLabel: Record<Pole['status'], string> = {
  ACTIVE: 'Active',
  FAULTY: 'Faulty',
  UNDER_MAINTENANCE: 'Under Maintenance',
  DECOMMISSIONED: 'Decommissioned',
}

export default function PoleMap({ poles }: { poles: Pole[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (containerRef.current) {
        const container = containerRef.current.querySelector('.leaflet-container') as any
        if (container?._leaflet_id) {
          container._leaflet_id = null
        }
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="relative h-full w-full rounded-lg overflow-hidden">
      <MapContainer
        center={[14.676, 121.043]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {poles.map((pole) => (
          <CircleMarker
            key={pole.id}
            center={[pole.latitude, pole.longitude]}
            radius={8}
            fillColor={statusColor[pole.status]}
            color="#ffffff"
            weight={2}
            fillOpacity={0.9}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{pole.poleCode}</p>
                <p className="text-gray-500">{pole.address}</p>
                <p className="mt-1" style={{ color: statusColor[pole.status] }}>
                  {statusLabel[pole.status]}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-sm border border-gray-100 p-3 z-[1000]">
        <p className="text-xs font-medium text-gray-700 mb-2">Legend</p>
        {Object.entries(statusLabel).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2 mb-1 last:mb-0">
            <span
              className="w-3 h-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: statusColor[status as Pole['status']] }}
            />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}