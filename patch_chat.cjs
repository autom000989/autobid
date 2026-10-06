const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

const targetStr = `      ) : activeTab === 'appeals' ? (`;

const newStr = `      ) : activeTab === 'chatting' ? (
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
            <h2 className="text-xl font-bold mb-4">Live Support Chats</h2>
            {supportChats.length === 0 ? <p className="text-gray-500">No support chats found.</p> : (
               <div className="space-y-4">
                 {supportChats.map(c => (
                   <div key={c.id} className="border p-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => {
                      const msg = window.prompt("Reply to " + c.username + ":");
                      if (msg) {
                         // Quick reply via prompt for simplicity, real app would have full chat view
                         addDoc(collection(db, 'support_chats', c.id, 'messages'), {
                           chatId: c.id,
                           senderId: currentUser.id,
                           senderRole: currentUser.role || 'admin',
                           text: msg,
                           timestamp: Date.now()
                         });
                         updateDoc(doc(db, 'support_chats', c.id), {
                           updatedAt: Date.now(),
                           unreadCountUser: (c.unreadCountUser || 0) + 1,
                           unreadCountAdmin: 0
                         });
                      } else {
                         // if just clicking, clear unread
                         if (c.unreadCountAdmin > 0) {
                            updateDoc(doc(db, 'support_chats', c.id), { unreadCountAdmin: 0 });
                         }
                      }
                   }}>
                     <div>
                       <div className="flex gap-2 items-center mb-1">
                          <h3 className="font-bold text-gray-900">{c.username}</h3>
                          {c.unreadCountAdmin > 0 && <span className="w-2 h-2 bg-red-600 rounded-full"></span>}
                       </div>
                       <span className="text-xs text-gray-400 mt-2 block">User ID: {c.userId} | Last Updated: {new Date(c.updatedAt).toLocaleTimeString()}</span>
                     </div>
                     <div className="flex flex-col gap-2 items-end">
                       <span className={\`px-2 py-1 text-xs rounded font-bold \${c.status === 'open' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}\`}>{c.status.toUpperCase()}</span>
                       <button onClick={(e) => { e.stopPropagation(); updateDoc(doc(db, 'support_chats', c.id), { status: 'closed' }); }} className="text-xs text-red-600 hover:underline">Close Chat</button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
         </div>
      ) : activeTab === 'appeals' ? (`;

code = code.replace(targetStr, newStr);

// Also add addDoc to imports if missing
if (!code.includes('addDoc')) {
   code = code.replace('deleteDoc } from', 'deleteDoc, addDoc } from');
}

fs.writeFileSync('components/AdminPanel.tsx', code);
