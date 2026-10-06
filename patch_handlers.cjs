const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');
code = code.replace(/setTickets\(tData\);\n    \}\);/g, 'setTickets(tData);\n    }, (err) => console.error("Tickets error:", err));');
code = code.replace(/setSupportChats\(cData\);\n    \}\);/g, 'setSupportChats(cData);\n    }, (err) => console.error("Chats error:", err));');
code = code.replace(/setAppeals\(aData\);\n    \}\);/g, 'setAppeals(aData);\n    }, (err) => console.error("Appeals error:", err));');
fs.writeFileSync('components/AdminPanel.tsx', code);
