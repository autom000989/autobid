const fs = require('fs');
let code = fs.readFileSync('components/HelpSupport.tsx', 'utf8');
code = code.replace(/setChat\(null\);\n        \}\n      \}\);/g, 'setChat(null);\n        }\n      }, (err) => console.error("Chat fetch error:", err));');
code = code.replace(/setTimeout\(\(\) \=\> messagesEndRef\.current\?\.scrollIntoView\(\{ behavior\: \'smooth\' \}\), 100\);\n      \}\);/g, 'setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: \'smooth\' }), 100);\n      }, (err) => console.error("Messages fetch error:", err));');
fs.writeFileSync('components/HelpSupport.tsx', code);
