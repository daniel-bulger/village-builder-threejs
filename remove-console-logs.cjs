#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Count of removed logs for reporting
let totalRemoved = 0;
const fileStats = {};

// Function to remove console.log statements from a file
function removeConsoleLogs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  let removedCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip lines that are just console.log
    if (line.trim().startsWith('console.log(')) {
      // Check if it's a multi-line console.log
      let parenCount = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
      let j = i;
      
      while (parenCount > 0 && j < lines.length - 1) {
        j++;
        parenCount += (lines[j].match(/\(/g) || []).length - (lines[j].match(/\)/g) || []).length;
      }
      
      // Skip all lines that are part of this console.log
      removedCount += (j - i + 1);
      i = j;
      continue;
    }
    
    // Keep the line
    newLines.push(line);
  }
  
  if (removedCount > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    fileStats[filePath] = removedCount;
    totalRemoved += removedCount;
    return true;
  }
  
  return false;
}

// Function to recursively find all TypeScript files
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git
      if (item !== 'node_modules' && item !== '.git' && item !== 'dist' && item !== 'build') {
        findTsFiles(fullPath, files);
      }
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main execution
console.log('Removing console.log statements from TypeScript files...\n');

const srcDir = path.join(__dirname, 'src');
const files = findTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files to process.\n`);

let modifiedCount = 0;
for (const file of files) {
  if (removeConsoleLogs(file)) {
    modifiedCount++;
  }
}

console.log('\n=== Summary ===');
console.log(`Total files processed: ${files.length}`);
console.log(`Files modified: ${modifiedCount}`);
console.log(`Total console.log lines removed: ${totalRemoved}`);

if (modifiedCount > 0) {
  console.log('\n=== Modified Files ===');
  for (const [file, count] of Object.entries(fileStats)) {
    const relativePath = path.relative(__dirname, file);
    console.log(`  ${relativePath}: ${count} lines removed`);
  }
}

console.log('\nDone!');