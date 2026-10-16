import { loadSupabase } from "@/integrations/supabase/lazyClient";
import type { BuyerId, Story } from "@/lib/caseStudy";

export interface PublishedStory { slug: string; buyer: BuyerId; industry: string; story: Story; published_at: string }

// The public view (published stories, safe columns only) is not in the generated types yet.
type ViewQuery = { select: (c: string) => ViewQuery; eq: (k: string, v: string) => ViewQuery; order: (k: string, o: { ascending: boolean }) => ViewQuery; limit: (n: number) => Promise<{ data: PublishedStory[] | null; error: unknown }>; maybeSingle: () => Promise<{ data: PublishedStory | null; error: unknown }> };
const view = async () => (await loadSupabase() as unknown as { from: (t: string) => ViewQuery }).from("case_studies_public");

/** Published stories, newest first. An empty list (not an error) when the feature is not live yet. */
export async function listPublishedStories(): Promise<PublishedStory[]> {
  try {
    const { data, error } = await (await view()).select("slug, buyer, industry, story, published_at").order("published_at", { ascending: false }).limit(200);
    return error ? [] : data ?? [];
  } catch { return []; }
}

export async function getPublishedStory(slug: string): Promise<PublishedStory | null> {
  if (!/^[a-z0-9-]{3,120}$/.test(slug)) return null;
  try {
    const { data, error } = await (await view()).select("slug, buyer, industry, story, published_at").eq("slug", slug).maybeSingle();
    return error ? null : data;
  } catch { return null; }
}
