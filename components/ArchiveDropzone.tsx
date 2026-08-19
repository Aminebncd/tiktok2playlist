"use client";

import { useRef, useState } from "react";

export function ArchiveDropzone({ onFile, busy }: { onFile: (file: File) => void; busy: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return <div
    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
    onDragLeave={() => setDragging(false)}
    onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) onFile(file); }}
    className={`group rounded-[28px] border border-dashed p-3 transition ${dragging ? "border-[#ff3b6b] bg-[#ff3b6b]/5" : "border-white/20 bg-white/[0.025] hover:border-white/35"}`}
  >
    <button type="button" disabled={busy} onClick={() => input.current?.click()} className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl px-6 text-center transition hover:bg-white/[0.025] disabled:cursor-wait">
      <span className="mb-6 grid size-14 place-items-center rounded-2xl bg-white text-2xl text-black shadow-[0_0_40px_rgba(255,255,255,.08)]">↥</span>
      <span className="text-xl font-semibold">{busy ? "Reading your archive…" : "Drop your TikTok archive here"}</span>
      <span className="mt-2 text-sm text-white/45">or click to choose a .zip file</span>
      <span className="mt-7 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/45">ZIP · processed locally</span>
    </button>
    <input ref={input} type="file" accept=".zip,application/zip" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); event.target.value = ""; }} />
  </div>;
}
