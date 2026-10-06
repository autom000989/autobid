const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

const targetStr = `      ) : activeTab === 'appeals' ? (
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
            <h2 className="text-xl font-bold mb-4">Account Appeals</h2>
            {appeals.length === 0 ? <p className="text-gray-500">No appeals found.</p> : (
               <div className="space-y-4">
                 {appeals.map(a => (
                   <div key={a.id} className="border p-4 rounded-lg flex justify-between items-center">
                     <div>
                       <p className="text-sm text-gray-900 font-medium">"{a.reason}"</p>
                       <span className="text-xs text-gray-400 mt-2 block">User ID: {a.userId} | Created: {new Date(a.createdAt).toLocaleDateString()}</span>
                     </div>
                     <div className="flex flex-col gap-2 items-end">
                       <span className={\`px-2 py-1 text-xs rounded font-bold \${a.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}\`}>{a.status.toUpperCase()}</span>
                       {a.status === 'pending' && (
                         <button onClick={() => handleUpdateAppeal(a.id, 'resolved')} className="text-xs bg-green-600 text-white px-3 py-1 rounded">Mark Resolved</button>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
            )}
         </div>`;

const newStr = `      ) : activeTab === 'appeals' ? (
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
            <h2 className="text-xl font-bold mb-4">Account & Verification Appeals</h2>
            {appeals.length === 0 ? <p className="text-gray-500">No appeals found.</p> : (
               <div className="space-y-4">
                 {appeals.map(a => (
                   <div key={a.id} className="border p-4 rounded-lg flex justify-between items-center">
                     <div>
                       <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mr-2">{a.type === 'verification' ? 'Verification' : 'Suspension'}</span>
                       <p className="text-sm text-gray-900 font-medium mt-1">"{a.reason}"</p>
                       {a.type === 'verification' && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                             <p><strong>Email:</strong> {a.email}</p>
                             <p><strong>Phone:</strong> {a.phone}</p>
                             <p><strong>Documents:</strong> {a.documents}</p>
                          </div>
                       )}
                       <span className="text-xs text-gray-400 mt-2 block">User ID: {a.userId} | Created: {new Date(a.createdAt).toLocaleDateString()}</span>
                     </div>
                     <div className="flex flex-col gap-2 items-end">
                       <span className={\`px-2 py-1 text-xs rounded font-bold \${a.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}\`}>{a.status.toUpperCase()}</span>
                       {a.status === 'pending' && (
                         <button onClick={() => handleUpdateAppeal(a.id, 'resolved', a.type === 'verification', a.userId)} className="text-xs bg-green-600 text-white px-3 py-1 rounded">
                           {a.type === 'verification' ? 'Approve Verification' : 'Mark Resolved'}
                         </button>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
            )}
         </div>`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('components/AdminPanel.tsx', code);
