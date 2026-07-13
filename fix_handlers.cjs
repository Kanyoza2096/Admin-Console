const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src/pages');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  const buttonRegex = /<(?:motion\.)?button([^>]*?)(\/?)>/g;
  content = content.replace(buttonRegex, (match, attrs, selfClose) => {
    if (/onClick=/.test(attrs) || /type="submit"/.test(attrs) || /type='submit'/.test(attrs) || /\{...props\}/.test(attrs) || /onSubmit=/.test(attrs)) {
      return match;
    }
    return match.replace(/>$/, ` onClick={() => alert('Feature coming soon')}>`);
  });
  
  // Actually, wait, selfClose:
  content = originalContent.replace(buttonRegex, (match, attrs, selfClose) => {
     if (/onClick=/.test(attrs) || /type="submit"/.test(attrs) || /type='submit'/.test(attrs) || /\{...props\}/.test(attrs) || /onSubmit=/.test(attrs)) {
       return match;
     }
     
     if (selfClose) {
         // match is `<button ... />`
         return match.replace(/\/>$/, ` onClick={() => alert('Feature coming soon')} />`);
     } else {
         // match is `<button ... >`
         return match.replace(/>$/, ` onClick={() => alert('Feature coming soon')}>`);
     }
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      fixFile(fullPath);
    }
  }
}

walkDir(directoryPath);
