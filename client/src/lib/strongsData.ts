// client/src/lib/strongsData.ts
// Make sure this path matches where your JSON actually lives:
//   client/src/Strongs_Definitions/strongs-greek.json
import greekRaw from "../Strongs_Definitions/strongs-greek.json";

export interface StrongsDefinition {
  number: string;          // e.g. "G3056"
  lemma?: string;          // e.g. "λόγος"
  transliteration?: string; // e.g. "logos"
  pronunciation?: string;  // if you add later
  partOfSpeech?: string;   // if you add later
  definition?: string;     // main Strong's gloss
  usage?: string;          // KJV usage list
  derivation?: string;     // derivation
}

// This matches the JSON you showed:
// "G1615": {
//   "strongs_def": " to complete fully",
//   "derivation": "from G1537 (ἐκ) and G5055 (τελέω);",
//   "translit": "ekteléō",
//   "lemma": "ἐκτελέω",
//   "kjv_def": "finish"
// }
type RawGreekEntry = {
  strongs_def?: string;
  derivation?: string;
  translit?: string;
  lemma?: string;
  kjv_def?: string;
};

// Tell TS what shape the imported JSON has
const greekData = greekRaw as Record<string, RawGreekEntry>;

function normalizeGreekEntry(
  key: string,
  raw: RawGreekEntry
): StrongsDefinition {
  return {
    number: key,
    lemma: raw.lemma,
    transliteration: raw.translit,
    pronunciation: undefined, // you can wire this up later if in JSON
    partOfSpeech: undefined,  // same here
    definition: raw.strongs_def?.trim(),
    usage: raw.kjv_def,
    derivation: raw.derivation,
  };
}

/**
 * Get a Strong's definition by number, e.g. "G3056" or "3056".
 * Returns null if not found.
 */
export function getStrongsDefinition(
  strongNumber: string
): StrongsDefinition | null {
  if (!strongNumber) return null;

  // Normalize: if it doesn’t start with G/H, assume Greek "G"
  let key = strongNumber.toUpperCase().trim();
  if (!key.startsWith("G") && !key.startsWith("H")) {
    key = `G${key}`;
  }

  const raw = greekData[key];
  if (!raw) {
    console.warn(`No Strong's entry found for`, key);
    return null;
  }

  return normalizeGreekEntry(key, raw);
}
