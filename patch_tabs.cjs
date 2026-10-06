const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

// replace activeTab type
code = code.replace(/activeTab, setActiveTab\] = useState\<'users' \| 'dashboard' \| 'tickets' \| 'appeals' \| 'chatting'\>/g, "activeTab, setActiveTab] = useState<'users' | 'employees' | 'dashboard' | 'tickets' | 'appeals' | 'chatting'>");

// replace the tab button
code = code.replace(/onClick=\{\(\) \=\> \{ setActiveTab\('users'\); setSelectedUser\(null\); \}\} \n                className=\{\`px-4 py-2 rounded-lg font-medium transition-colors \$\{activeTab === 'users' \? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'\}\`\}\n            \>\n                Users \& Employees\n            \<\/button\>/, `onClick={() => { setActiveTab('users'); setSelectedUser(null); }} 
                className={\`px-4 py-2 rounded-lg font-medium transition-colors \${activeTab === 'users' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}\`}
            >
                Users
            </button>
            <button 
                onClick={() => { setActiveTab('employees'); setSelectedUser(null); }} 
                className={\`px-4 py-2 rounded-lg font-medium transition-colors \${activeTab === 'employees' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}\`}
            >
                Employees
            </button>`);

// Add employees tab handler in the render
// We'll replace `activeTab === 'users' ? (` with a check that works for both but filters differently
code = code.replace(/\) \: activeTab === 'users' \? \(/g, `) : activeTab === 'users' || activeTab === 'employees' ? (`);

// And we filter the list being mapped:
// find where `filteredUsers.map` is
code = code.replace(/\{filteredUsers.map\(user \=\> \(/g, `{filteredUsers.filter(u => activeTab === 'users' ? (!u.role || u.role === 'user') : (u.role && u.role !== 'user')).map(user => (`);

fs.writeFileSync('components/AdminPanel.tsx', code);
