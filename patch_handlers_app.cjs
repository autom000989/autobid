const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');
code = code.replace(/setCurrentUser\(null\);\n           \}\n        \}\);/g, 'setCurrentUser(null);\n           }\n        }, (err) => console.error("User fetch error:", err));');
fs.writeFileSync('App.tsx', code);
