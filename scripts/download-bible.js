import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bookNames = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1Samuel", "2Samuel", "1Kings", "2Kings", "1Chronicles", "2Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "SongofSolomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1Corinthians", "2Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1Thessalonians", "2Thessalonians", "1Timothy", "2Timothy", "Titus", "Philemon", "Hebrews", "James", "1Peter", "2Peter", "1John", "2John", "3John", "Jude", "Revelation"];

const displayNames = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];

function fetchBook(bookName) {
  return new Promise((resolve, reject) => {
    const url = `https://raw.githubusercontent.com/aruljohn/Bible-kjv/master/${bookName}.json`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function createSlug(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

async function downloadAndTransform() {
  console.log('Downloading all 66 books of the Bible...');
  const allVerses = [];
  
  for (let i = 0; i < bookNames.length; i++) {
    const fileName = bookNames[i];
    const displayName = displayNames[i];
    
    try {
      console.log(`Downloading ${displayName}...`);
      const bookData = await fetchBook(fileName);
      
      // Transform to our app format
      for (let chapterIndex = 0; chapterIndex < bookData.chapters.length; chapterIndex++) {
        const chapter = bookData.chapters[chapterIndex];
        const chapterNum = chapterIndex + 1;
        
        for (const verseData of chapter.verses) {
          const verseNum = parseInt(verseData.verse);
          const verseId = `${createSlug(displayName)}-${chapterNum}-${verseNum}-kjv`;
          
          allVerses.push({
            id: verseId,
            book: displayName,
            chapter: chapterNum,
            verse: verseNum,
            text: verseData.text,
            translation: "KJV"
          });
        }
      }
      
      console.log(`✓ ${displayName} complete (${bookData.chapters.length} chapters)`);
    } catch (error) {
      console.error(`✗ Error downloading ${displayName}:`, error.message);
    }
  }
  
  console.log(`\nTotal verses: ${allVerses.length}`);
  
  // Write to file
  const outputPath = path.join(__dirname, '..', 'client', 'src', 'lib', 'bible-kjv-full.json');
  fs.writeFileSync(outputPath, JSON.stringify(allVerses, null, 2));
  console.log(`\nSaved to: ${outputPath}`);
}

downloadAndTransform().catch(console.error);
