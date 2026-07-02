const fs = require('fs');

const fileContent = fs.readFileSync('C:\\Users\\HP-PC\\.gemini\\antigravity-ide\\brain\\2a0d8d7c-25cd-4f3c-8679-b15f0bb2b766\\scratch\\extracted_code.txt', 'utf8');
const lines = fileContent.split('\n');

function findOccurrences(term) {
  console.log(`=== Matches for: ${term} ===`);
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(term)) {
      console.log(`${i+1}: ${lines[i].trim().substring(0, 120)}`);
      count++;
      if (count >= 15) {
        console.log("... truncated");
        break;
      }
    }
  }
}

findOccurrences('filteredCa');
findOccurrences('resources');
findOccurrences('tests');
findOccurrences('certificates');
