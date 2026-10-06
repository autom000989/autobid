const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

const injection = `  const [activeChat, setActiveChat] = useState<any>(null);
  const [chatFilterUser, setChatFilterUser] = useState<string | null>(null);
  const [activeChatMessages, setActiveChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
     if (activeChat) {
        const q = collection(db, 'support_chats', activeChat.id, 'messages');
        const unsub = onSnapshot(q, (snap) => {
           const msgs = [];
           snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
           msgs.sort((a,b) => a.timestamp - b.timestamp);
           setActiveChatMessages(msgs);
        }, (err) => console.error(err));
        return () => unsub();
     }
  }, [activeChat]);

  const [activeTab`;

code = code.replace(/  const \[activeTab/, injection);
fs.writeFileSync('components/AdminPanel.tsx', code);
