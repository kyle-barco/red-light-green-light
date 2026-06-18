
"use client";

import { useState, useRef } from "react";
import Image from "next/image";

const CONTACT_EMAIL = "example@lumen.com";
const CONTACT_NUMBER = "09XXXXXXXXX";
const CONTACT_ADDRESS = "#67 Mundo ni Majinbu Street, Brgy. Lumen Hall";

const ISSUE_TYPES = [
  { value: "NO_POWER", label: "Light completely out" },
  { value: "FLICKERING", label: "Flickering / Unstable light" },
  { value: "DAMAGED_FIXTURE", label: "Broken pole / Structural damage" },
];

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  FAULTY: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
  UNDER_MAINTENANCE: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  DECOMMISSIONED: { bg: "bg-gray-100", text: "text-brand-cornflower-blue", dot: "bg-gray-400" },
};

function StreetlightIcon({ status }: { status: string }) {
  const fill =
    status === "ACTIVE" ? "#16a34a" :
      status === "FAULTY" ? "#ef4444" :
        status === "UNDER_MAINTENANCE" ? "#d97706" :
          "#9ca3af";

  return (
    <svg
      viewBox="0 0 64 64"
      className="w-10 h-10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Streetlight — ${status}`}
    >
      {/* Base line */}
      <line x1="10" y1="54" x2="54" y2="54" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      {/* Pole base box */}
      <rect x="28" y="46" width="8" height="8" fill="white" stroke="#1e293b" strokeWidth="2" />
      {/* Vertical pole */}
      <line x1="32" y1="46" x2="32" y2="18" stroke="#1e293b" strokeWidth="2" />
      {/* Arm curve */}
      <path d="M32 18 C 32 10, 42 10, 46 10 L48 10" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Lamp housing */}
      <path d="M44 10 L54 10 L52 16 L46 16 Z" fill="white" stroke="#1e293b" strokeWidth="2" strokeLinejoin="round" />
      {/* Status-coloured lamp glow */}
      <path d="M46 16 C 47 20, 51 20, 52 16" fill={fill} stroke="#1e293b" strokeWidth="2" />
    </svg>
  );
}

// ── Tab definition ──
type Tab = "overview" | "complaints" | "about";

// ── Props ──
export interface LocationDetailsProps {
  isOpen: boolean;
  title?: string;
  address?: string;
  status?: string;
  poleCode?: string;
  latitude?: number;
  longitude?: number;
  barangay?: string;
  nodeSpecs?: Record<string, string>;
}

export default function LocationDetails({
  isOpen,
  title,
  address,
  status = "ACTIVE",
  poleCode,
  latitude,
  longitude,
  barangay,
  nodeSpecs,
}: LocationDetailsProps) {

  // ── Active tab state ──
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // ── Complaint form state ──
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve badge colours
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE["ACTIVE"];

  // ── File drop handlers ──
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setMediaFiles((prev) => [...prev, ...dropped]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setMediaFiles((prev) => [...prev, ...picked]);
  };

  const removeFile = (idx: number) =>
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIssueType("");
      setDescription("");
      setMediaFiles([]);
    }, 3000);
  };

  // ── Tab button helper ──
  const TabButton = ({ id, label }: { id: Tab; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={[
        "flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200",
        activeTab === id
          ? "text-[#1E3A8A] border-b-2 border-[#1E3A8A]"
          : "text-brand-cornflower-blue font-instrument border-b-2 border-transparent hover:text-brand-blue hover:cursor-pointer",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <div
      className={[
        "absolute top-[150px] left-6 z-[500]",
        "w-[480px] bg-white rounded-t-3xl shadow-2xl",
        "flex flex-col overflow-hidden transition-transform duration-300 ease-out",
        isOpen ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
      style={{ height: "600px" }}
      onWheelCapture={(e) => e.stopPropagation()}
    >

      { }
      <div className="relative w-full h-36 flex-shrink-0 overflow-hidden">
        <Image
          src="/image.png"
          alt="Location banner"
          fill
          className="object-cover"
          priority
        />
        {/* Dark gradient so the status badge is always readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />

        {/* Status badge — top-right corner, over the hero image */}
        {status && (
          <span
            className={[
              "absolute top-3 right-3 flex items-center gap-1.5",
              "px-2.5 py-1 rounded-full text-[11px] font-bold",
              badge.bg, badge.text,
            ].join(" ")}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {status.replace("_", " ")}
          </span>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-gray-100 flex-shrink-0 px-4 bg-white">
        <TabButton id="overview" label="Overview" />
        <TabButton id="complaints" label="Complaints" />
        <TabButton id="about" label="About" />
      </div>

      {/* ── Scrollable tab content ── */}
      <div className="flex-1 overflow-y-auto font-instrument">

        {/* ━━━━━━━━━━━━━━━━━━━ OVERVIEW TAB ━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "overview" && (
          <div className="p-5 space-y-4">

            {/* Streetlight icon + identity */}
            <div className="flex items-start gap-4">
              {/* Status-aware streetlight icon */}
              <div className="flex-shrink-0 mt-0.5">
                <StreetlightIcon status={status} />
              </div>

              <div className="min-w-0">
                {/* Name: prefer the pole code, fall back to the title prop */}
                <h2 className="text-base font-bold text-brand-blue truncate">
                  {poleCode ?? title ?? "Unknown Streetlight"}
                </h2>

                {/* Street / location name */}
                {title && poleCode && (
                  <p className="text-sm font-medium text-[#1E3A8A] truncate mt-0.5">
                    {title}
                  </p>
                )}

                {/* Address */}
                {address && (
                  <p className="text-xs text-brand-cornflower-blue mt-1 leading-snug">
                    {address}
                    {barangay ? `, ${barangay}` : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-100" />

            {/* Quick-fact chips */}
            <div className="grid grid-cols-2 gap-3">
              {poleCode && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-950 uppercase tracking-wider">Pole Code</p>
                  <p className="text-sm font-semibold text-brand-blue mt-1 font-mono">{poleCode}</p>
                </div>
              )}
              {barangay && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-950 uppercase tracking-wider">Barangay</p>
                  <p className="text-sm font-semibold text-brand-blue mt-1">{barangay}</p>
                </div>
              )}
              {status && (
                <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                  <p className="text-[10px] font-bold text-gray-950 uppercase tracking-wider">Status</p>
                  <span
                    className={[
                      "inline-flex items-center gap-1.5 mt-1",
                      "px-2.5 py-1 rounded-full text-[11px] font-bold",
                      badge.bg, badge.text,
                    ].join(" ")}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {status.replace("_", " ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━ COMPLAINTS TAB ━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "complaints" && (
          <div className="p-5">

            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                  {/* Checkmark icon */}
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-brand-blue">Report submitted!</p>
                <p className="text-xs text-brand-cornflower-blue">Thank you for helping keep the streets lit.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-brand-blue">Report an Issue</h3>
                  <p className="text-xs text-gray-950 mt-0.5">
                    Help our team respond faster by describing the problem.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-blue mb-1.5 uppercase tracking-wider">
                    Issue Classification <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className={[
                      "w-full px-3 py-2.5 rounded-xl text-sm border",
                      "focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30",
                      "transition-colors",
                      issueType ? "text-brand-blue bg-white border-[#1E3A8A]" : "text-gray-500 bg-gray-50 border-gray-200",
                    ].join(" ")}
                  >
                    <option value="" disabled>Select issue type…</option>
                    {ISSUE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-blue mb-1.5 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the problem context…"
                    className={[
                      "w-full px-3 py-2.5 rounded-xl text-sm border resize-none",
                      "focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30",
                      "placeholder:text-gray-500 bg-gray-50 border-gray-200",
                      "transition-colors",
                    ].join(" ")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-blue mb-1.5 uppercase tracking-wider">
                    Upload Media
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    className={[
                      "w-full rounded-xl border-2 border-dashed cursor-pointer",
                      "flex flex-col items-center justify-center py-5 gap-2",
                      "transition-colors duration-200",
                      isDragOver
                        ? "border-[#1E3A8A] bg-blue-50"
                        : "border-gray-200 bg-gray-50 hover:border-[#1E3A8A]/50 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    <svg className="w-7 h-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-xs text-gray-500 font-medium text-center px-4">
                      Click or drag photo / video evidence
                    </p>
                    <p className="text-[10px] text-gray-300">JPG, PNG, MP4 accepted</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                  />
                  {mediaFiles.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {mediaFiles.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-700"
                        >
                          <span className="truncate max-w-[80%]">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="text-brand-cornflower-blue hover:text-red-500 transition-colors ml-2"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="submit"
                  className={[
                    "w-full py-2.5 rounded-xl text-sm font-bold font-instrument text-white",
                    "bg-[#1E3A8A] hover:bg-[#4169E1] active:scale-[0.98]",
                    "transition-all duration-200",
                  ].join(" ")}
                >
                  Submit Report
                </button>
              </form>
            )}
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━ ABOUT TAB ━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "about" && (
          <div className="p-5 space-y-4">

            {/* Coordinates */}
            <div>
              <h3 className="text-xs font-bold text-brand-blue uppercase tracking-wider mb-2">
                Coordinates
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">Latitude</p>
                  <p className="text-sm font-mono font-semibold text-brand-cornflower-blue mt-1">
                    {latitude != null ? latitude.toFixed(6) : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">Longitude</p>
                  <p className="text-sm font-mono font-semibold text-brand-cornflower-blue mt-1">
                    {longitude != null ? longitude.toFixed(6) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Node / hardware specs — shown only when the parent passes them in */}
            {nodeSpecs && Object.keys(nodeSpecs).length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-brand-cornflower-blue uppercase tracking-wider mb-2">
                  Node Specifications
                </h3>
                <div className="space-y-2">
                  {Object.entries(nodeSpecs).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className="text-xs text-brand-cornflower-blue capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-xs font-semibold text-brand-blue">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-gray-100" />

            {/* Contact / contribute section */}
            <div>
              <p className="text-xs font-medium text-gray-600 leading-relaxed">
                Want to contribute for this street?{" "}
                <span className="font-bold text-[#1E3A8A]">Contact us.</span>
              </p>

              {/* Contact detail rows */}
              <div className="mt-3 space-y-2">
                {/* Email */}
                <div className="flex items-center gap-2.5">
                  {/* Envelope icon */}
                  <svg className="w-4 h-4 text-[#1E3A8A] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-xs text-[#1E3A8A] font-medium hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-2.5">
                  {/* Phone icon */}
                  <svg className="w-4 h-4 text-[#1E3A8A] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                  <span className="text-xs text-gray-700 font-medium">{CONTACT_NUMBER}</span>
                </div>

                {/* Address */}
                <div className="flex items-start gap-2.5">
                  {/* Map-pin icon */}
                  <svg className="w-4 h-4 text-[#1E3A8A] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  <span className="text-xs text-gray-700 font-medium leading-snug">{CONTACT_ADDRESS}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}