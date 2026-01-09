import React, { useCallback, useState } from 'react';
import { cn } from '../lib/utils';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect, disabled]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "border-4 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer",
        isDragging ? "border-blue-600 bg-blue-50 scale-105" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50",
        disabled && "opacity-50 cursor-not-allowed hover:border-slate-300 hover:bg-transparent"
      )}
      onClick={() => !disabled && document.getElementById('file-upload')?.click()}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileInput}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-4">
        <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <div className="text-xl font-semibold text-slate-700">
          Drag & Drop Evidence File
        </div>
        <p className="text-slate-500">
          PDF, JPEG, or PNG (Max 50MB)
        </p>
      </div>
    </div>
  );
};
