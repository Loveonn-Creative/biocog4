import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Square, X } from "lucide-react";
import { loadSupabase } from "@/integrations/supabase/lazyClient";
import { chatFailure, CHAT_TIMEOUT_MS, EMPTY_FAILURE, NETWORK_FAILURE, readSse, TIMEOUT_FAILURE } from "@/lib/intelligenceClient";
import { useT } from "@/lib/i18n/useT";
import { historyFor, readable, speakable, takeSentences, type VoiceTurn } from "@/lib/voice/homeVoice";

// Home page voice answers. One panel holds the conversation, so follow-ups
// work; the answer streams in and is read aloud sentence by sentence in the
// site language. The server decides what each visitor may see (sample data
// for guests and free accounts, their own records on paid plans), counts each
// question once, and only accepts user and assistant turns. Nothing here is
// stored: closing the panel, signing out or switching account forgets it.

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/intelligence-chat`;

type Props = {
  question: string;
  askId: number;
  /** Changes when the visitor starts speaking again: stop talking and listening to ourselves. */
  hush: number;
  lang: string;
  languageName: string;
  onClose: () => void;
};

function speak(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 1.08;
  window.speechSynthesis.speak(u);
}

type Current = { q: string; a: string; busy: boolean; error: string | null };

export function VoicePanel({ question, askId, hush, lang, languageName, onClose }: Props) {
  const t = useT();
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [current, setCurrent] = useState<Current>({ q: "", a: "", busy: false, error: null });
  const [finished, setFinished] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const turnsRef = useRef<VoiceTurn[]>([]);
  turnsRef.current = turns;

  const stop = () => {
    abortRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
    setCurrent((c) => (c.busy ? { ...c, busy: false } : c));
  };

  useEffect(() => () => {
    abortRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  // The visitor tapped Voice again: go quiet so the mic does not hear us.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per tap
  useEffect(() => { if (hush) stop(); }, [hush]);

  useEffect(() => {
    if (!question.trim()) return;
    abortRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const controller = new AbortController();
    abortRef.current = controller;
    // Times out when no new text arrives for a while, not only before the first.
    let timedOut = false;
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, CHAT_TIMEOUT_MS);
    };
    arm();
    setCurrent({ q: question, a: "", busy: true, error: null });
    setFinished("");
    const live = () => !controller.signal.aborted;

    // Errors are written in English, so they are read in English.
    const fail = (message: string) => {
      setCurrent((c) => ({ ...c, busy: false, error: message }));
      speak(message, "en-IN");
    };

    (async () => {
      let answer = "";
      try {
        const supabase = await loadSupabase();
        const { data } = await supabase.auth.getSession();
        if (!live()) return;
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(ENDPOINT, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${data?.session?.access_token || key}` },
          body: JSON.stringify({
            messages: historyFor(turnsRef.current, question),
            context: { isHomepage: true, type: "voice_query" },
            language: languageName,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (live()) fail(chatFailure(res.status, body, data?.session ? null : "guest").message);
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) { fail(EMPTY_FAILURE.message); return; }
        const decoder = new TextDecoder();
        let buffer = "";
        let pending = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done || !live()) break;
          arm();
          buffer += decoder.decode(value, { stream: true });
          const read = readSse(buffer);
          buffer = read.rest;
          if (read.deltas.length) {
            const delta = read.deltas.join("");
            answer += delta;
            pending += delta;
            setCurrent((c) => ({ ...c, a: answer }));
            const { ready, rest } = takeSentences(pending);
            pending = rest;
            for (const s of ready) { const text = speakable(s); if (text) { setSpeaking(true); speak(text, lang); } }
          }
          if (read.done) break;
        }
        if (!live()) return;
        const tail = speakable(pending);
        if (tail) { setSpeaking(true); speak(tail, lang); }
        if (!answer.trim()) { fail(EMPTY_FAILURE.message); return; }
        setCurrent((c) => ({ ...c, busy: false }));
        setFinished(readable(answer));
        setTurns((prev) => [...prev, { role: "user" as const, content: question }, { role: "assistant" as const, content: answer }].slice(-12));
      } catch {
        // Stopped, closed or replaced by a newer question: say nothing.
        if (controller.signal.aborted && !timedOut) return;
        if (!answer) fail(timedOut ? TIMEOUT_FAILURE.message : NETWORK_FAILURE.message);
        else setCurrent((c) => ({ ...c, busy: false }));
      } finally {
        window.clearTimeout(timer);
      }
    })();
    return () => { window.clearTimeout(timer); controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one request per spoken question (askId)
  }, [askId]);

  // Clear the "speaking" state when the browser finishes the queue.
  useEffect(() => {
    if (!speaking) return;
    const id = window.setInterval(() => { if (!window.speechSynthesis?.speaking) setSpeaking(false); }, 400);
    return () => window.clearInterval(id);
  }, [speaking]);

  return (
    <section aria-label={t("home.voice.panel", "Voice answer")} className="w-full max-w-md rounded-2xl border border-border bg-card p-4 text-left shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p data-no-translate className="text-sm text-muted-foreground">“{current.q}”</p>
        <button type="button" onClick={() => { stop(); onClose(); }} aria-label={t("home.voice.close", "Close voice answer")} className="-m-1 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {/* The answer arrives in the site language; the page translator must
          not rewrite it (a machine re-translation could change its figures). */}
      <div data-no-translate aria-hidden={!current.error && !!finished} className="mt-2 min-h-[1.5rem] text-[15px] leading-relaxed text-foreground">
        {current.error
          ? <p role="alert" className="text-destructive">{current.error}</p>
          : current.a
            ? <p className="whitespace-pre-line">{readable(current.a)}</p>
            : current.busy && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{t("home.voice.thinking", "Thinking…")}</p>}
      </div>
      {/* Screen readers hear the finished answer once, not every streamed word. */}
      <p data-no-translate className="sr-only" aria-live="polite">{finished}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {(speaking || current.busy) && (
          <button type="button" onClick={stop} className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary">
            <Square className="h-3.5 w-3.5" aria-hidden="true" />{t("home.voice.stop", "Stop")}
          </button>
        )}
        {!current.busy && !current.error && <span className="text-muted-foreground">{t("home.voice.followUp", "Ask a follow-up with Voice.")}</span>}
        <Link to="/intelligence" className="font-medium text-primary underline-offset-4 hover:underline">{t("home.voice.type", "Type instead")}</Link>
      </div>
    </section>
  );
}

export default VoicePanel;
