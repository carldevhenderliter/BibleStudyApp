import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapping of kaiserlik book codes to display names
const bookMapping = {
  'Gen': 'Genesis', 'Exo': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers', 'Deu': 'Deuteronomy',
  'Jos': 'Joshua', 'Jdg': 'Judges', 'Rut': 'Ruth', '1Sa': '1 Samuel', '2Sa': '2 Samuel',
  '1Ki': '1 Kings', '2Ki': '2 Kings', '1Ch': '1 Chronicles', '2Ch': '2 Chronicles',
  'Ezr': 'Ezra', 'Neh': 'Nehemiah', 'Est': 'Esther', 'Job': 'Job', 'Psa': 'Psalms',
  'Pro': 'Proverbs', 'Ecc': 'Ecclesiastes', 'Sng': 'Song of Solomon', 'Isa': 'Isaiah',
  'Jer': 'Jeremiah', 'Lam': 'Lamentations', 'Eze': 'Ezekiel', 'Dan': 'Daniel',
  'Hos': 'Hosea', 'Jol': 'Joel', 'Amo': 'Amos', 'Oba': 'Obadiah', 'Jon': 'Jonah',
  'Mic': 'Micah', 'Nah': 'Nahum', 'Hab': 'Habakkuk', 'Zep': 'Zephaniah', 'Hag': 'Haggai',
  'Zec': 'Zechariah', 'Mal': 'Malachi', 'Mat': 'Matthew', 'Mrk': 'Mark', 'Luk': 'Luke',
  'Jhn': 'John', 'Act': 'Acts', 'Rom': 'Romans', '1Co': '1 Corinthians', '2Co': '2 Corinthians',
  'Gal': 'Galatians', 'Eph': 'Ephesians', 'Php': 'Philippians', 'Col': 'Colossians',
  '1Th': '1 Thessalonians', '2Th': '2 Thessalonians', '1Ti': '1 Timothy', '2Ti': '2 Timothy',
  'Tit': 'Titus', 'Phm': 'Philemon', 'Heb': 'Hebrews', 'Jas': 'James', '1Pe': '1 Peter',
  '2Pe': '2 Peter', '1Jo': '1 John', '2Jo': '2 John', '3Jo': '3 John', 'Jde': 'Jude',
  'Rev': 'Revelation'
};

function sanitizeJSON(rawData) {
  // Remove BOM
  let data = rawData.replace(/^\uFEFF/, '').trim();
  
  // Extract JSON object by slicing between first "{" and last "}"
  const start = data.indexOf('{');
  const end = data.lastIndexOf('}');
  
  if (start === -1 || end === -1 || start >= end) {
    throw new Error('No valid JSON object found in data');
  }
  
  data = data.substring(start, end + 1);
  
  // Character-by-character sanitizer that tracks string state
  let result = '';
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    
    if (escaped) {
      // If we're escaped, just add the character and reset
      result += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      // Start escape sequence
      escaped = true;
      result += char;
      continue;
    }
    
    if (char === '"') {
      // Toggle string state
      inString = !inString;
      result += char;
      continue;
    }
    
    if (inString) {
      // Inside a string: replace control characters with spaces
      if (char === '\n' || char === '\r' || char === '\t') {
        result += ' ';
      } else if (char.charCodeAt(0) >= 32 || char.charCodeAt(0) === 9) {
        result += char;
      }
      // Skip other control characters
    } else {
      // Outside strings: preserve everything except control characters
      if (char.charCodeAt(0) >= 32 || char === '\n' || char === '\r' || char === '\t') {
        result += char;
      }
    }
  }
  
  // Fix trailing commas
  result = result.replace(/,(\s*[}\]])/g, '$1');
  
  return result;
}

function fetchBook(bookCode) {
  return new Promise((resolve, reject) => {
    const url = `https://raw.githubusercontent.com/kaiserlik/kjv/main/${bookCode}.json`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          // Try direct parse first
          resolve(JSON.parse(data));
        } catch (e) {
          try {
            // Use stateful sanitizer for malformed JSON
            const sanitized = sanitizeJSON(data);
            resolve(JSON.parse(sanitized));
          } catch (e2) {
            reject(new Error(`Failed to parse ${bookCode}: ${e.message}`));
          }
        }
      });
    }).on('error', reject);
  });
}

function parseStrongsFromText(text) {
  const strongsPattern = /\[([GH]\d+)\]/g;
  const strongs = [];
  let match;
  while ((match = strongsPattern.exec(text)) !== null) {
    strongs.push(match[1]);
  }
  return strongs;
}

function parseTokensFromText(text) {
  // Parse "word[G1234][G5678]" format into tokens, handling multiple tags and punctuation
  const tokens = [];
  const parts = text.split(/\s+/).filter(p => p.trim());
  
  for (const part of parts) {
    // Extract all Strong's tags from this part
    const strongsTags = [];
    const strongsPattern = /\[([GH]\d+)\]/g;
    let match;
    while ((match = strongsPattern.exec(part)) !== null) {
      strongsTags.push(match[1]);
    }
    
    // Remove all Strong's tags to get the clean word
    let cleanWord = part.replace(/\[([GH]\d+)\]/g, '');
    
    // Separate punctuation from the word
    const punctMatch = cleanWord.match(/^([^\w]*)([\w']+)([^\w]*)$/);
    if (punctMatch && punctMatch[2]) {
      const [, leading, word, trailing] = punctMatch;
      
      // Add leading punctuation as separate token if present
      if (leading) {
        tokens.push({ english: leading });
      }
      
      // Add the main word with Strong's numbers
      if (strongsTags.length > 0) {
        tokens.push({
          english: word,
          strongs: strongsTags.length === 1 ? strongsTags[0] : strongsTags
        });
      } else {
        tokens.push({ english: word });
      }
      
      // Add trailing punctuation as separate token if present
      if (trailing) {
        tokens.push({ english: trailing });
      }
    } else if (cleanWord) {
      // Fallback for words that don't match the pattern
      if (strongsTags.length > 0) {
        tokens.push({
          english: cleanWord,
          strongs: strongsTags.length === 1 ? strongsTags[0] : strongsTags
        });
      } else {
        tokens.push({ english: cleanWord });
      }
    }
  }
  
  return tokens;
}

function createSlug(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

async function integrateStrongs() {
  console.log('Integrating Strong\'s numbers from kaiserlik/kjv...\n');
  const allVerses = [];
  
  for (const [bookCode, displayName] of Object.entries(bookMapping)) {
    try {
      console.log(`Processing ${displayName}...`);
      const bookData = await fetchBook(bookCode);
      
      const bookKey = Object.keys(bookData)[0];
      const chapters = bookData[bookKey];
      
      for (const chapterKey of Object.keys(chapters)) {
        if (chapterKey === bookKey) continue; // Skip the book-level key
        
        const chapterNum = parseInt(chapterKey.split('|')[1]);
        const verses = chapters[chapterKey];
        
        for (const verseKey of Object.keys(verses)) {
          const verseNum = parseInt(verseKey.split('|')[2]);
          const verseData = verses[verseKey];
          
          // Get English text (remove Strong's tags for display)
          const textWithStrongs = verseData.en || '';
          // Remove Strong's tags and normalize whitespace
          const cleanText = textWithStrongs
            .replace(/\[([GH]\d+)\]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          const verseId = `${createSlug(displayName)}-${chapterNum}-${verseNum}-kjv`;
          
          // Extract Strong's numbers and create tokens
          const strongsNumbers = parseStrongsFromText(textWithStrongs);
          const tokens = parseTokensFromText(textWithStrongs);
          
          const verse = {
            id: verseId,
            book: displayName,
            chapter: chapterNum,
            verse: verseNum,
            text: cleanText,
            translation: "KJV"
          };
          
          // Add Strong's data if present
          if (strongsNumbers.length > 0) {
            verse.strongsNumbers = strongsNumbers;
            verse.tokens = tokens;
          }
          
          allVerses.push(verse);
        }
      }
      
      console.log(`✓ ${displayName} complete`);
    } catch (error) {
      console.error(`✗ Error processing ${displayName}:`, error.message);
    }
  }
  
  console.log(`\nTotal verses with Strong's: ${allVerses.filter(v => v.strongsNumbers).length} / ${allVerses.length}`);
  
  // Write consolidated file plus per-book files
  const outDir = process.env.OUT_DIR || path.join(__dirname, '..', 'downloads', 'strongs-generated');
  fs.mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, 'bible-kjv-strongs.json');
  fs.writeFileSync(outputPath, JSON.stringify(allVerses, null, 2));
  console.log(`Saved full JSON to: ${outputPath}`);

  // Split per book using existing slugs
  const byBook = allVerses.reduce((acc, verse) => {
    acc[verse.book] = acc[verse.book] || [];
    acc[verse.book].push(verse);
    return acc;
  }, {});

  const slug = (name) => name.toLowerCase().replace(/\s+/g, '-');

  Object.entries(byBook).forEach(([bookName, verses]) => {
    const bookPath = path.join(outDir, `bible-kjv-strongs-${slug(bookName)}.json`);
    fs.writeFileSync(bookPath, JSON.stringify(verses, null, 2));
  });
  console.log(`Saved per-book JSONs to: ${outDir}`);
}

integrateStrongs().catch(console.error);
