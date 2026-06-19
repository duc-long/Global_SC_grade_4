const fs = require('fs');
const path = require('path');

const vocabFile = path.join(__dirname, 'vocab.txt');
const outputFile = path.join(__dirname, 'data', 'vocab.json');

const content = fs.readFileSync(vocabFile, 'utf-8');
const lines = content.split('\n').map(l => l.trim()).filter(l => l !== '');

const units = [];
let currentUnit = null;
let state = 'search_unit'; 
// states: search_unit, header, words
// Header usually takes up 5 lines: Từ vựng, Từ loại, Phiên âm, Phát âm, Dịch nghĩa

let currentWord = {};
let wordPropIndex = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.startsWith('Unit ')) {
    if (currentUnit) {
      units.push(currentUnit);
    }
    const titleMatch = line.match(/Unit (\d+):\s*(.*)/);
    let id = units.length + 1;
    let title = line;
    if (titleMatch) {
      id = parseInt(titleMatch[1]);
      title = titleMatch[2];
    }

    currentUnit = {
      id: id,
      title: title,
      words: []
    };
    state = 'header';
    continue;
  }

  if (state === 'header') {
    // Skip the table headers
    if (['Từ vựng', 'Từ loại', 'Phiên âm', 'Phát âm', 'Dịch nghĩa'].includes(line)) {
      continue;
    } else if (line.startsWith('Tham khảo thêm')) {
      continue;
    } else {
      state = 'words';
      wordPropIndex = 0;
      currentWord = {};
    }
  }

  if (state === 'words') {
    if (line.startsWith('Tham khảo thêm')) {
      continue;
    }
    
    // Each word has 5 lines of data typically:
    // 0: Word (English)
    // 1: Type (n, v, etc)
    // 2: Phonetic (/.../)
    // 3: Audio icon (ignore)
    // 4: Meaning (Vietnamese)
    
    if (wordPropIndex === 0) {
      currentWord.word = line;
      wordPropIndex++;
    } else if (wordPropIndex === 1) {
      currentWord.type = line;
      wordPropIndex++;
    } else if (wordPropIndex === 2) {
      currentWord.phonetic = line;
      wordPropIndex++;
    } else if (wordPropIndex === 3) {
      // Audio icon line
      if (line === 'Audio icon') {
        wordPropIndex++;
      } else {
        // Sometimes audio icon is missing or format is weird, let's just assume it's meaning if it's not 'Audio icon'
        currentWord.meaning = line;
        // Generate a random cartoon image URL based on word (placeholder)
        currentWord.imageUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentWord.word)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
        currentUnit.words.push({...currentWord});
        currentWord = {};
        wordPropIndex = 0;
      }
    } else if (wordPropIndex === 4) {
      currentWord.meaning = line;
      currentWord.imageUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentWord.word)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
      currentUnit.words.push({...currentWord});
      currentWord = {};
      wordPropIndex = 0;
    }
  }
}

if (currentUnit) {
  units.push(currentUnit);
}

// Create data directory if it doesn't exist
const dataDir = path.dirname(outputFile);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(outputFile, JSON.stringify(units, null, 2));
console.log(`Successfully parsed ${units.length} units into vocab.json`);
