"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Role } from "@/lib/generated/prisma/client";
import { signOut } from "next-auth/react";
import DarkModeToggle from "@/components/DarkModeToggle";
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import {
  Menu, BarChart, BarChart4, Clock, X, Languages,
  LayoutDashboard, Map, Users, MapPin, AlertTriangle, ClipboardList,
  Package, Wrench, User, Megaphone, Download, GitCompareArrows,
  Settings, ScrollText, Archive, LogOut, Trash2, Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles: Role[]
}

const navItems: NavItem[] = [
  { href: '/superadmin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.SUPERADMIN] },
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.ADMIN] },
  { href: '/technician/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.TECHNICIAN] },
  { href: '/user/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.USER] },
  { href: '/profile', label: 'Profile', icon: User, roles: [Role.SUPERADMIN, Role.ADMIN, Role.TECHNICIAN, Role.USER] },
  { href: '/', label: 'Map View', icon: Map, roles: [Role.USER] },
  { href: '/superadmin/users', label: 'User & Role Management', icon: Users, roles: [Role.SUPERADMIN] },
  { href: '/superadmin/technician-applications', label: 'Technician Apps', icon: Wrench, roles: [Role.SUPERADMIN] },
  { href: '/superadmin/poles', label: 'Pole Registry', icon: MapPin, roles: [Role.SUPERADMIN] },
  { href: '/superadmin/settings', label: 'System Settings', icon: Settings, roles: [Role.SUPERADMIN] },
  { href: '/superadmin/audit', label: 'Audit Log', icon: ScrollText, roles: [Role.SUPERADMIN] },
  { href: '/superadmin/backup', label: 'Backup & Export', icon: Archive, roles: [Role.SUPERADMIN] },
  { href: '/admin/users', label: 'User Management', icon: Users, roles: [Role.ADMIN] },
  { href: '/admin/technician-applications', label: 'Technician Apps', icon: Wrench, roles: [Role.ADMIN] },
  { href: '/admin/poles', label: 'Pole Data', icon: MapPin, roles: [Role.ADMIN] },
  { href: '/admin/faults', label: 'Fault Inbox', icon: AlertTriangle, roles: [Role.ADMIN] },
  { href: '/admin/technicians', label: 'Technicians', icon: Wrench, roles: [Role.ADMIN] },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, roles: [Role.ADMIN] },
  { href: '/admin/workorders', label: 'Work Orders', icon: GitCompareArrows, roles: [Role.ADMIN] },
  { href: '/admin/export', label: 'Export Reports', icon: Download, roles: [Role.ADMIN] },
  { href: '/poles', label: 'Poles', icon: MapPin, roles: [Role.SUPERADMIN, Role.TECHNICIAN] },
  { href: '/faults', label: 'Fault Reports', icon: AlertTriangle, roles: [Role.SUPERADMIN, Role.TECHNICIAN, Role.USER, Role.ADMIN] },
  { href: '/my-reports', label: 'My Reports', icon: ClipboardList, roles: [Role.USER] },
  { href: '/user/trash', label: 'Trash', icon: Trash2, roles: [Role.USER] },
  { href: '/workorders', label: 'Work Orders', icon: ClipboardList, roles: [Role.SUPERADMIN, Role.TECHNICIAN, Role.ADMIN] },
  { href: '/technician/work-queue', label: 'Work Queue', icon: ClipboardList, roles: [Role.TECHNICIAN] },
  { href: '/technician/inventory', label: 'Inventory', icon: Package, roles: [Role.TECHNICIAN] },
  { href: '/', label: 'Field Map', icon: Map, roles: [Role.TECHNICIAN] },
  { href: '/reports', label: 'Reports', icon: BarChart4, roles: [Role.SUPERADMIN, Role.ADMIN] },
]

interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: Date
}

function getNotificationRoute(n: Notification, role: Role): string | null {
  switch (n.type) {
    case 'NEW_FAULT_REPORT':
    case 'FAULT_RESOLVED':
      return '/faults'
    case 'WORK_ORDER':
      return role === Role.TECHNICIAN ? '/technician/work-queue' : '/workorders'
    case 'TECHNICIAN_APPLICATION':
      return role === Role.SUPERADMIN ? '/superadmin/technician-applications' : '/admin/technician-applications'
    case 'APPLICATION_VERIFIED':
    case 'APPLICATION_REJECTED':
    case 'EMAIL_VERIFIED':
      return '/profile'
    default:
      if (role === Role.SUPERADMIN) return '/superadmin/dashboard'
      if (role === Role.ADMIN) return '/admin/dashboard'
      if (role === Role.TECHNICIAN) return '/technician/dashboard'
      return '/user/dashboard'
  }
}

interface Props {
  userRole: Role
  userName: string
}

export default function DashboardSidebar({ userRole, userName }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole))

  useEffect(() => {
    const fetchCount = () => getUnreadCount().then(setUnreadCount).catch(() => {})
    fetchCount()
    const interval = setInterval(fetchCount, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function closeMobile() {
    setIsMobileOpen(false)
    const sidebar = document.getElementById("dashboard-sidebar")
    const overlay = document.getElementById("sidebar-overlay")
    if (sidebar) sidebar.classList.add("-translate-x-full")
    if (overlay) overlay.classList.add("hidden")
  }

  return (
    <>
      <style>{`
        @keyframes bounce-click {
          0%   { transform: scale(1); }
          30%  { transform: scale(0.82); }
          60%  { transform: scale(1.18); }
          80%  { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        .sidebar-btn-bounce:active .sidebar-icon-btn {
          animation: bounce-click 0.35s ease forwards;
        }
      `}</style>

      {/* Mobile toggle */}
      <button
        onClick={() => {
          setIsMobileOpen(!isMobileOpen)
          const sidebar = document.getElementById("dashboard-sidebar")
          const overlay = document.getElementById("sidebar-overlay")
          if (!sidebar || !overlay) return
          sidebar.classList.toggle("-translate-x-full")
          sidebar.classList.toggle("translate-x-0")
          overlay.classList.toggle("hidden")
        }}
        className="fixed z-50 md:hidden top-5 left-4 w-10 h-10 rounded-xl bg-brand-blue border-2 border-[#dba65d] flex items-center justify-center shadow-lg"
      >
        {isMobileOpen ? (
          <X className="w-5 h-5 text-[#dba65d]" strokeWidth={2} />
        ) : (
          <>
            <Menu className="w-5 h-5 text-[#dba65d]" strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Mobile overlay */}
      <div id="sidebar-overlay" className="fixed inset-0 bg-black/30 z-30 hidden md:hidden" onClick={closeMobile} />

      {/* Sidebar */}
      <aside
        id="dashboard-sidebar"
        className="fixed inset-y-0 left-0 -translate-x-full md:relative md:translate-x-0 z-40 w-[64px] bg-brand-blue/95 md:bg-brand-blue/90 backdrop-blur-md md:backdrop-blur-[0.5px] flex-col items-center py-5 shadow-xl justify-between flex transition-transform duration-200"
      >
        <div className="flex flex-col items-center w-full">
          {/* Menu button */}
          <div className="relative w-full py-3 flex flex-col items-center gap-1.5" ref={menuRef}>
            <div className="sidebar-btn-bounce w-full flex flex-col items-center gap-1.5">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`sidebar-icon-btn w-[38px] h-[38px] rounded-[2px] border-2 border-[#dba65d] flex items-center justify-center transition-colors hover:cursor-pointer hover:rounded-full hover:bg-[#dba65d] hover:border-[#dba65d] group ${isMenuOpen ? "bg-[#dba65d] border-[#dba65d]" : ""}`}
              >
                <Menu className={`w-5 h-5 group-hover:text-white ${isMenuOpen ? "text-white" : "text-[#dba65d]"}`} strokeWidth={2} />
              </button>
              <span className="text-[#dba65d] text-[10px] text-center px-0.5 font-bold tracking-wide leading-tight">Menu</span>
            </div>

            {/* Nav popup */}
            {isMenuOpen && (
              <div className="absolute top-0 left-[60px] w-60 bg-white dark:bg-slate-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col z-50 animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="px-4 py-3 bg-[#f8fafc] dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Navigation</span>
                  <button onClick={() => setIsMenuOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
                <div className="py-2 max-h-[60vh] overflow-y-auto">
                  {visibleItems.map((item, idx) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={idx}
                        href={item.href}
                        onClick={() => { setIsMenuOpen(false); closeMobile() }}
                        className={`flex items-center gap-3 px-4 py-2.5 w-full text-left text-[14px] font-medium transition-colors group ${
                          isActive
                            ? "text-[#2f4383] dark:text-slate-100 bg-[#f0f4ff] dark:bg-slate-700"
                            : "text-gray-700 dark:text-slate-200 hover:bg-[#dba65d] hover:text-white"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-[#2f4383]" : "text-gray-400 dark:text-slate-400"} group-hover:text-white transition-colors`} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* System Overview (admin/superadmin) */}
          {(userRole === Role.SUPERADMIN || userRole === Role.ADMIN) && (
            <div
              onClick={() => { router.push(`/${userRole.toLowerCase()}/dashboard`); closeMobile() }}
              className="sidebar-btn-bounce w-full py-3 flex flex-col items-center gap-1.5 cursor-pointer transition-colors hover:cursor-pointer hover:bg-[#3b529a]/50 group"
            >
              <button className="sidebar-icon-btn w-[38px] h-[38px] rounded-[2px] border-2 border-[#dba65d] flex items-center justify-center hover:rounded-full hover:cursor-pointer hover:bg-[#dba65d] transition-all group-hover:bg-[#dba65d]">
                <BarChart className="w-5 h-5 group-hover:text-white text-[#dba65d]" strokeWidth={2} />
              </button>
              <span className="text-[#dba65d] text-[10px] text-center px-0.5 font-bold tracking-wide leading-tight">Overview</span>
            </div>
          )}

          {/* My Dashboard (user) */}
          {userRole === Role.USER && (
            <div
              onClick={() => { router.push('/user/dashboard'); closeMobile() }}
              className="sidebar-btn-bounce w-full py-3 flex flex-col items-center gap-1.5 cursor-pointer transition-colors hover:cursor-pointer hover:bg-[#3b529a]/50 group"
            >
              <button className="sidebar-icon-btn w-[38px] h-[38px] rounded-[2px] border-2 border-[#dba65d] flex items-center justify-center hover:rounded-full transition-all group-hover:bg-[#dba65d]">
                <BarChart className="w-5 h-5 group-hover:text-white text-[#dba65d]" strokeWidth={2} />
              </button>
              <span className="text-[#dba65d] text-[10px] text-center px-0.5 font-bold tracking-wide leading-tight">Dashboard</span>
            </div>
          )}

          {/* Profile */}
          <div
            onClick={() => { router.push('/profile'); closeMobile() }}
            className="sidebar-btn-bounce w-full py-3 flex flex-col items-center gap-1.5 cursor-pointer transition-colors hover:cursor-pointer hover:bg-[#3b529a]/50 group"
          >
            <button className="sidebar-icon-btn w-[38px] h-[38px] rounded-[2px] border-2 border-[#dba65d] flex items-center justify-center hover:rounded-full transition-all group-hover:bg-[#dba65d]">
              <User className="w-5 h-5 group-hover:text-white text-[#dba65d]" strokeWidth={2} />
            </button>
            <span className="text-[#dba65d] text-[10px] text-center px-0.5 font-bold tracking-wide leading-tight">Profile</span>
          </div>
        </div>

        <div className="flex flex-col items-center w-full gap-1">
          <DarkModeToggle />
        </div>
      </aside>

      {/* Notification modal */}
      {isNotifOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0" onClick={() => setIsNotifOpen(false)} />
          <div className="relative z-10 w-full sm:w-[95vw] md:w-[90vw] max-w-2xl max-h-[85vh] sm:max-h-[80vh] bg-white dark:bg-slate-800 rounded-[16px] sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <span className="text-lg font-semibold text-gray-700 dark:text-slate-200">Notifications</span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={async () => { await markAllNotificationsRead(); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); setUnreadCount(0) }} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsNotifOpen(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {notifications.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-slate-400 text-sm py-12">No notifications yet.</p>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-slate-700">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={async () => {
                        if (!n.read) {
                          await markNotificationRead(n.id)
                          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                          setUnreadCount(prev => Math.max(0, prev - 1))
                        }
                        setSelectedNotif({ ...n, read: true })
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${!n.read ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{n.title}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Notification detail modal */}
      {selectedNotif && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setSelectedNotif(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <span className="text-base font-bold text-gray-800 dark:text-slate-100">Notification Details</span>
              <button onClick={() => setSelectedNotif(null)} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${selectedNotif.read ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                  {selectedNotif.read ? 'Read' : 'New'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300">
                  {selectedNotif.type.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{selectedNotif.title}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{selectedNotif.message}</p>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-slate-500">
                {new Date(selectedNotif.createdAt).toLocaleString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              {(() => {
                const route = getNotificationRoute(selectedNotif, userRole)
                if (route) {
                  return (
                    <Link
                      href={route}
                      onClick={() => { setSelectedNotif(null); setIsNotifOpen(false) }}
                      className="px-4 py-2 text-sm font-semibold text-white bg-[#2f4383] hover:bg-[#243570] rounded-lg transition-colors"
                    >
                      Go to {selectedNotif.type.replace(/_/g, ' ')}
                    </Link>
                  )
                }
                return null
              })()}
              <button
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
