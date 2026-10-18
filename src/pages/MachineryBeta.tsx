import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Camera, Check, Loader2, MapPin, Mic, Upload, X } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import { getFunctionErrorMessage } from '@/lib/functionErrors';
import {
  checkEvidence, parseMachineSpeech, readExifGps, writeExifGps, FUELS, FUEL_LABELS, MAX_ACCURACY_M, MAX_FIX_AGE_MS, MAX_PHOTO_BYTES, POWER_UNITS, PROBLEM_TEXT,
  type LiveFix, type MachineFields, type PhotoTags,
} from '../../supabase/functions/_shared/machineryBeta';

type Photo = { bytes: Uint8Array; url: string; tags: PhotoTags | null; source: 'photo_exif' | 'app_capture' };
type Entry = { id: string; machine_type: string; make_model: string; rated_power: number | null; power_unit: string | null; fuel: string | null; hours_per_day: number | null; distance_m: number; status: string; created_at: string };

const EMPTY: MachineFields = { machineType: '', makeModel: '', ratedPower: null, powerUnit: null, fuel: null, hoursPerDay: null };
const tzOffsetMin = () => -new Date().getTimezoneOffset();
const toB64 = (bytes: Uint8Array) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const field = 'w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm';

/** Re-encodes a large photo to fit the limit, keeping its original geo tag. */
async function shrink(bytes: Uint8Array, tags: PhotoTags): Promise<Uint8Array> {
  const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.85));
  return writeExifGps(new Uint8Array(await blob.arrayBuffer()), { lat: tags.lat, lng: tags.lng, at: new Date(tags.takenAt ?? Date.now()) });
}

function Step({ n, icon: Icon, label, done, children }: { n: number; icon: typeof MapPin; label: string; done: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex min-w-0 items-start gap-3 rounded-2xl border p-4 transition-colors ${done ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} aria-hidden>
        {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium"><span className="sr-only">Step {n}: </span>{label}</p>
        <div className="mt-2 min-w-0">{children}</div>
      </div>
    </li>
  );
}

export default function MachineryBeta() {
  const [live, setLive] = useState<LiveFix | null>(null);
  const [geoError, setGeoError] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [camera, setCamera] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [fields, setFields] = useState<MachineFields>(EMPTY);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [closed, setClosed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const watchId = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const speechSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 5000); return () => clearInterval(t); }, []);

  const load = useCallback(async () => {
    const supabase = await loadSupabase();
    const { data, error } = await supabase.functions.invoke('machinery-beta', { body: { action: 'list' } });
    if (error) { const msg = await getFunctionErrorMessage(error, ''); if (/closed/i.test(msg)) setClosed(true); return; }
    setEntries(data?.entries ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const startLocation = () => {
    if (!('geolocation' in navigator)) { setGeoError('Location is not available on this device.'); return; }
    setGeoError('');
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => setLive({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: new Date(p.timestamp).toISOString() }),
      (e) => setGeoError(e.code === e.PERMISSION_DENIED ? 'Allow location for this site.' : 'Could not get your location.'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  };
  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const setPhotoBytes = (bytes: Uint8Array, source: Photo['source']) => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ bytes, source, tags: readExifGps(bytes, tzOffsetMin()), url: URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })) });
  };

  const openCamera = async () => {
    if (!live) { toast.error(PROBLEM_TEXT.no_location); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream; setCamera(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } });
    } catch { toast.error('Allow the camera, or upload a photo.'); }
  };
  const closeCamera = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setCamera(false); setCamReady(false); };
  const capture = async () => {
    const v = videoRef.current;
    if (!v || !live || !v.videoWidth) return;
    const scale = Math.min(1, 2000 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.85));
    closeCamera();
    if (!blob) return;
    setPhotoBytes(writeExifGps(new Uint8Array(await blob.arrayBuffer()), { lat: live.lat, lng: live.lng, at: new Date() }), 'app_capture');
  };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/jpe?g$/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) { toast.error('Use a JPEG photo.'); return; }
    let bytes = new Uint8Array(await file.arrayBuffer());
    const tags = readExifGps(bytes, tzOffsetMin());
    if (bytes.length > MAX_PHOTO_BYTES && tags) bytes = await shrink(bytes, tags);
    if (bytes.length > MAX_PHOTO_BYTES) { toast.error('Photo must be under 5 MB.'); return; }
    setPhotoBytes(bytes, 'photo_exif');
  };

  const speak = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'en-IN'; r.interimResults = false; r.continuous = false; r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const text = Array.from(e.results as ArrayLike<any>).map((x: any) => x[0].transcript).join(' ').trim();
      if (!text) return;
      setTranscript(text);
      const parsed = parseMachineSpeech(text);
      setFields((f) => ({
        machineType: parsed.machineType || f.machineType, makeModel: parsed.makeModel || f.makeModel,
        ratedPower: parsed.ratedPower ?? f.ratedPower, powerUnit: parsed.powerUnit ?? f.powerUnit,
        fuel: parsed.fuel ?? f.fuel, hoursPerDay: parsed.hoursPerDay ?? f.hoursPerDay,
      }));
    };
    r.onerror = (e: any) => { if (e.error === 'not-allowed') toast.error('Allow the microphone.'); };
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  };

  const evidence = useMemo(() => (photo ? checkEvidence(photo.tags, live, now) : null), [photo, live, now]);
  const fixFresh = !!live && now.getTime() - Date.parse(live.at) <= MAX_FIX_AGE_MS;
  const fixPrecise = !!live && live.accuracy <= MAX_ACCURACY_M;
  const locationOk = fixFresh && fixPrecise;
  const voiceOk = transcript.split(' ').filter(Boolean).length >= 3;
  const ready = locationOk && !!evidence?.ok && voiceOk && fields.machineType.trim().length >= 2 && !closed;

  const save = async () => {
    if (!ready || !photo || !live) return;
    setSaving(true);
    try {
      const supabase = await loadSupabase();
      const { data, error } = await supabase.functions.invoke('machinery-beta', {
        body: { action: 'save', fields, transcript, live, photo: toB64(photo.bytes), geoSource: photo.source, tzOffsetMin: tzOffsetMin() },
      });
      if (error) { toast.error(await getFunctionErrorMessage(error, 'Could not save. Try again.')); return; }
      if (data?.entry) setEntries((e) => [data.entry, ...e]);
      toast.success('Saved as Unverified.');
      URL.revokeObjectURL(photo.url);
      setPhoto(null); setTranscript(''); setFields(EMPTY);
    } finally { setSaving(false); }
  };

  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <Helmet><title>Add a machine | Senseible</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <Navigation />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Beta</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Add a machine</h1>
        {closed && <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">This beta is closed.</p>}

        <ol className="mt-6 grid gap-3">
          <Step n={1} icon={MapPin} label="Location" done={locationOk}>
            {live ? (
              <p className="text-sm text-muted-foreground">{locationOk ? `On · ±${Math.round(live.accuracy)} m` : PROBLEM_TEXT[fixPrecise ? 'stale_location' : 'weak_location']}</p>
            ) : (
              <button type="button" onClick={startLocation} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                <MapPin className="h-4 w-4" aria-hidden /> Turn on
              </button>
            )}
            {geoError && <p className="mt-1 text-sm text-destructive">{geoError}</p>}
          </Step>

          <Step n={2} icon={Camera} label="Photo of the machine" done={!!evidence?.ok}>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={openCamera} disabled={!live} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                <Camera className="h-4 w-4" aria-hidden /> Take photo
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <Upload className="h-4 w-4" aria-hidden /> Upload
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            {photo && (
              <div className="mt-3 flex min-w-0 items-center gap-3">
                <img src={photo.url} alt="Machine" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                <p className={`min-w-0 text-sm ${evidence?.ok ? 'text-foreground' : 'text-destructive'}`}>
                  {evidence?.ok
                    ? `${evidence.distanceM} m from you · ${Math.max(0, Math.round(evidence.photoAgeMin ?? 0))} min ago`
                    : evidence?.problems.map((p) => PROBLEM_TEXT[p]).join(' ')}
                </p>
              </div>
            )}
          </Step>

          <Step n={3} icon={Mic} label="Describe it by voice" done={voiceOk}>
            {speechSupported ? (
              <button type="button" onClick={speak} disabled={listening} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {listening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />} {listening ? 'Listening' : 'Speak'}
              </button>
            ) : <p className="text-sm text-muted-foreground">Voice needs Chrome or Edge.</p>}
            <p className="mt-2 text-xs text-muted-foreground">e.g. “Diesel generator, make Kirloskar, 125 kVA, 6 hours a day”</p>
            {transcript && <p className="mt-2 break-words rounded-lg bg-muted px-3 py-2 text-sm">“{transcript}”</p>}
          </Step>
        </ol>

        <section aria-label="Machine details" className="mt-4 grid min-w-0 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <label className="grid min-w-0 gap-1 text-sm">Machine<input className={field} value={fields.machineType} onChange={(e) => setFields({ ...fields, machineType: e.target.value })} maxLength={80} /></label>
          <label className="grid min-w-0 gap-1 text-sm">Make / model<input className={field} value={fields.makeModel} onChange={(e) => setFields({ ...fields, makeModel: e.target.value })} maxLength={120} /></label>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6rem] gap-2">
            <label className="grid min-w-0 gap-1 text-sm">Rated power<input className={field} inputMode="decimal" value={fields.ratedPower ?? ''} onChange={(e) => setFields({ ...fields, ratedPower: num(e.target.value) })} /></label>
            <label className="grid min-w-0 gap-1 text-sm">Unit
              <select className={field} value={fields.powerUnit ?? ''} onChange={(e) => setFields({ ...fields, powerUnit: (e.target.value || null) as MachineFields['powerUnit'] })}>
                <option value="">–</option>{POWER_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>
          <label className="grid min-w-0 gap-1 text-sm">Fuel
            <select className={field} value={fields.fuel ?? ''} onChange={(e) => setFields({ ...fields, fuel: (e.target.value || null) as MachineFields['fuel'] })}>
              <option value="">–</option>{FUELS.map((f) => <option key={f} value={f}>{FUEL_LABELS[f]}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm">Hours a day<input className={field} inputMode="decimal" value={fields.hoursPerDay ?? ''} onChange={(e) => setFields({ ...fields, hoursPerDay: num(e.target.value) })} /></label>
        </section>

        <button type="button" onClick={save} disabled={!ready || saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-50 sm:w-auto">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save
        </button>

        {entries.length > 0 && (
          <section aria-label="Your machines" className="mt-8">
            <h2 className="text-sm font-medium text-muted-foreground">Your machines</h2>
            <ul className="mt-2 grid gap-2">
              {entries.map((e) => (
                <li key={e.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <span className="min-w-0 truncate">{e.machine_type}{e.make_model ? ` · ${e.make_model}` : ''}{e.rated_power ? ` · ${e.rated_power} ${e.power_unit}` : ''}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Unverified</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {camera && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-label="Camera">
          <video ref={videoRef} playsInline muted onLoadedData={() => setCamReady(true)} className="min-h-0 flex-1 object-contain" />
          <div className="flex items-center justify-center gap-6 p-4">
            <button type="button" onClick={closeCamera} className="grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white" aria-label="Close camera"><X className="h-5 w-5" /></button>
            <button type="button" onClick={capture} disabled={!camReady} className="h-16 w-16 rounded-full border-4 border-white bg-white/30 disabled:opacity-40" aria-label="Take photo" />
          </div>
        </div>
      )}
    </div>
  );
}
