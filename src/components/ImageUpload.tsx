"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, X } from "lucide-react";

interface ImageUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

export default function ImageUpload({ files, onChange, maxFiles = 5 }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const remaining = maxFiles - files.length;
      if (remaining <= 0) return;
      onChange([...files, ...incoming.slice(0, remaining)]);
    },
    [files, onChange, maxFiles],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeFile = (idx: number) =>
    onChange(files.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          isDragOver ? "border-brand-blue bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        <Camera className="w-6 h-6 mx-auto text-gray-400 mb-1" />
        <p className="text-xs text-gray-500 font-medium">
          {files.length > 0
            ? `${files.length} file(s) selected`
            : "Tap or drag to add photos / videos"}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">Up to {maxFiles} files</p>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, idx) => (
            <div key={idx} className="relative group">
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border">
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-[10px] text-gray-500 text-center px-1 truncate w-full">
                    {file.name}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
