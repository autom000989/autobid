const fs = require('fs');

function checkFile(path) {
    const code = fs.readFileSync(path, 'utf8');
    const matches = code.match(/onSnapshot\([^,]+,\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}(?!\s*,\s*\([^)]*\)\s*=>)/g);
    if (matches) {
        console.log("Missing handlers in", path);
        console.log(matches.map(m => m.substring(0, 50) + "..."));
    }
}

checkFile('App.tsx');
checkFile('components/HelpSupport.tsx');
checkFile('components/AdminPanel.tsx');
checkFile('components/Settings.tsx');
