const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

const startIdx = code.indexOf(") : activeTab === 'chatting' ? (");
const endIdx = code.indexOf(") : activeTab === 'appeals' ? (");

if (startIdx !== -1 && endIdx !== -1) {
    const oldChatTab = code.substring(startIdx, endIdx);
    const newChatTab = `) : activeTab === 'chatting' ? (
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                   {activeChat ? \`Chat with \${activeChat.username}\` : chatFilterUser ? 'User Support Chats' : 'Live Support Chats'}
                </h2>
                {(activeChat || chatFilterUser) && (
                   <button onClick={() => { activeChat ? setActiveChat(null) : setChatFilterUser(null); }} className="text-gray-500 hover:text-gray-900">
                      &larr; Back
                   </button>
                )}
            </div>
            {activeChat ? (
                <div className="flex flex-col h-[500px]">
                   <div className="flex-1 overflow-y-auto p-4 bg-gray-50 border rounded-t-lg space-y-4 flex flex-col">
                      {activeChatMessages.map(m => (
                          <div key={m.id} className={\`flex \${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}\`}>
                              <div className={\`max-w-[70%] p-3 rounded-2xl \${m.senderId === currentUser.id ? 'bg-red-600 text-white rounded-tr-none' : 'bg-gray-200 text-gray-900 rounded-tl-none'}\`}>
                                 <div className="text-xs opacity-75 mb-1">{m.senderRole}</div>
                                 <p className="text-sm">{m.text}</p>
                              </div>
                          </div>
                      ))}
                   </div>
                   {activeChat.status !== 'closed' ? (
                   <form onSubmit={(e) => {
                       e.preventDefault();
                       if (!chatInput.trim()) return;
                       addDoc(collection(db, 'support_chats', activeChat.id, 'messages'), {
                           chatId: activeChat.id,
                           senderId: currentUser.id,
                           senderRole: currentUser.role || 'admin',
                           text: chatInput,
                           timestamp: Date.now()
                       });
                       updateDoc(doc(db, 'support_chats', activeChat.id), {
                           updatedAt: Date.now(),
                           unreadCountUser: (activeChat.unreadCountUser || 0) + 1,
                           unreadCountAdmin: 0
                       });
                       setChatInput('');
                   }} className="flex gap-2 p-4 border border-t-0 rounded-b-lg">
                       <input value={chatInput} onChange={e => setChatInput(e.target.value)} type="text" placeholder="Type message..." className="flex-1 border rounded-lg px-4 py-2" />
                       <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold">Send</button>
                   </form>
                   ) : (
                      <div className="p-4 border border-t-0 rounded-b-lg bg-gray-100 text-center text-gray-500">This chat is closed.</div>
                   )}
                </div>
            ) : (
               supportChats.filter(c => chatFilterUser ? c.userId === chatFilterUser : true).length === 0 ? <p className="text-gray-500">No support chats found.</p> : (
               <div className="space-y-4">
                 {supportChats.filter(c => chatFilterUser ? c.userId === chatFilterUser : true).map(c => (
                   <div key={c.id} className="border p-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => {
                       setActiveChat(c);
                       if (c.unreadCountAdmin > 0) {
                           updateDoc(doc(db, 'support_chats', c.id), { unreadCountAdmin: 0 });
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
                       {c.status !== 'closed' && <button onClick={(e) => { e.stopPropagation(); updateDoc(doc(db, 'support_chats', c.id), { status: 'closed' }); }} className="text-xs text-red-600 hover:underline">Close Chat</button>}
                     </div>
                   </div>
                 ))}
               </div>
               )
            )}
         </div>
      `;
    code = code.replace(oldChatTab, newChatTab);
    fs.writeFileSync('components/AdminPanel.tsx', code);
    console.log("Success");
} else {
    console.error("Could not find blocks");
}
