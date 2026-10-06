const fs = require('fs');
let code = fs.readFileSync('components/SearchUsers.tsx', 'utf8');

code = code.replace(/placeholder=\{searchMode === 'vehicles' \? "Search for make or model\.\.\." : t\.searchPlaceholder\}/, `placeholder={searchMode === 'vehicles' ? "Search for make or model..." : "Search profiles..."}`);

fs.writeFileSync('components/SearchUsers.tsx', code);
