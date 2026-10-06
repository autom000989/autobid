const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

const newStates = `  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [companyWallet, setCompanyWallet] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'users' | 'employees' | 'dashboard' | 'tickets' | 'appeals' | 'chatting' | 'withdrawals'>('dashboard');`;

code = code.replace(/  const \[activeTab, setActiveTab\] = useState.*?;/, newStates);

// Now in useEffect, add listeners for withdrawals and companyWallet
const oldEffectEnd = `        unsubscribeAppeals();
    };
  }, []);`;

const newEffectEnd = `        const unsubscribeWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snapshot) => {
            const wData: any[] = [];
            snapshot.forEach(d => wData.push({ id: d.id, ...d.data() }));
            setWithdrawals(wData);
        }, (err) => console.error("Withdrawals error:", err));
        
        const unsubscribeWallet = onSnapshot(doc(db, 'settings', 'company_wallet'), (snapshot) => {
            if (snapshot.exists()) {
                setCompanyWallet(snapshot.data().balance || 0);
            } else {
                setDoc(doc(db, 'settings', 'company_wallet'), { balance: 0 });
            }
        }, (err) => console.error("Wallet error:", err));

        unsubscribeAppeals();
        unsubscribeWithdrawals();
        unsubscribeWallet();
    };
  }, []);`;

code = code.replace(oldEffectEnd, newEffectEnd);
fs.writeFileSync('components/AdminPanel.tsx', code);
