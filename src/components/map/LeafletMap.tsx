// leafletmap.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, ZoomControl,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import LocationDetails from '../LocationDetails';
import StreetlightLayer, { PoleStatus } from './StreetlightLayer' // [CHANGED] import PoleStatus type
import { getPoleFaultsByCoord } from '@/actions/poles'

const customMarkerIcon = new L.DivIcon({
  className: 'bg-transparent',
  html: `<div style="color: #b23b3b; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});
const customMarkerIconBounce = new L.DivIcon({
  className: 'bg-transparent marker-bounce',
  html: `<div style="color: #b23b3b; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function MapUpdater({ targetLocation }: { targetLocation?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (targetLocation) {
      map.panTo(targetLocation, { animate: true, duration: 0.4 });
    }
  }, [targetLocation, map]);
  return null;
}

interface LeafletMapProps {
  targetLocation?: [number, number] | null;
  onMarkerClick?: () => void;
  filter?: PoleStatus | null;
}

export default function LeafletMap({ targetLocation, onMarkerClick, filter }: LeafletMapProps) {
  const defaultCenter: [number, number] = [14.6507, 120.9842];

  const mapKey = targetLocation ? `${targetLocation[0]}-${targetLocation[1]}` : 'default-map';

  const [activeLight, setActiveLight] = useState<[number, number] | null>(null);
  const [selectedLight, setSelectedLight] = useState<[number, number] | null>(null);
  // [ADDED] track the status of the clicked streetlight so LocationDetails shows it correctly
  const [activeLightStatus, setActiveLightStatus] = useState<PoleStatus>('ACTIVE');

  const [poleData, setPoleData] = useState<{
    id: string
    poleCode: string
    address: string
    barangay: string
    faultReports: Array<{
      id: string
      description: string
      faultType: string
      status: string
      reportedAt: Date
      reportedBy: { firstName: string; lastName: string } | null
    }>
  } | null>(null)

  // [CHANGED] now receives status from StreetlightLayer and stores it in state
  const handleLightClick = async (pos: [number, number], status: PoleStatus) => {
    setActiveLight(pos);
    setSelectedLight(pos);
    setActiveLightStatus(status); // [ADDED]
    setShowDetails(true);
    onMarkerClick?.();
    const [pole, geoRes] = await Promise.all([
      getPoleFaultsByCoord(pos[0], pos[1]),
      fetch(`/api/geocode?lat=${pos[0]}&lon=${pos[1]}`).catch(() => null),
    ])
    let resolvedAddress = "Unknown location"
    let resolvedBarangay = ""
    if (geoRes && geoRes.ok) {
      const geo = await geoRes.json()
      if (geo?.display_name) {
        resolvedAddress = geo.display_name
        resolvedBarangay = geo.address?.barangay || geo.address?.village || geo.address?.town || geo.address?.city || ""
      }
    }
    if (pole) {
      setPoleData({
        id: pole.id,
        poleCode: pole.poleCode,
        address: resolvedAddress,
        barangay: resolvedBarangay || pole.barangay,
        faultReports: pole.faultReports.map((r) => ({
          id: r.id,
          description: r.description,
          faultType: r.faultType,
          status: r.status,
          reportedAt: r.reportedAt,
          reportedBy: r.reportedBy ? { firstName: r.reportedBy.firstName, lastName: r.reportedBy.lastName } : null,
        })),
      })
    } else {
      setPoleData({
        id: "",
        poleCode: "",
        address: resolvedAddress,
        barangay: resolvedBarangay,
        faultReports: [],
      })
    }
  };

  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('.map-container') || t.closest('.location-details')) return;
      setShowDetails(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setActiveLight(null);
    setSelectedLight(null);
    setActiveLightStatus('ACTIVE'); // [ADDED] reset status on location change
    setShowDetails(false);
    setPoleData(null);
  }, [targetLocation]);

  const markerPosition: [number, number] = activeLight ?? targetLocation ?? defaultCenter;

  return (
    <div className="absolute inset-0 z-[0] map-container">
      <MapContainer
        key={mapKey}
        center={targetLocation || defaultCenter}
        zoom={16}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <ZoomControl position="bottomright" />
        <MapUpdater targetLocation={activeLight ?? targetLocation} />

        <StreetlightLayer
          onLightClick={handleLightClick}
          selectedLight={selectedLight}
          filter={filter ?? null}
        />
        <Marker
          position={markerPosition}
          icon={activeLight ? customMarkerIconBounce : customMarkerIcon}
          eventHandlers={{
            click: () => {
              setShowDetails(true);
              onMarkerClick?.();
            },
          }}
        />
        <div className="location-details">
          <LocationDetails
            isOpen={showDetails}
            title={
              activeLight
                ? poleData?.poleCode ?? `Streetlight @ ${activeLight[0].toFixed(4)}, ${activeLight[1].toFixed(4)}`
                : (targetLocation ? "Searched Location" : "Default Location")
            }
            address={
              activeLight
                ? poleData?.address ?? "Live node — OpenStreetMap"
                : "Quezon City, Metro Manila"
            }
            status={activeLight ? activeLightStatus : 'ACTIVE'}
            poleCode={poleData?.poleCode}
            barangay={poleData?.barangay}
            latitude={activeLight?.[0] ?? targetLocation?.[0] ?? defaultCenter[0]}
            longitude={activeLight?.[1] ?? targetLocation?.[1] ?? defaultCenter[1]}
            faultReports={poleData?.faultReports ?? null}
          />
        </div>

      </MapContainer>
    </div>
  );
}