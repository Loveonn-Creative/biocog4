import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Camera, Check, Loader2, MapPin, Mic, Upload } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import { getFunctionErrorMessage } from '@/lib/functionErrors';
import {
  checkEvidence, parseMachineSpeech, readExifGps, readRawExif, writeExifGps,
  FUELS, FUEL_LABELS, MAX_ACCURACY_M, MAX_FIX_AGE_MS, MAX_PHOTO_BYTES, MAX_PHOTO_KB, POWER_UNITS, PROBLEM_TEXT,
  type LiveFix, type MachineFields, type PhotoTags, type RawPhotoTags,
} from '../../supabase/functions/_shared/machineryBeta';

type Photo = { bytes: Uint8Array; url: string; raw: RawPhotoTags | null; tags: PhotoTags | null };
type Entry = { id: string; machine_type: string; make_model: string; rated_power: number | null; power_unit: string | null; fuel: string | null; hours_per_day: number | null; distance_m: number; status: string; created_at: string };

const EMPTY: MachineFields = { machineType: '', makeModel: '', ratedPower: null, powerUnit: null, fuel: null, hoursPerDay: null };
const tzOffsetMin = () => -new Date().getTimezoneOffset();
const toB64 = (bytes: Uint8Array) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const sizeLabel = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);
const field = 'w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm';

/**
 * Re-encodes a photo in the browser until it fits under the cap, then writes
 * its original GPS position and date/time back in, so nothing is lost.
 */
async function reducePhoto(bytes: Uint8Array, raw: RawPhotoTags): Promise<Uint8Array> {
  const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
  const target = MAX_PHOTO_BYTES - 2048; // room for the tags
  let maxDim = Math.min(2000, Math.max(bmp.width, bmp.height));
  let quality = 0.82;
  for (let attempt = 0; attempt < 16; attempt++) {
    const scale = maxDim / Math.max(bmp.width, bmp.height);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * scale)); c.height = Math.max(1, Math.round(bmp.height * scale));
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', quality));
    if (blob && blob.size <= target) return writeExifGps(new Uint8Array(await blob.arrayBuffer()), raw);
    if (quality > 0.55) quality -= 0.1; else maxDim = Math.round(maxDim * 0.8);
  }
  throw new Error('Could not reduce this photo.');
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
  const [reducing, setReducing] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [fields, setFields] = useState<MachineFields>(EMPTY);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [closed, setClosed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const watchId = useRef<number | null>(null);
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
  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); }, []);

  const showPhoto = (bytes: Uint8Array) => {
    setPhoto((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return { bytes, raw: readRawExif(bytes), tags: readExifGps(bytes, tzOffsetMin()), url: URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })) };
    });
  };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/jpe?g$/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) { toast.error('Use a JPEG photo.'); return; }
    showPhoto(new Uint8Array(await file.arrayBuffer()));
  };
  const reduce = async () => {
    if (!photo?.raw) return;
    setReducing(true);
    try { showPhoto(await reducePhoto(photo.bytes, photo.raw)); }
    catch { toast.error('Could not reduce this photo. Try another.'); }
    finally { setReducing(false); }
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

  const fixFresh = !!live && now.getTime() - Date.parse(live.at) <= MAX_FIX_AGE_MS;
  const fixPrecise = !!live && live.accuracy <= MAX_ACCURACY_M;
  const locationOk = fixFresh && fixPrecise;
  const evidence = useMemo(() => (photo ? checkEvidence(photo.tags, live, now) : null), [photo, live, now]);
  const tooBig = !!photo && photo.bytes.length > MAX_PHOTO_BYTES;
  // Without live location the distance can't be checked yet; show the photo's own problems only.
  const photoProblems = evidence?.problems.filter((p) => live || !p.endsWith('location')) ?? [];
  const photoOk = !!evidence?.ok && !tooBig;
  const voiceOk = transcript.split(' ').filter(Boolean).length >= 3;
  const ready = locationOk && photoOk && voiceOk && fields.machineType.trim().length >= 2 && !closed;

  const save = async () => {
    if (!ready || !photo || !live) return;
    setSaving(true);
    try {
      const supabase = await loadSupabase();
      const { data, error } = await supabase.functions.invoke('machinery-beta', {
        body: { action: 'save', fields, transcript, live, photo: toB64(photo.bytes), tzOffsetMin: tzOffsetMin() },
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
          <Step n={1} icon={MapPin} label="Your location" done={locationOk}>
            {live ? (
              <p className="text-sm text-muted-foreground">{locationOk ? `On · ±${Math.round(live.accuracy)} m` : PROBLEM_TEXT[fixPrecise ? 'stale_location' : 'weak_location']}</p>
            ) : (
              <button type="button" onClick={startLocation} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                <MapPin className="h-4 w-4" aria-hidden /> Turn on location
              </button>
            )}
            {geoError && <p className="mt-1 text-sm text-destructive">{geoError}</p>}
          </Step>

          <Step n={2} icon={Camera} label="Photo of the machine" done={photoOk}>
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              <Upload className="h-4 w-4" aria-hidden /> Upload photo
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg" className="hidden" aria-label="Photo of the machine" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
            <p className="mt-2 text-xs text-muted-foreground">Use a GPS camera app photo: it shows date, time and location.</p>
            {photo && (
              <div className="mt-3 flex min-w-0 items-start gap-3">
                <img src={photo.url} alt="Machine" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 text-sm">
                  {photoProblems.length > 0
                    ? <p className="text-destructive">{photoProblems.map((p) => PROBLEM_TEXT[p]).join(' ')}</p>
                    : evidence?.distanceM !== null && evidence?.distanceM !== undefined
                      ? <p>{evidence.distanceM} m from you · {Math.max(0, Math.round(evidence.photoAgeMin ?? 0))} min ago</p>
                      : <p className="text-muted-foreground">Turn on location to check the photo.</p>}
                  {tooBig && (
                    <p className="mt-1">
                      <span className="text-destructive">{sizeLabel(photo.bytes.length)}. Limit is {MAX_PHOTO_KB} KB.</span>{' '}
                      {photo.raw && (
                        <button type="button" onClick={reduce} disabled={reducing} className="font-medium text-primary underline underline-offset-2 disabled:opacity-60">
                          {reducing ? 'Reducing…' : 'Reduce size'}
                        </button>
                      )}
                    </p>
                  )}
                  {!tooBig && photo.raw && <p className="mt-1 text-xs text-muted-foreground">{sizeLabel(photo.bytes.length)}</p>}
                </div>
              </div>
            )}
          </Step>

          <Step n={3} icon={Mic} label="Describe it by voice" done={voiceOk}>
            {speechSupported ? (
              <button type="button" onClick={speak} disabled={listening} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {listening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />} {listening ? 'Listening' : 'Speak'}
              </button>
            ) : <p className="text-sm text-muted-foreground">Voice needs Chrome or Edge.</p>}
            <p className="mt-2 text-xs text-muted-foreground">Say it like: “Diesel generator, make Kirloskar, 125 kVA, 6 hours a day.”</p>
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
    </div>
  );
}
