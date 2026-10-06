const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

const navItem = `<button 
                onClick={() => { setActiveTab('appeals'); setSelectedUser(null); }} 
                className={\`px-4 py-2 rounded-lg font-medium transition-colors \${activeTab === 'appeals' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}\`}
            >
                Appeals
            </button>`;
const newNavItem = navItem + `
            <button 
                onClick={() => { setActiveTab('withdrawals'); setSelectedUser(null); }} 
                className={\`px-4 py-2 rounded-lg font-medium transition-colors \${activeTab === 'withdrawals' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}\`}
            >
                Withdrawals
                {withdrawals.filter(w => w.status === 'pending').length > 0 && (
                    <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{withdrawals.filter(w => w.status === 'pending').length}</span>
                )}
            </button>`;

// Actually need to regex match since the spaces might differ
code = code.replace(/<button \n                onClick=\{\(\) => \{ setActiveTab\('appeals'\); setSelectedUser\(null\); \}\} \n                className=\{\`px-4 py-2 rounded-lg font-medium transition-colors \$\{activeTab === 'appeals' \? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'\}\`\}\n            >\n                Appeals\n            <\/button>/, newNavItem);

fs.writeFileSync('components/AdminPanel.tsx', code);
