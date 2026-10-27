import { describe, expect, test } from "bun:test";
import { historyFor, readable, speakable, speechLangFor, takeSentences, VOICE_HISTORY_TURNS } from "../src/lib/voice/homeVoice";

describe("home voice helpers", () => {
  test("listens and speaks in the site language", () => {
    expect(speechLangFor("hi")).toBe("hi-IN");
    expect(speechLangFor("ta")).toBe("ta-IN");
    expect(speechLangFor("en")).toBe("en-IN");
    expect(speechLangFor(null)).toBe("en-IN");
  });

  test("never reads record IDs, markdown or links aloud", () => {
    const t = speakable("**Electricity** was 4.2 t [a1b2c3d4]. See [History](/history) or https://senseible.earth/x\n- next line");
    expect(t).not.toMatch(/a1b2c3d4|\*\*|https?:|\/history|\[|\]/);
    expect(t).toContain("Electricity was 4.2 t.");
    expect(t).toContain("History");
  });

  test("never splits or drops figures, amounts or names", () => {
    expect(takeSentences("Electricity was 4.2 t. Next").ready).toEqual(["Electricity was 4.2 t."]);
    expect(takeSentences("Your total is Rs. 1,200.50 this month. More").ready).toEqual(["Your total is Rs. 1,200.50 this month."]);
    expect(takeSentences("Visit senseible.earth now. Then").ready).toEqual(["Visit senseible.earth now."]);
    expect(takeSentences("About ₹1.5 lakh a year. So").ready).toEqual(["About ₹1.5 lakh a year."]);
    const { ready, rest } = takeSentences("One. Two is 3.");
    expect([...ready, rest.trim()].join(" ")).toBe("One. Two is 3.");
  });

  test("reads > as part of the text unless it starts a quote line", () => {
    expect(speakable("Above > 50% of your total.")).toBe("Above > 50% of your total.");
    expect(speakable("> Quoted line")).toBe("Quoted line");
  });

  test("shows answers without record IDs or markdown marks", () => {
    const t = readable("**Electricity** is the largest source [3f9a1c2e]. See [Reports](/reports).\n- Diesel next");
    expect(t).toBe("Electricity is the largest source. See Reports.\n• Diesel next");
  });

  test("speaks finished sentences first and keeps the unfinished tail", () => {
    expect(takeSentences("First one. Second one is still")).toEqual({ ready: ["First one."], rest: " Second one is still" });
    expect(takeSentences("बिजली 4 टन है। अगला")).toEqual({ ready: ["बिजली 4 टन है।"], rest: " अगला" });
    expect(takeSentences("No end yet")).toEqual({ ready: [], rest: "No end yet" });
  });

  test("follow-ups send only recent user and assistant turns, trimmed", () => {
    const turns = Array.from({ length: 10 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: `turn ${i} ` + "x".repeat(2000) }));
    const h = historyFor(turns, "and last month?");
    expect(h.length).toBe(VOICE_HISTORY_TURNS + 1);
    expect(h.at(-1)).toEqual({ role: "user", content: "and last month?" });
    expect(h.every((m) => m.role === "user" || m.role === "assistant")).toBe(true);
    expect(Math.max(...h.map((m) => m.content.length))).toBeLessThanOrEqual(1200);
  });
});
