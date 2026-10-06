const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

const newTab = `) : activeTab === 'withdrawals' ? (
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
            <h2 className="text-xl font-bold mb-4">Pending Withdrawals</h2>
            {withdrawals.filter(w => w.status === 'pending').length === 0 ? <p className="text-gray-500">No pending withdrawals.</p> : (
               <div className="space-y-4">
                 {withdrawals.filter(w => w.status === 'pending').map(w => (
                   <div key={w.id} className="border p-4 rounded-lg flex justify-between items-center">
                     <div>
                       <span className="font-bold text-gray-900 block">{w.username}</span>
                       <span className="text-xl text-green-600 font-bold block mt-1">₹{w.amount.toLocaleString()}</span>
                       <span className="text-xs text-gray-400 mt-2 block">User ID: {w.userId} | Requested: {new Date(w.createdAt).toLocaleDateString()}</span>
                     </div>
                     <div className="flex flex-col gap-2 items-end">
                       <button onClick={async () => {
                           try {
                               await updateDoc(doc(db, 'withdrawals', w.id), { status: 'approved' });
                               await updateDoc(doc(db, 'settings', 'company_wallet'), { balance: companyWallet - w.amount });
                           } catch (err: any) { alert("Error: " + err.message); }
                       }} className="text-xs bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">
                           Approve
                       </button>
                       <button onClick={async () => {
                           try {
                               // Refund user
                               const userRef = doc(db, 'users', w.userId);
                               const userSnap = await require('firebase/firestore').getDoc(userRef);
                               if (userSnap.exists()) {
                                   await updateDoc(userRef, { deposits: (userSnap.data().deposits || 0) + w.amount });
                               }
                               await updateDoc(doc(db, 'withdrawals', w.id), { status: 'rejected' });
                           } catch (err: any) { alert("Error: " + err.message); }
                       }} className="text-xs bg-red-100 text-red-600 px-4 py-2 rounded font-bold hover:bg-red-200">
                           Reject & Refund
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
            <h2 className="text-xl font-bold mt-8 mb-4">History</h2>
            {withdrawals.filter(w => w.status !== 'pending').length === 0 ? <p className="text-gray-500">No withdrawal history.</p> : (
               <div className="space-y-4 opacity-75">
                 {withdrawals.filter(w => w.status !== 'pending').sort((a,b)=>b.createdAt - a.createdAt).slice(0, 10).map(w => (
                   <div key={w.id} className="border p-4 rounded-lg flex justify-between items-center bg-gray-50">
                     <div>
                       <span className="font-bold text-gray-900 block">{w.username}</span>
                       <span className="text-lg text-gray-600 font-bold block mt-1">₹{w.amount.toLocaleString()}</span>
                       <span className="text-xs text-gray-400 mt-2 block">User ID: {w.userId} | Requested: {new Date(w.createdAt).toLocaleDateString()}</span>
                     </div>
                     <div>
                       <span className={\`px-3 py-1 text-xs rounded font-bold \${w.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}\`}>
                           {w.status.toUpperCase()}
                       </span>
                     </div>
                   </div>
                 ))}
               </div>
            )}
         </div>
      ) : null}
    </div>
  );
};`;

code = code.replace(/\) \: null\}\n    <\/div>\n  \);\n\};\s*$/, newTab);
fs.writeFileSync('components/AdminPanel.tsx', code);
