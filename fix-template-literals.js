const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'constants', 'skin2HomeSnapshot.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original content preview (first 1000 chars):');
console.log(content.substring(0, 1000));

// Replace template literal patterns
// Pattern: non-String.raw template literal in an array
content = content.replace(/(\s+)`([^`]*)/g, (match, whitespace, templateContent) => {
  // Check if it's already String.raw
  if (match.includes('String.raw`')) {
    return match;
  }
  // Add String.raw prefix
  return `${whitespace}String.raw\`${templateContent}`;
});

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('File has been updated with String.raw template literals');