"use client"

import { useState, useEffect } from "react"
import { BarChart3, X, CheckCircle, Siren, Wrench, Lightbulb, Zap } from "lucide-react"

interface DashboardControlsProps {
  userRole: string
}

export default function DashboardControls({ userRole }: DashboardControlsProps) {
  const [location, setLocation] = useState("Quezon City")
  const [isOpen, setIsOpen] = useState(false)

  // 1. Fetch Browser GPS coordinates & Reverse Geocode
  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const res = await fetch(
            `/api/geocode?lat=${latitude}&lon=${longitude}`
          )
          const data = await res.json()
          
          // Fallback sequence to get local city/municipality name
          const city = data.address?.city || data.address?.town || data.address?.village || "Quezon City"
          setLocation(city)
        } catch (err) {
          console.error("Geolocation parsing failed:", err)
        }
      },
      (error) => {
        console.warn("Location permission denied. Defaulting to Quezon City.", error)
      }
    )
  }, [])

  return (
    <>
      {/* GEOLOCATION TELEMETRY ELEMENT */}
      {/* This portals its runtime text up to the parent layout dynamically using a React effect hack */}
      <span className="hidden-geo-data hidden" data-location={location} />

      {/* SIDEBAR SYSTEM OVERVIEW LINK (Visible only to Admin/Superadmin) */}
      {(userRole === "ADMIN" || userRole === "SUPERADMIN") && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors text-left cursor-pointer mt-1"
        >
          <BarChart3 className="w-4 h-4" />
          System Overview
        </button>
      )}

      {/* FLOATING METRICS POPUP PANEL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-sm">
          {/* Backdrop Click Trap to Dismiss */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          {/* White Card Console */}
          <div className="relative z-10 w-[92vw] max-w-6xl h-[85vh] bg-white/95 backdrop-blur-md border border-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col p-6 md:p-8 overflow-y-auto">
            
            {/* Close Cross Trigger */}
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 size-8 flex items-center justify-center rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title Header */}
            <div className="mb-6 pr-8">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                System Overview Metrics Dashboard
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Real-time crowd sourced operational summaries and municipal node tracking profiles.
              </p>
            </div>

            {/* Metrics Row Grid Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Fixes</span>
                <span className="text-2xl font-black text-slate-800 my-1">MCRT1</span>
                <span className="text-[10px] text-emerald-600 font-medium inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Resolved in last 2 hours</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Reported Outages</span>
                <span className="text-3xl font-black text-slate-800 my-1">9</span>
                <span className="text-[10px] text-rose-600 font-medium inline-flex items-center gap-1"><Siren className="w-3 h-3" /> Unresolved civic tickets</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ongoing Maintenance</span>
                <span className="text-3xl font-black text-slate-800 my-1">3</span>
                <span className="text-[10px] text-amber-600 font-medium inline-flex items-center gap-1"><Wrench className="w-3 h-3" /> Crew active in field</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Street With Least Lights</span>
                <span className="text-xl font-bold text-slate-800 truncate my-1">Sta. Mesa</span>
                <span className="text-[10px] text-slate-500 font-medium inline-flex items-center gap-1"><Lightbulb className="w-3 h-3" /> 5 units</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Street With Most Lights</span>
                <span className="text-xl font-bold text-slate-800 truncate my-1">Pureza</span>
                <span className="text-[10px] text-slate-500 font-medium inline-flex items-center gap-1"><Zap className="w-3 h-3" /> 67 units</span>
              </div>
            </div>

            {/* Activity Logs Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="mb-3">
                <h2 className="text-lg font-bold text-slate-800">Recent System Activity Logs</h2>
                <p className="text-xs text-slate-400">Real-time vertical tracking feed of infrastructure diagnostics, maintenance logs, and civic reports.</p>
              </div>
              <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-4 overflow-y-auto">
                <div className="text-center text-slate-400 text-sm py-12">
                  Awaiting systemic log stream entries...
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}