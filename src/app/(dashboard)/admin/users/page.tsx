"use client"

import { useState, useEffect } from "react"
import { Role } from "@/lib/generated/prisma/client"
import { updateUserRole, toggleUserActive, getAdminUsers } from "@/actions/admin"
import { Search, UserX, UserCheck, CheckCircle, XCircle } from "lucide-react"

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: Role
  city: string
  barangay: string
  isActive: boolean
  createdAt: Date
}

const roleBadge: Record<string, string> = {
  SUPERADMIN: "bg-purple-50 text-purple-700",
  ADMIN: "bg-blue-50 text-blue-700",
  TECHNICIAN: "bg-amber-50 text-amber-700",
  USER: "bg-gray-50 text-gray-600",
  GUEST: "bg-gray-100 text-gray-400",
}

const ROLE_OPTIONS = [
  Role.USER,
  Role.TECHNICIAN,
  Role.ADMIN,
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    getAdminUsers().then(setUsers).catch(() => {})
  }, [])

  const filtered = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.barangay.toLowerCase().includes(q)
    )
  })

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole as Role } : u)))
      setMsg({ type: "success", text: "Role updated successfully" })
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to update role" })
    }
    setTimeout(() => setMsg(null), 3000)
  }

  const handleToggleActive = async (userId: string, current: boolean) => {
    try {
      await toggleUserActive(userId, !current)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: !current } : u)))
      setMsg({ type: "success", text: current ? "User deactivated" : "User activated" })
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to update user" })
    }
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage users — change roles, activate or deactivate accounts.</p>
      </div>

      {msg && (
        <div
          className={`flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-xl ${
            msg.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {msg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none"
        >
          <option value="ALL">All Roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} user(s)</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Barangay</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((user) => (
              <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${!user.isActive ? "opacity-60" : ""}`}>
                <td className="px-4 py-3 text-gray-700 font-medium">
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3 text-gray-500">{user.phone}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={user.role === Role.SUPERADMIN}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-brand-blue/30 ${
                      roleBadge[user.role]
                    } ${user.role === Role.SUPERADMIN ? "cursor-not-allowed" : ""}`}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500">{user.barangay}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(user.id, user.isActive)}
                    disabled={user.role === Role.SUPERADMIN}
                    className={`p-1.5 rounded-lg transition-colors ${
                      user.isActive
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-green-50 text-green-600 hover:bg-green-100"
                    } ${user.role === Role.SUPERADMIN ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                    title={user.isActive ? "Deactivate" : "Activate"}
                  >
                    {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
