const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');

const newWithdraw = `    const handleWithdraw = async () => {
       const val = parseInt(amount);
       if (!val || val <= 0) return alert("Please enter a valid amount.");
       if (val > (currentUser.deposits || 0)) return alert("Insufficient funds.");
       setIsWithdrawing(true);
       try {
           const { addDoc, collection } = require('firebase/firestore');
           await addDoc(collection(db, 'withdrawals'), {
               userId: currentUser.id,
               username: currentUser.username,
               amount: val,
               status: 'pending',
               createdAt: Date.now()
           });
           
           // Deduct funds immediately upon request (held in escrow essentially)
           await updateDoc(doc(db, 'users', currentUser.id), {
               deposits: (currentUser.deposits || 0) - val
           });
           setAmount('');
           alert(\`Withdrawal request for ₹\${val.toLocaleString()} submitted and pending admin approval.\`);
       } catch (err: any) {
           alert("Error requesting withdrawal: " + err.message);
       } finally {
           setIsWithdrawing(false);
       }
    };`;

code = code.replace(/const handleWithdraw = async \(\) => \{[\s\S]*?    \};/, newWithdraw);
fs.writeFileSync('components/Settings.tsx', code);
