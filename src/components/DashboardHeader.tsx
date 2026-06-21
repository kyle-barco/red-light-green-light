"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Role } from "@/lib/generated/prisma/client";
import { signOut } from "next-auth/react";
import Logo from "@/components/Logo";
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import { X } from "lucide-react";

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

export default function DashboardHeader({ userRole, userName }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null)

  useEffect(() => {
    const fetchCount = () => getUnreadCount().then(setUnreadCount).catch(() => {})
    fetchCount()
    const interval = setInterval(fetchCount, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleToggleNotif = useCallback(async () => {
    if (isNotifOpen) {
      setIsNotifOpen(false)
      return
    }
    const [notifs, count] = await Promise.all([
      getNotifications(),
      getUnreadCount(),
    ])
    setNotifications(notifs)
    setUnreadCount(count)
    setIsNotifOpen(true)
  }, [isNotifOpen])

  return (
    <header className="bg-brand-blue/90 backdrop-blur-[0.5px] border-b border-[#2f4383]/50 flex justify-between items-center px-2 sm:px-6 h-14 sm:h-16 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Logo className="w-auto h-[28px] sm:h-[36px]" />
        <div className="hidden sm:flex flex-col">
          <h1
            className="text-[20px] sm:text-[28px] font-koulen text-white leading-tight select-none"
            style={{
              textShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
              WebkitTextStrokeWidth: "1px",
              WebkitTextStrokeColor: "#1E3A8A",
            }}
          >
            il<span className="text-[#F4D35E]">lumen</span>ate
          </h1>
        </div>
        <div className="hidden lg:flex items-center gap-1 ml-2">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          <span className="text-[10px] text-amber-300 font-bold tracking-wider uppercase">Quezon City</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification bell */}
        <button
          onClick={handleToggleNotif}
          className="relative p-2 rounded-lg hover:bg-[#3b529a]/50 transition-colors"
        >
          <svg className="w-5 h-5 text-[#dba65d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User info */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#dba65d] flex items-center justify-center text-white text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate max-w-[100px]">{userName}</p>
            <p className="text-[9px] text-amber-300 font-bold uppercase">{userRole}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut()}
          className="p-2 rounded-lg hover:bg-[#3b529a]/50 transition-colors"
          title="Logout"
        >
          <svg className="w-4 h-4 text-[#dba65d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

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
    </header>
  )
}
