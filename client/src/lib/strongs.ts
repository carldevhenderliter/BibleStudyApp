export type StrongsDefinition = {
  number: string;
  transliteration: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  usage: string;
};

// Shape of the raw entries in your JSON files
type RawStrongsEntry = {
  lemma?: string;
  translit?: string;
  strongs_def?: string;
  kjv_def?: string;
  pronunciation?: string;
  pos?: string;
  [key: string]: unknown;
};

let greekCache: Record<string, RawStrongsEntry> | null = null;
let hebrewCache: Record<string, RawStrongsEntry> | null = null;

async function loadGreekRaw() {
  if (greekCache) return greekCache;

  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}Strongs_Definitions/strongs-greek.json`);

  if (!res.ok) {
    console.error("Failed to load Greek Strong's JSON", res.status);
    greekCache = {};
    return greekCache;
  }

  greekCache = (await res.json()) as Record<string, RawStrongsEntry>;
  return greekCache;
}

async function loadHebrewRaw() {
  if (hebrewCache) return hebrewCache;

  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}Strongs_Definitions/strongs-hebrew.json`);

  if (!res.ok) {
    console.error("Failed to load Hebrew Strong's JSON", res.status);
    hebrewCache = {};
    return hebrewCache;
  }

  hebrewCache = (await res.json()) as Record<string, RawStrongsEntry>;
  return hebrewCache;
}

// Map the raw JSON entry into your StrongsDefinition shape
function mapRawToDefinition(
  strongs: string,
  raw: RawStrongsEntry | undefined
): StrongsDefinition | null {
  if (!raw) return null;

  return {
    number: strongs,
    transliteration: raw.translit ?? "",
    pronunciation:
      // use explicit pronunciation if present, otherwise leave blank
      (raw.pronunciation as string | undefined) ?? "",
    partOfSpeech:
      (raw.pos as string | undefined) ?? "",
    definition: raw.strongs_def ?? "",
    usage: raw.kjv_def ?? "",
  };
}

export async function loadStrongsDefinition(
  strongs: string
): Promise<StrongsDefinition | null> {
  if (!strongs) return null;

  if (strongs.startsWith("G")) {
    const data = await loadGreekRaw();
    const raw = data[strongs];
    return mapRawToDefinition(strongs, raw);
  }

  if (strongs.startsWith("H")) {
    const data = await loadHebrewRaw();
    const raw = data[strongs];
    return mapRawToDefinition(strongs, raw);
  }

  return null;
}
