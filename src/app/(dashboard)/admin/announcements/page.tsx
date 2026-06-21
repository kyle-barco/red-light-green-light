"use client"

import { useState } from "react"
import { broadcastNotification } from "@/actions/admin"
import { Send, Loader2, CheckCircle, Megaphone } from "lucide-react"

export default function AdminAnnouncementsPage() {
  const [target, setTarget] = useState<"ALL" | "TECHNICIANS" | "USERS">("ALL")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setSending(true)
    setError("")
    try {
      await broadcastNotification(target, title.trim(), message.trim())
      setSent(true)
      setTitle("")
      setMessage("")
      setTarget("ALL")
      setTimeout(() => setSent(false), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to send")
    } finally {
      setSending(false)
    }
  }

  const targetLabels = {
    ALL: "All Users & Technicians",
    TECHNICIANS: "Technicians Only",
    USERS: "Regular Users Only",
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Broadcast Announcement</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send a system notification to all users, technicians, or everyone.</p>
      </div>

      {sent && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-3 rounded-xl">
          <CheckCircle className="w-4 h-4" />
          Announcement sent successfully!
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Target Audience
          </label>
          <div className="flex gap-2">
            {(["ALL", "TECHNICIANS", "USERS"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTarget(t)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  target === t
                    ? "bg-brand-blue text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {targetLabels[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. System Maintenance Tomorrow"
            required
            className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Message
          </label>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your announcement message..."
            required
            className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={sending || !title.trim() || !message.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-brand-blue hover:bg-brand-royal-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {sending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          ) : (
            <><Megaphone className="w-4 h-4" /> Broadcast Announcement</>
          )}
        </button>
      </form>
    </div>
  )
}
