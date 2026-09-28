const fs = require('fs');

const fileContent = fs.readFileSync('C:\\Users\\HP-PC\\.gemini\\antigravity-ide\\brain\\2a0d8d7c-25cd-4f3c-8679-b15f0bb2b766\\scratch\\extracted_code.txt', 'utf8');

console.log("=== Content from 41000 to 49311 ===");
console.log(fileContent.substring(41000, 49311));
