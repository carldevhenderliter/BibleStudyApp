// Strong's Concordance - Sample definitions
// This is a simplified version with common Greek words from the New Testament

export type StrongsDefinition = {
  number: string;
  transliteration: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  usage: string;
};

export const strongsGreek: Record<string, StrongsDefinition> = {
  "G746": {
    number: "G746",
    transliteration: "archē",
    pronunciation: "ar-khay'",
    partOfSpeech: "noun",
    definition: "beginning, origin",
    usage: "From 'archo' (to be first); a commencement, or (concretely) chief (in various applications of order, time, place, or rank)"
  },
  "G1722": {
    number: "G1722",
    transliteration: "en",
    pronunciation: "en",
    partOfSpeech: "preposition",
    definition: "in, on, among",
    usage: "A primary preposition denoting (fixed) position (in place, time or state)"
  },
  "G2258": {
    number: "G2258",
    transliteration: "ēn",
    pronunciation: "ane",
    partOfSpeech: "verb",
    definition: "was, were",
    usage: "Imperfect of 'eimi' (I am); was or were"
  },
  "G2316": {
    number: "G2316",
    transliteration: "theos",
    pronunciation: "theh'-os",
    partOfSpeech: "noun",
    definition: "God, god",
    usage: "Of uncertain affinity; a deity, especially the supreme Divinity"
  },
  "G2532": {
    number: "G2532",
    transliteration: "kai",
    pronunciation: "kahee",
    partOfSpeech: "conjunction",
    definition: "and, also, even",
    usage: "Apparently a primary particle, having a copulative and sometimes also a cumulative force"
  },
  "G3056": {
    number: "G3056",
    transliteration: "logos",
    pronunciation: "log'-os",
    partOfSpeech: "noun",
    definition: "word, reason, speech",
    usage: "From 'lego' (to speak); something said (including the thought); by implication a topic, also reasoning (the mental faculty) or motive"
  },
  "G3778": {
    number: "G3778",
    transliteration: "houtos",
    pronunciation: "hoo'-tos",
    partOfSpeech: "pronoun",
    definition: "this, he",
    usage: "Including the nominative masculine plural; the he (she or it), i.e. this or that (often with article repeated)"
  },
  "G4314": {
    number: "G4314",
    transliteration: "pros",
    pronunciation: "pros",
    partOfSpeech: "preposition",
    definition: "to, toward, with",
    usage: "A strengthened form of 'pro' (before); a preposition of direction; forward to, i.e. toward"
  }
};

export const strongsHebrew: Record<string, StrongsDefinition> = {
  // Add Hebrew definitions here as needed
};

export function getStrongsDefinition(number: string): StrongsDefinition | null {
  if (number.startsWith('G')) {
    return strongsGreek[number] || null;
  } else if (number.startsWith('H')) {
    return strongsHebrew[number] || null;
  }
  return null;
}
