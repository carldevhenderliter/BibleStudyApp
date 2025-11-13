const bookSlugMap: Record<string, string> = {
  Genesis: "genesis",
  Exodus: "exodus",
  "Leviticus": "leviticus",
  // ...fill out others as needed
};

export type StrongsVerse = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
  strongsNumbers: string[];
  tokens: any[];
};

const cache = new Map<string, StrongsVerse[]>();

export async function loadStrongsForBook(book: string): Promise<StrongsVerse[]> {
  if (cache.has(book)) return cache.get(book)!;

  const slug = bookSlugMap[book];
  if (!slug) throw new Error(`Unknown book: ${book}`);

  const res = await fetch(`/strongs/bible-kjv-strongs-${slug}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load Strong's data for ${book}`);
  }

  const data = (await res.json()) as StrongsVerse[];
  cache.set(book, data);
  return data;
}
