
'use client'

import { useEffect, useRef, useState } from 'react'
import { Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

export type PoleStatus = 'ACTIVE' | 'FAULTY' | 'UNDER_MAINTENANCE' | 'DECOMMISSIONED'

interface OsmLight {
  position: [number, number]
  status: PoleStatus
}

interface Props {
  onLightClick?: (pos: [number, number], status: PoleStatus) => void
  selectedLight?: [number, number] | null
  interactive?: boolean
  filter?: PoleStatus | null
}

const STATUS_ICON_FILE: Record<PoleStatus, string> = {
  ACTIVE: '/marker_icons/lamp-active.png',
  FAULTY: '/marker_icons/lamp-faulty.png',
  UNDER_MAINTENANCE: '/marker_icons/lamp-under-maintenance.png',
  DECOMMISSIONED: '/marker_icons/lamp-decommissioned.png',
}

const STREETLIGHT_ICON_PX = 22

const WEIGHTED_STATUSES: PoleStatus[] = [
  ...Array(60).fill('ACTIVE'),
  ...Array(25).fill('FAULTY'),
  ...Array(10).fill('UNDER_MAINTENANCE'),
  ...Array(5).fill('DECOMMISSIONED'),
]

function assignStatus(lat: number, lon: number): PoleStatus {
  const hash = Math.abs(Math.round((lat * 1e5 + lon * 1e5) * 31)) % WEIGHTED_STATUSES.length
  return WEIGHTED_STATUSES[hash]
}

type LightVisualState = 'default' | 'hovered' | 'selected'

const statusIconCache = new Map<string, L.Icon>()

function getStatusIcon(status: PoleStatus, state: LightVisualState): L.Icon {
  const cacheKey = `${status}-${state}`
  const cached = statusIconCache.get(cacheKey)
  if (cached) return cached

  const icon = new L.Icon({
    iconUrl: STATUS_ICON_FILE[status] ?? STATUS_ICON_FILE.ACTIVE,
    iconSize: [STREETLIGHT_ICON_PX, STREETLIGHT_ICON_PX],
    iconAnchor: [STREETLIGHT_ICON_PX / 2, STREETLIGHT_ICON_PX / 2],
    className: [
      'streetlight-status-icon',
      state !== 'default' ? `streetlight-status-icon--${state}` : '',
    ].filter(Boolean).join(' '),
  })

  statusIconCache.set(cacheKey, icon)
  return icon
}

export default function StreetlightLayer({ onLightClick, selectedLight, interactive = true, filter }: Props) {
  useEffect(() => {
    const styleId = 'marker-bounce-style'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        @keyframes markerBounce {
          0%,  100% { transform: translateY(0px);   }
          25%        { transform: translateY(-6px);  }
          55%        { transform: translateY(-11px); }
          75%        { transform: translateY(-4px);  }
        }
        .leaflet-marker-icon.marker-bounce:hover div {
          animation: markerBounce 0.45s ease;
        }
        .streetlight-status-icon {
          transition: transform 0.2s ease, filter 0.2s ease;
          transform-origin: center center;
        }
        .streetlight-status-icon--hovered {
          transform: scale(1.3);
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
        }
        .streetlight-status-icon--selected {
          transform: scale(1.5);
          filter: drop-shadow(0 0 6px rgba(0,0,0,0.5));
          animation: markerBounce 0.45s ease;
        }
      `
      document.head.appendChild(style)
    }
    return () => { document.getElementById(styleId)?.remove() }
  }, [])

  const [lights, setLights] = useState<OsmLight[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cooldownRef = useRef<number>(0)
  const failCooldownRef = useRef<number>(0)
  const lastBboxRef = useRef<string>('')

  const fetchLights = async (map: L.Map) => {
    const zoom = map.getZoom()
    if (zoom < 14) { setLights([]); setError(null); return }

    const bounds = map.getBounds()
    const dec = zoom >= 17 ? 5 : zoom >= 15 ? 4 : 3
    const bbox = `${bounds.getSouth().toFixed(dec)},${bounds.getWest().toFixed(dec)},${bounds.getNorth().toFixed(dec)},${bounds.getEast().toFixed(dec)}`

    if (bbox === lastBboxRef.current) return
    lastBboxRef.current = bbox

    if (Date.now() < cooldownRef.current) return
    if (Date.now() < failCooldownRef.current) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsFetching(true)
    setError(null)

    const query = `[out:json][timeout:10];(node["highway"="street_lamp"](${bbox});node["man_made"="street_lamp"](${bbox});node["amenity"="street_lamp"](${bbox});way["lit"="yes"]["highway"](${bbox}););out body geom;`

    try {
      const res = await fetch(`/api/overpass?data=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
      if (!res.ok) {
        if (res.status === 429) {
          cooldownRef.current = Date.now() + 30000
        }
        throw new Error(`Server error ${res.status}`)
      }
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch { throw new Error('Invalid response') }
      if (!data?.elements) throw new Error('No elements in response')

      const fetched: OsmLight[] = []
      for (const el of data.elements) {
        if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
          fetched.push({ position: [el.lat, el.lon], status: assignStatus(el.lat, el.lon) })
        } else if (el.type === 'way' && Array.isArray(el.geometry)) {
          el.geometry.forEach((pt: any, idx: number) => {
            if (pt && idx % 3 === 0) {
              fetched.push({ position: [pt.lat, pt.lon], status: assignStatus(pt.lat, pt.lon) })
            }
          })
        }
      }

      setLights(fetched)
      setIsFetching(false)
      setError(null)
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setIsFetching(false)
      setError('Could not fetch streetlight data')
      failCooldownRef.current = Date.now() + 10000
    }
  }

  const map = useMapEvents({
    moveend: () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
      debounceRef.current = setTimeout(() => fetchLights(map), 400)
    },
  })

  useEffect(() => {
    fetchLights(map)
    return () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const isSelected = (pos: [number, number]) =>
    !!selectedLight &&
    selectedLight[0] === pos[0] &&
    selectedLight[1] === pos[1]

  const filteredLights = filter
    ? lights.filter(light => light.status === filter)
    : lights

  return (
    <>
      {isFetching && (
        <div className="absolute top-20 right-4 z-[400] bg-white px-3 py-1 rounded-full shadow-md text-xs font-bold text-slate-600 border border-slate-200">
          Fetching live streetlights...
        </div>
      )}
      {error && !isFetching && (
        <div className="absolute top-20 right-4 z-[400] bg-white px-3 py-1 rounded-full shadow-md text-xs font-bold text-red-500 border border-slate-200">
          {error}
        </div>
      )}
      {!isFetching && !error && filteredLights.length === 0 && (
        <div className="absolute top-20 right-4 z-[400] bg-white px-3 py-1 rounded-full shadow-md text-xs font-bold text-amber-500 border border-slate-200">
          No {filter ? filter.replace(/_/g, ' ').toLowerCase() : ''} streetlights found
        </div>
      )}

      {filter && lights.length > 0 && (
        <div className="absolute top-36 right-4 z-[400] bg-white px-3 py-1 rounded-full shadow-md text-xs font-bold text-slate-600 border border-slate-200">
          Showing {filteredLights.length}/{lights.length} lights
        </div>
      )}

      {filteredLights.map((light, index) => {
        const state: LightVisualState = isSelected(light.position)
          ? 'selected'
          : hoveredIndex === index
            ? 'hovered'
            : 'default'

        return (
          <Marker
            key={`light-${light.position[0]}-${light.position[1]}-${index}`}
            position={light.position}
            icon={getStatusIcon(light.status, state)}
            eventHandlers={interactive ? {
              // [CHANGED] passes status along so LeafletMap can show it in LocationDetails
              click: () => onLightClick?.(light.position, light.status),
              mouseover: () => setHoveredIndex(index),
              mouseout: () => setHoveredIndex(null),
            } : undefined}
          />
        )
      })}
    </>
  )
}