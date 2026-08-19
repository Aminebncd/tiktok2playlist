"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ArchiveDropzone } from "@/components/ArchiveDropzone";
import { parseTikTokArchive } from "@/lib/tiktok/parseArchive";
import type { TikTokFavoriteSound, TrackMatch } from "@/types";

type Step = "import" | "sounds" | "results" | "success";
type Success = { name: string; added: number; total: number; url: string; partial: boolean; warning?: string };
const STORAGE = "soundsift-sounds";

export default function Home() {
  const [step, setStep] = useState<Step>("import");
  const [sounds, setSounds] = useState<TikTokFavoriteSound[]>([]);
  const [matches, setMatches] = useState<TrackMatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [playlistName, setPlaylistName] = useState("TikTok Saved Sounds");
  const [success, setSuccess] = useState<Success>();

  const matchSounds = useCallback(async (items: TikTokFavoriteSound[]) => {
    setBusy(true); setError(undefined);
    try {
      const response = await fetch("/api/spotify/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sounds: items }) });
      const data = await response.json() as { matches?: TrackMatch[]; error?: string };
      if (!response.ok || !data.matches) throw new Error(data.error ?? "Could not search Spotify.");
      setMatches(data.matches); setStep("results");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not search Spotify."); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => {
    async function restoreSpotifyReturn() {
    const status = new URLSearchParams(window.location.search).get("spotify");
    if (!status) return;
    await Promise.resolve();
    window.history.replaceState({}, "", "/");
    if (status === "connected") {
      try { const stored = JSON.parse(sessionStorage.getItem(STORAGE) ?? "[]") as TikTokFavoriteSound[]; if (stored.length) { setSounds(stored); setStep("sounds"); void matchSounds(stored); } }
      catch { setError("Your imported sounds could not be restored. Please choose the archive again."); }
    } else setError(status === "denied" ? "Spotify connection was cancelled. You can try again when ready." : status === "configuration_error" ? "Spotify is not configured on this server." : "Spotify could not be connected. Please try again.");
    }
    void restoreSpotifyReturn();
  }, [matchSounds]);

  async function importFile(file: File) {
    setBusy(true); setError(undefined);
    try {
      if (!file.name.toLowerCase().endsWith(".zip")) throw new Error("Choose the .zip file downloaded from TikTok.");
      const parsed = await parseTikTokArchive(file);
      setSounds(parsed); sessionStorage.setItem(STORAGE, JSON.stringify(parsed)); setStep("sounds");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The archive could not be read."); }
    finally { setBusy(false); }
  }

  async function createPlaylist() {
    const uris = matches.filter((match) => match.selected && match.track).map((match) => match.track!.uri);
    if (!uris.length) return setError("Select at least one matched track.");
    setBusy(true); setError(undefined);
    try {
      const response = await fetch("/api/spotify/playlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: playlistName, uris }) });
      const data = await response.json() as Success & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not create the playlist.");
      setSuccess(data); setStep("success"); sessionStorage.removeItem(STORAGE);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the playlist."); }
    finally { setBusy(false); }
  }

  const matched = matches.filter((match) => match.status === "matched").length;
  const selected = matches.filter((match) => match.selected).length;

  return <main className="min-h-screen overflow-hidden">
    <div className="pointer-events-none fixed left-1/2 top-[-35rem] h-[52rem] w-[52rem] -translate-x-1/2 rounded-full bg-[#ff245e]/10 blur-[120px]" />
    <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-7 sm:px-8">
      <button onClick={() => { setStep("import"); setError(undefined); }} className="flex items-center gap-3 text-lg font-bold tracking-tight"><span className="grid size-8 place-items-center rounded-xl bg-[#ff315f] text-sm shadow-[5px_5px_0_#25f4ee]">♫</span> Soundsift</button>
      <span className="flex items-center gap-2 text-xs text-white/45"><span className="size-1.5 rounded-full bg-emerald-400" />Private by design</span>
    </nav>

    <section className="relative mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
      {step === "import" && <>
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55"><span className="text-[#ff446e]">♪</span> TikTok saved sounds <span className="text-white/20">→</span> <span className="text-[#25d865]">●</span> Spotify</div>
          <h1 className="text-5xl font-bold leading-[1.03] tracking-[-.055em] sm:text-7xl">Your saved sounds,<br/><span className="bg-gradient-to-r from-[#ff315f] via-[#ff6586] to-[#f29b6e] bg-clip-text text-transparent">finally in a playlist.</span></h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/50 sm:text-lg">Import your TikTok data archive. We’ll find your favorite sounds on Spotify and let you choose what makes the cut.</p>
        </div>
        <ArchiveDropzone onFile={importFile} busy={busy} />
        <div className="mt-6 flex items-start justify-center gap-3 text-sm text-white/45"><span className="mt-0.5 text-emerald-400">◆</span><p><strong className="font-medium text-white/75">Your archive stays on your device.</strong><br/><span className="text-xs">It’s opened only in this browser and is never uploaded.</span></p></div>
      </>}

      {step === "sounds" && <Panel title={`${sounds.length} saved sound${sounds.length === 1 ? "" : "s"} found`} subtitle="Your archive was read locally. Connect Spotify to find likely tracks.">
        <div className="max-h-96 divide-y divide-white/5 overflow-auto rounded-2xl border border-white/10 bg-white/[.02]">{sounds.map((sound) => <div key={sound.id} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="truncate font-medium">{sound.displayName ?? "TikTok sound"}</p><p className="mt-1 truncate text-xs text-white/35">{sound.date ?? sound.soundUrl}</p></div><span className="text-[#ff496f]">♪</span></div>)}</div>
        <a href="/api/spotify/login" className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-[#1ed760] px-5 py-3.5 font-bold text-black transition hover:bg-[#3be477]">Connect Spotify <span>→</span></a>
      </Panel>}

      {step === "results" && <Panel title="Review your matches" subtitle="Spotify’s best guess is shown for every sound. Uncheck anything that doesn’t look right.">
        <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-center"><Stat value={sounds.length} label="Saved sounds"/><Stat value={matched} label="Matched"/><Stat value={sounds.length - matched} label="Unmatched"/></div>
        <div className="space-y-2">{matches.map((match, index) => <label key={match.sound.id} className={`flex items-center gap-4 rounded-2xl border p-3.5 transition ${match.track ? "border-white/10 bg-white/[.025] hover:border-white/20" : "border-white/5 bg-white/[.012] opacity-60"}`}>
          <input type="checkbox" checked={match.selected} disabled={!match.track} onChange={() => setMatches((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, selected: !item.selected } : item))} className="size-4 accent-[#ff315f]" />
          {match.track?.imageUrl ? <Image src={match.track.imageUrl} alt="" width={48} height={48} className="size-12 rounded-lg object-cover"/> : <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/5 text-white/25">?</span>}
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{match.track?.title ?? "No Spotify match found"}</p><p className="truncate text-sm text-white/45">{match.track?.artists ?? match.sound.displayName ?? match.sound.soundUrl}</p></div>
          <span className={`hidden rounded-full px-2 py-1 text-[10px] sm:block ${match.track ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-white/35"}`}>{match.track ? "MATCHED" : "UNMATCHED"}</span>
        </label>)}</div>
        <div className="sticky bottom-4 mt-7 rounded-2xl border border-white/10 bg-[#141519]/95 p-4 shadow-2xl backdrop-blur sm:flex sm:items-end sm:gap-4"><label className="block flex-1 text-xs font-medium text-white/55">Playlist name<input value={playlistName} maxLength={100} onChange={(event) => setPlaylistName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#ff315f]"/></label><button disabled={busy || !selected || !playlistName.trim()} onClick={createPlaylist} className="mt-3 w-full rounded-xl bg-white px-5 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-40 sm:mt-0 sm:w-auto">{busy ? "Creating…" : `Create with ${selected} track${selected === 1 ? "" : "s"}`}</button></div>
      </Panel>}

      {step === "success" && success && <Panel title={success.partial ? "Playlist created with a warning" : "Your playlist is ready!"} subtitle={success.warning ?? `${success.added} tracks are waiting for you on Spotify.`}>
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[.04] p-8 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-400 text-3xl text-black">✓</span><h2 className="mt-5 text-2xl font-bold">{success.name}</h2><p className="mt-2 text-white/45">{success.added} of {success.total} tracks added</p><a href={success.url} target="_blank" rel="noreferrer" className="mt-7 inline-flex rounded-full bg-[#1ed760] px-6 py-3 font-bold text-black">Open in Spotify ↗</a></div>
      </Panel>}
      {error && <div role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-center text-sm text-red-200">{error}</div>}
    </section>
    <footer className="border-t border-white/5 px-5 py-7 text-center text-xs text-white/25">Built for your music, not your data. · Not affiliated with TikTok or Spotify.</footer>
  </main>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <div><div className="mb-8 text-center"><h1 className="text-4xl font-bold tracking-tight">{title}</h1><p className="mx-auto mt-3 max-w-xl text-white/45">{subtitle}</p></div>{children}</div>; }
function Stat({ value, label }: { value: number; label: string }) { return <div><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-white/35">{label}</p></div>; }
