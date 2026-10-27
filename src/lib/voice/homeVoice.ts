// Home page voice: pure helpers, shared by the panel and the tests.
// What is spoken is the same answer that is shown, cleaned for speech;
// record IDs (the evidence list) are never read aloud.

import { displayAnswer } from "@/lib/intelligenceClient";
export { speechLangFor } from "./speechLang";

export type VoiceTurn = { role: "user" | "assistant"; content: string };

/** Turns kept for follow-ups: the last three questions and answers. */
export const VOICE_HISTORY_TURNS = 6;

/** The answer as shown: no record IDs, links as plain words, no markdown marks. */
export function readable(text: string): string {
  return displayAnswer(text)
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)]*\)/g, "$1")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}

/** The answer as read aloud: no record IDs, no markdown, no links. */
export function speakable(text: string): string {
  return displayAnswer(text)
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/^\s*(?:#{1,6}|>)\s*/gm, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/**
 * Splits streamed text into sentences that are ready to speak and the
 * unfinished remainder, so speech can start at the first full sentence.
 * A sentence ends at . ! ? or । followed by a space, or at a line break;
 * a dot inside a figure (4.2, 1,200.50) or a name (senseible.earth) is not
 * an end. Nothing is ever skipped: whatever is not ready stays in rest.
 */
export function takeSentences(buffer: string): { ready: string[]; rest: string } {
  const ready: string[] = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];
    const end = ch === "\n" || (/[.!?।]/.test(ch) && i + 1 < buffer.length && /\s/.test(buffer[i + 1]));
    if (!end) continue;
    const s = buffer.slice(start, i + 1).trim();
    if (s && !/^(?:Rs|No|Dr|Mr|Ms|Mrs|vs|approx|e\.g|i\.e)\.$/i.test(s.split(/\s+/).pop() ?? "")) {
      ready.push(s);
      start = i + 1;
    } else if (!s) {
      start = i + 1;
    }
  }
  return { ready, rest: buffer.slice(start) };
}

/** History sent with a new question: the last turns, user and assistant only, each trimmed. */
export function historyFor(turns: VoiceTurn[], question: string): VoiceTurn[] {
  const prior = turns
    .filter((t) => (t.role === "user" || t.role === "assistant") && t.content.trim())
    .slice(-VOICE_HISTORY_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 1200) }));
  return [...prior, { role: "user", content: question.trim().slice(0, 1000) }];
}
