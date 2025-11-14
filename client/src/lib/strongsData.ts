// src/lib/strongsData.ts

export type StrongsDefinition = {
  number: string;          // e.g. "G1615"
  lemma?: string;          // Greek/Hebrew script: "ἐκτελέω"
  transliteration?: string; // "ekteléō"
  pronunciation?: string;
  partOfSpeech?: string;   // from "pos" if present
  definition?: string;     // from "strongs_def"
  usage?: string;          // from "kjv_def"
  derivation?: string;     // from "derivation"
};

// This type matches your raw JSON entries:
// "G1615": { "strongs_def": "...", "derivation": "...", "translit": "...", "lemma": "...", "kjv_def": "finish" }
type RawStrongsEntry = {
  strongs_def?: string;
  derivation?: string;
  translit?: string;
  lemma?: string;
  kjv_def?: string;
  pos?: string;
  pronunciation?: string;
};

// ⚠️ Adjust these paths if needed to match your repo
import greekRaw from "../Strongs_Defintions/strongs-greek.json";
import hebrewRaw from "../Strongs_Defintions/strongs-hebrew.json";

const strongsGreek = greekRaw as Record<string, RawStrongsEntry>;
const strongsHebrew = hebrewRaw as Record<string, RawStrongsEntry>;

function normalizeStrongs(
  number: string,
  raw?: RawStrongsEntry
): StrongsDefinition | null {
  if (!raw) return null;

  return {
    number,
    lemma: raw.lemma,
    transliteration: raw.translit,
    pronunciation: raw.pronunciation,
    partOfSpeech: raw.pos,
    definition: raw.strongs_def,
    usage: raw.kjv_def,
    derivation: raw.derivation,
  };
}

export function getStrongsDefinition(number: string): StrongsDefinition | null {
  if (!number) return null;

  const key = number.toUpperCase().trim(); // e.g. "G1615", "H7225"

  if (key.startsWith("G")) {
    const raw = strongsGreek[key];
    return normalizeStrongs(key, raw);
  }

  if (key.startsWith("H")) {
    const raw = strongsHebrew[key];
    return normalizeStrongs(key, raw);
  }

  return null;
}
