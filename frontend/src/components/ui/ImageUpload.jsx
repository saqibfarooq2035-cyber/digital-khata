import { useEffect, useRef, useState } from 'react';
import { notifyError } from '../../utils/notify';

const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageUpload({ onImageSelect, label = 'Upload Receipt', maxSizeMB = 5 }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function validateAndSet(selected) {
    if (!selected) return;

    if (!VALID_TYPES.includes(selected.type)) {
      notifyError('Only JPG, PNG, or PDF files are allowed');
      return;
    }

    if (selected.size > maxSizeMB * 1024 * 1024) {
      notifyError(`File must be smaller than ${maxSizeMB}MB`);
      return;
    }

    setFile(selected);
    onImageSelect?.(selected);
  }

  function handleRemove() {
    setFile(null);
    onImageSelect?.(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    validateAndSet(event.dataTransfer.files?.[0]);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        {previewUrl ? (
          <img src={previewUrl} alt="Receipt preview" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">📄</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500"
        >
          ✕ Remove
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${dragActive ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 bg-slate-50'}`}
    >
      <p className="text-2xl">📷</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">Drag &amp; drop or click here</p>
      <p className="mt-0.5 text-xs text-slate-400">JPG, PNG, PDF — Max {maxSizeMB}MB</p>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={(e) => validateAndSet(e.target.files?.[0])}
        className="hidden"
      />
    </div>
  );
}
