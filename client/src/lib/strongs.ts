export type StrongsDefinition = {
  number: string;
  transliteration: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  usage: string;
};

let greekCache: Record<string, StrongsDefinition> | null = null;
let hebrewCache: Record<string, StrongsDefinition> | null = null;

async function loadGreek() {
  if (greekCache) return greekCache;

  const base = import.meta.env.BASE_URL;
  const url = `${base}Strongs_Definitions/strongs-greek.json`;

  const res = await fetch(url);
  greekCache = await res.json();
  return greekCache;
}

async function loadHebrew() {
  if (hebrewCache) return hebrewCache;

  const base = import.meta.env.BASE_URL;
  const url = `${base}Strongs_Definitions/strongs-hebrew.json`;

  const res = await fetch(url);
  hebrewCache = await res.json();
  return hebrewCache;
}

export async function loadStrongsDefinition(strongs: string) {
  if (!strongs) return null;

  if (strongs.startsWith("G")) {
    const data = await loadGreek();
    return data[strongs] ?? null;
  }

  if (strongs.startsWith("H")) {
    const data = await loadHebrew();
    return data[strongs] ?? null;
  }

  return null;
}
