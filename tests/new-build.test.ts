import { describe, expect, it } from "bun:test";
import { isNewerBuild, checkForNewBuild, currentBuildId } from "../src/lib/reliability/newBuild";

describe("stale build detection", () => {
  it("treats a different live id as newer, never in dev", () => {
    expect(isNewerBuild("b2", "b1")).toBe(true);
    expect(isNewerBuild("b1", "b1")).toBe(false);
    expect(isNewerBuild(undefined, "b1")).toBe(false);
    expect(isNewerBuild("", "b1")).toBe(false);
    expect(isNewerBuild("b2", "dev")).toBe(false);
  });
  it("does nothing in a dev build (no __BUILD_ID__)", async () => {
    expect(currentBuildId()).toBe("dev");
    let called = false;
    const r = await checkForNewBuild(Date.now(), (async () => { called = true; return new Response("{}"); }) as typeof fetch);
    expect(r).toBe(false);
    expect(called).toBe(false);
  });
});
