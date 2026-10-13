// Loads one article body on demand, so a reader downloads only the article
// they open. Vite turns each ./articleBodies/<slug>.ts into its own chunk.
const loaders = import.meta.glob<{ default: string }>('./articleBodies/*.ts');

export function hasArticleBody(slug: string): boolean {
  return `./articleBodies/${slug}.ts` in loaders;
}

export async function loadArticleBody(slug: string): Promise<string> {
  const load = loaders[`./articleBodies/${slug}.ts`];
  if (!load) throw new Error(`No article body for ${slug}`);
  return (await load()).default;
}
