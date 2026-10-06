const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');
code = code.replace(/setTickets\(data\);\n         \}\);/g, 'setTickets(data);\n         }, (err) => console.error("Tickets fetch error:", err));');
fs.writeFileSync('components/Settings.tsx', code);
