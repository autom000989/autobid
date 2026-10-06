const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

const oldStats = `<div className="p-4 bg-gray-50 rounded-lg">
                    <span className="block text-sm text-gray-500 mb-1">Support Chats</span>`;

const newStats = `<div className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => { setActiveTab('chatting'); setChatFilterUser(selectedUser.id); setActiveChat(null); }}>
                    <span className="block text-sm text-blue-600 underline mb-1">Support Chats</span>`;

code = code.replace(oldStats, newStats);
fs.writeFileSync('components/AdminPanel.tsx', code);
