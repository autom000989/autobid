const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

const newHandler = `  const handleUpdateDeposit = async (user: User, type: 'add' | 'deduct') => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'finance') {
        alert("Only admin and finance roles can modify deposits.");
        return;
    }
    
    const amountStr = window.prompt(\`Enter amount to \${type} \${type === 'add' ? 'to' : 'from'} \${user.username}'s account:\`, "0");
    if (amountStr === null) return;
    
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert("Invalid amount. Must be a positive number.");
        return;
    }
    
    try {
        let newDeposits = user.deposits || 0;
        let newCompanyWallet = companyWallet;

        if (type === 'add') {
            newDeposits += amount;
            newCompanyWallet -= amount;
        } else {
            if (amount > newDeposits) {
                return alert("Insufficient user funds to deduct.");
            }
            newDeposits -= amount;
            newCompanyWallet += amount;
        }

        await updateDoc(doc(db, 'users', user.id), { deposits: newDeposits });
        await updateDoc(doc(db, 'settings', 'company_wallet'), { balance: newCompanyWallet });
        alert(\`Deposits \${type === 'add' ? 'added' : 'deducted'} successfully.\`);
    } catch (err: any) {
        alert("Error updating deposits: " + err.message);
    }
  };`;

code = code.replace(/  const handleUpdateDeposit = async \(user: User\) => \{[\s\S]*?  \};/, newHandler);

// update UI
const uiOld = `<button onClick={() => handleUpdateDeposit(user)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm w-full mb-2 hover:bg-green-700 transition-colors">
                      Manage Deposits
                   </button>`;
const uiNew = `<div className="flex gap-2 mb-2">
                      <button onClick={() => handleUpdateDeposit(user, 'add')} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm flex-1 hover:bg-green-700 transition-colors">
                          Add Funds
                      </button>
                      <button onClick={() => handleUpdateDeposit(user, 'deduct')} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm flex-1 hover:bg-red-700 transition-colors">
                          Minus Funds
                      </button>
                   </div>`;
code = code.replace(uiOld, uiNew);

fs.writeFileSync('components/AdminPanel.tsx', code);
