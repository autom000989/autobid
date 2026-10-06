const fs = require('fs');
let code = fs.readFileSync('components/Navbar.tsx', 'utf8');
code = code.replace(/<button\s*<button/g, '<button');
fs.writeFileSync('components/Navbar.tsx', code);
