sed -i 's/const \[appeals, setAppeals\] = useState<any\[\]>(\[\]);/const [appeals, setAppeals] = useState<any[]>([]);\n  const [supportChats, setSupportChats] = useState<any[]>([]);/g' components/AdminPanel.tsx

sed -i 's/const \[activeTab, setActiveTab\] = useState<'"'"'users'"'"' | '"'"'dashboard'"'"' | '"'"'tickets'"'"' | '"'"'appeals'"'"'>('"'"'dashboard'"'"');/const [activeTab, setActiveTab] = useState<'"'"'users'"'"' | '"'"'dashboard'"'"' | '"'"'tickets'"'"' | '"'"'appeals'"'"' | '"'"'chatting'"'"'>('"'"'dashboard'"'"');/g' components/AdminPanel.tsx

sed -i '/const appealsCol = collection(db, '"'"'appeals'"'"');/i \    const chatsCol = collection(db, '"'"'support_chats'"'"');\n    const unsubscribeChats = onSnapshot(chatsCol, (snapshot) => {\n        const cData: any[] = [];\n        snapshot.forEach(d => cData.push({ id: d.id, ...d.data() }));\n        setSupportChats(cData);\n    });\n' components/AdminPanel.tsx

sed -i '/unsubscribeAppeals();/i \        unsubscribeChats();\n' components/AdminPanel.tsx
