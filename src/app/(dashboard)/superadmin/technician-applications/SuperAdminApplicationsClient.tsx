"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Clock, Search } from "lucide-react";

interface Application {
  id: string;
  skills: string;
  reason: string;
  status: string;
  createdAt: Date;
  verifiedAt: Date | null;
  rejectedAt: Date | null;
  rejectedReason: string | null;
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    barangay: string;
    city: string;
  };
  verifiedBy: { firstName: string; lastName: string } | null;
  rejectedBy: { firstName: string; lastName: string } | null;
}

export default function SuperAdminApplicationsClient({ applications }: { applications: Application[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("ALL");

  const filtered = applications.filter((app) => {
    if (filter !== "ALL" && app.status !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${app.applicant.firstName} ${app.applicant.lastName}`.toLowerCase();
    const email = app.applicant.email.toLowerCase();
    const barangay = app.applicant.barangay.toLowerCase();
    return name.includes(q) || email.includes(q) || barangay.includes(q);
  });

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Technician Applications</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          View all technician applications and see which admin verified each applicant.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicants..."
            className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-1.5">
          {["ALL", "PENDING", "VERIFIED", "REJECTED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 font-medium">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{applications.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 font-medium">Verified</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {applications.filter((a) => a.status === "VERIFIED").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 font-medium">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {applications.filter((a) => a.status === "PENDING").length}
          </p>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No applications found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div key={app.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {app.applicant.firstName} {app.applicant.lastName}
                    </span>
                    {app.status === "PENDING" && <Clock className="w-4 h-4 text-amber-500" />}
                    {app.status === "VERIFIED" && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {app.status === "REJECTED" && <XCircle className="w-4 h-4 text-red-500" />}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      app.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                      app.status === "VERIFIED" ? "bg-green-50 text-green-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {app.applicant.email} &middot; {app.applicant.barangay}, {app.applicant.city}
                  </p>
                  <div className="text-xs text-gray-700 mb-2">
                    <span className="font-medium text-gray-600">Skills:</span> {app.skills}
                  </div>
                  <div className="text-xs text-gray-700 mb-2">
                    <span className="font-medium text-gray-600">Reason:</span> {app.reason}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-50">
                    <span>Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                    {app.status === "VERIFIED" && app.verifiedBy && (
                      <span className="ml-4 text-green-600">
                        Verified by {app.verifiedBy.firstName} {app.verifiedBy.lastName}
                        {app.verifiedAt && ` on ${new Date(app.verifiedAt).toLocaleDateString()}`}
                      </span>
                    )}
                    {app.status === "REJECTED" && app.rejectedBy && (
                      <span className="ml-4 text-red-600">
                        Rejected by {app.rejectedBy.firstName} {app.rejectedBy.lastName}
                        {app.rejectedAt && ` on ${new Date(app.rejectedAt).toLocaleDateString()}`}
                        {app.rejectedReason && ` — ${app.rejectedReason}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
