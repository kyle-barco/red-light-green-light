"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, AlertTriangle, Camera, Send, Loader2, CheckCircle, ArrowLeft, Navigation } from "lucide-react";
import { createAnonymousFaultReport, createUserFaultReport } from "@/actions/community";
import ImageUpload from "@/components/ImageUpload";

const LeafletMap = dynamic(() => import("./MapSelector"), { ssr: false });

const FAULT_TYPES = [
  { value: "NO_POWER", label: "Light completely out" },
  { value: "FLICKERING", label: "Flickering / Unstable light" },
  { value: "DAMAGED_FIXTURE", label: "Broken pole / Structural damage" },
  { value: "VANDALISM", label: "Vandalism" },
  { value: "OTHER", label: "Other" },
] as const;

interface Pole {
  id: string;
  poleCode: string;
  latitude: number;
  longitude: number;
  status: string;
  address: string;
  barangay: string;
}

function ReportPageInner() {
  const searchParams = useSearchParams();
  const [selectedPole, setSelectedPole] = useState<Pole | null>(null);
  const [faultType, setFaultType] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [sessionUser, setSessionUser] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [gpsLocation, setGpsLocation] = useState<[number, number] | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        setGpsLocation([lat, lng]);
      }
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.id) {
          setSessionUser({ id: data.user.id, name: data.user.name ?? "User" });
          setIsAnonymous(false);
        }
      })
      .catch(() => {});
  }, [searchParams]);

  const handlePoleSelect = (pole: Pole) => setSelectedPole(pole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPole || !faultType || !description.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      let imageUrls: string[] = [];

      if (mediaFiles.length > 0) {
        try {
          const { uploadFiles } = await import("@/lib/supabase");
          imageUrls = await uploadFiles(mediaFiles, "files", "fault-reports");
        } catch (err) {
          setError("Failed to upload images. Please try again.");
          setSubmitting(false);
          return;
        }
      }

      if (isAnonymous || !sessionUser) {
        await createAnonymousFaultReport({
          poleId: selectedPole.id,
          description: description.trim(),
          faultType: faultType as any,
          reporterName: reporterName.trim() || undefined,
          reporterEmail: reporterEmail.trim() || undefined,
          reporterPhone: reporterPhone.trim() || undefined,
          latitude: gpsLocation?.[0],
          longitude: gpsLocation?.[1],
          imageUrls,
        });
      } else {
        await createUserFaultReport({
          poleId: selectedPole.id,
          description: description.trim(),
          faultType: faultType as any,
          latitude: gpsLocation?.[0],
          longitude: gpsLocation?.[1],
          imageUrls,
        });
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">Report Submitted!</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            Thank you for reporting. Our team will look into it promptly.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => { setSubmitted(false); setSelectedPole(null); setFaultType(""); setDescription(""); setMediaFiles([]); }} className="px-6 py-2.5 bg-brand-blue text-white rounded-xl text-sm font-medium hover:bg-brand-royal-blue transition-colors cursor-pointer">
              Report Another
            </button>
            <Link href="/" className="px-6 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors inline-flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Map
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-4 sm:px-6 py-4 flex items-center gap-3">
        <Link href="/" className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-slate-100">Report a Fault</h1>
          <p className="text-xs text-gray-400 dark:text-slate-400">Help us keep the lights on — report a streetlight issue</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Map: select a pole */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-blue" />
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              {selectedPole ? `Selected: ${selectedPole.poleCode}` : "Click a pole on the map to select it"}
            </span>
          </div>
          <div className="h-[300px] sm:h-[400px] relative">
            <LeafletMap poles={[]} selectedPole={selectedPole} onSelect={handlePoleSelect} gpsLocation={gpsLocation} />
          </div>
          {selectedPole && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-900/30 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <CheckCircle className="w-4 h-4" />
              {selectedPole.poleCode} — {selectedPole.address}
            </div>
          )}
        </div>

        {gpsLocation && (
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-400">
            <Navigation className="w-3 h-3" />
            Using your location to pin the report
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fault type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
              Issue Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={faultType}
              onChange={(e) => setFaultType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            >
              <option value="">Select issue type…</option>
              {FAULT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
              Photo Evidence
            </label>
            <ImageUpload files={mediaFiles} onChange={setMediaFiles} maxFiles={5} />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail…"
            className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
          />
        </div>

        {/* Reporter info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={() => setIsAnonymous(!isAnonymous)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Submit anonymously</span>
          </label>

          {isAnonymous ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={reporterPhone}
                onChange={(e) => setReporterPhone(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-slate-400">
              Logged in as {sessionUser?.name ?? "User"} — report will be linked to your account.
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !selectedPole || !faultType || !description.trim()}
          className="w-full py-3 bg-brand-blue text-white rounded-xl text-sm font-bold hover:bg-brand-royal-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
          ) : (
            <><Send className="w-4 h-4" /> Submit Report</>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <ReportPageInner />
    </Suspense>
  );
}
