"use client";

import { useState, useEffect } from "react";
import { X, Mail, Loader } from "lucide-react";
import { getEmailVerificationStatus, sendVerificationEmail } from "@/actions/verify-email";

export default function EmailVerificationBanner() {
  const [status, setStatus] = useState<{ verified: boolean; email: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getEmailVerificationStatus().then(setStatus);
  }, []);

  if (!status || status.verified || dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Mail className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Verify your email:</span> Please check{" "}
            <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">{status.email}</span>{" "}
            for a verification link.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sent ? (
            <span className="text-xs text-green-700 font-medium">Sent!</span>
          ) : (
            <button
              onClick={async () => {
                setSending(true);
                try {
                  await sendVerificationEmail();
                  setSent(true);
                } catch {}
                setSending(false);
              }}
              disabled={sending}
              className="text-xs font-semibold px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {sending ? "Sending..." : "Resend"}
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg hover:bg-amber-100 text-amber-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
