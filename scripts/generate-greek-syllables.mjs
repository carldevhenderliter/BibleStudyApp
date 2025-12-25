import fs from "fs";
import path from "path";

const srcPath = path.resolve("client/src/Strongs_Definitions/strongs-greek.json");
const destPath = path.resolve(
  "client/src/Strongs_Definitions/strongs-greek-syllables.json"
);

const raw = JSON.parse(fs.readFileSync(srcPath, "utf8"));

const VOWELS = new Set(["α", "ε", "η", "ι", "ο", "υ", "ω"]);
const DIPHTHONGS = new Set([
  "αι",
  "ει",
  "οι",
  "υι",
  "αυ",
  "ευ",
  "ου",
  "ηυ",
  "ωυ",
]);

const ALLOWED_ONSETS_2 = new Set([
  "βλ",
  "βρ",
  "γλ",
  "γρ",
  "δρ",
  "θλ",
  "θρ",
  "κλ",
  "κρ",
  "μν",
  "πλ",
  "πρ",
  "σθ",
  "σκ",
  "σμ",
  "σπ",
  "στ",
  "σφ",
  "σχ",
  "τλ",
  "τρ",
  "φλ",
  "φρ",
  "χλ",
  "χρ",
  "γν",
  "κν",
  "πν",
  "σν",
]);

const ALLOWED_ONSETS_3 = new Set([
  "στρ",
  "σπρ",
  "σπλ",
  "σκρ",
  "σκλ",
  "σφρ",
  "σθρ",
]);

const DIACRITICS = /[\u0300-\u036f]/g;

function stripDiacritics(value) {
  return value.normalize("NFD").replace(DIACRITICS, "");
}

function baseChar(value) {
  const stripped = stripDiacritics(value).toLowerCase();
  return stripped === "ς" ? "σ" : stripped;
}

function isVowel(value) {
  return VOWELS.has(baseChar(value));
}

function isGreekLetter(value) {
  const base = baseChar(value);
  return VOWELS.has(base) ||
    [
      "β",
      "γ",
      "δ",
      "ζ",
      "θ",
      "κ",
      "λ",
      "μ",
      "ν",
      "ξ",
      "π",
      "ρ",
      "σ",
      "τ",
      "φ",
      "χ",
      "ψ",
    ].includes(base);
}

function isDiphthong(a, b) {
  const pair = `${baseChar(a)}${baseChar(b)}`;
  return DIPHTHONGS.has(pair);
}

function syllabifyWord(word) {
  const chars = Array.from(word);
  const vowelGroups = [];

  for (let i = 0; i < chars.length; i += 1) {
    const current = chars[i];
    if (!isVowel(current)) continue;

    if (i + 1 < chars.length && isVowel(chars[i + 1]) && isDiphthong(current, chars[i + 1])) {
      vowelGroups.push({ start: i, end: i + 1 });
      i += 1;
      continue;
    }

    vowelGroups.push({ start: i, end: i });
  }

  if (vowelGroups.length <= 1) {
    return [word];
  }

  const syllables = [];
  let syllableStart = 0;

  for (let g = 0; g < vowelGroups.length - 1; g += 1) {
    const current = vowelGroups[g];
    const next = vowelGroups[g + 1];
    const betweenStart = current.end + 1;
    const betweenEnd = next.start - 1;

    if (betweenStart > betweenEnd) {
      syllables.push(chars.slice(syllableStart, current.end + 1).join(""));
      syllableStart = next.start;
      continue;
    }

    const consonants = chars.slice(betweenStart, next.start);
    const consonantBases = consonants.map((c) => baseChar(c));

    let onsetSize = 1;
    if (consonantBases.length >= 3) {
      const last3 = consonantBases.slice(-3).join("");
      if (ALLOWED_ONSETS_3.has(last3)) {
        onsetSize = 3;
      }
    }
    if (onsetSize === 1 && consonantBases.length >= 2) {
      const last2 = consonantBases.slice(-2).join("");
      if (ALLOWED_ONSETS_2.has(last2)) {
        onsetSize = 2;
      }
    }

    const splitIndex = next.start - onsetSize;
    syllables.push(chars.slice(syllableStart, splitIndex).join(""));
    syllableStart = splitIndex;
  }

  syllables.push(chars.slice(syllableStart).join(""));
  return syllables;
}

function syllabifyLemma(lemma) {
  if (!lemma) return [];
  const parts = lemma.split(/(\s+|[··\-–—.,;:()\[\]"'“”])/);
  return parts
    .map((part) => {
      if (!part) return "";
      if (/^\s+$/.test(part)) return part;
      if (part.length === 1 && !isGreekLetter(part)) return part;
      if (["·", "-", "–", "—", ".", ",", ";", ":"].includes(part)) return part;
      const chars = Array.from(part);
      if (!chars.some((c) => isVowel(c))) return part;
      return syllabifyWord(part).join("·");
    })
    .join("");
}

const result = {};

for (const [strongsId, entry] of Object.entries(raw)) {
  const lemma = entry?.lemma;
  if (!lemma) continue;
  const syllabified = syllabifyLemma(lemma);
  result[strongsId] = {
    lemma,
    syllables: syllabified ? syllabified.split("·") : [],
  };
}

fs.writeFileSync(destPath, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(`Wrote ${Object.keys(result).length} entries to ${destPath}`);
