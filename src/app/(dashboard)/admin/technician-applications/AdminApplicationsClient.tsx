"use client";

import { useState } from "react";
import { verifyTechnicianApplication, rejectTechnicianApplication } from "@/actions/technician-applications";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

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

export default function AdminApplicationsClient({ applications }: { applications: Application[] }) {
  const [apps, setApps] = useState(applications);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleVerify(id: string) {
    setProcessing(id);
    try {
      await verifyTechnicianApplication(id);
      setApps((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "VERIFIED" }
            : a
        )
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) return;
    setProcessing(id);
    try {
      await rejectTechnicianApplication(id, rejectReason.trim());
      setApps((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "REJECTED", rejectedReason: rejectReason.trim() }
            : a
        )
      );
      setRejectModal(null);
      setRejectReason("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  }

  const pending = apps.filter((a) => a.status === "PENDING");
  const history = apps.filter((a) => a.status !== "PENDING");

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Technician Applications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and verify technician applications from users.</p>
      </div>

      {/* Pending Applications */}
      <section>
        <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          Pending Review
          {pending.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No pending applications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((app) => (
              <div key={app.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {app.applicant.firstName} {app.applicant.lastName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {app.applicant.email} &middot; {app.applicant.phone} &middot; {app.applicant.barangay}, {app.applicant.city}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-xs font-medium text-gray-600">Skills:</span>
                        <p className="text-gray-700">{app.skills}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-600">Reason:</span>
                        <p className="text-gray-700">{app.reason}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleVerify(app.id)}
                      disabled={processing === app.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      {processing === app.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      Verify
                    </button>
                    <button
                      onClick={() => setRejectModal(app.id)}
                      disabled={processing === app.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Application History */}
      {history.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-800 mb-3">History</h2>
          <div className="space-y-3">
            {history.map((app) => (
              <div key={app.id} className="bg-white rounded-xl border border-gray-100 p-5 opacity-70">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {app.applicant.firstName} {app.applicant.lastName}
                      </span>
                      {app.status === "VERIFIED" && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Verified</span>
                      )}
                      {app.status === "REJECTED" && (
                        <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">Rejected</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {app.applicant.email} &middot; {app.applicant.barangay}, {app.applicant.city}
                    </p>
                    {app.status === "VERIFIED" && app.verifiedBy && (
                      <p className="text-xs text-green-600 mt-1">
                        Verified by {app.verifiedBy.firstName} {app.verifiedBy.lastName}
                        {app.verifiedAt && ` on ${new Date(app.verifiedAt).toLocaleDateString()}`}
                      </p>
                    )}
                    {app.status === "REJECTED" && (
                      <p className="text-xs text-red-600 mt-1">
                        Rejected{app.rejectedBy ? ` by ${app.rejectedBy.firstName} ${app.rejectedBy.lastName}` : ""}
                        {app.rejectedAt && ` on ${new Date(app.rejectedAt).toLocaleDateString()}`}
                        {app.rejectedReason && ` — ${app.rejectedReason}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Reject Application</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="text-xs font-medium text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectModal)}
                disabled={!rejectReason.trim() || processing === rejectModal}
                className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
              >
                {processing === rejectModal ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
