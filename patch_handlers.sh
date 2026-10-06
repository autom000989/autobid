sed -i 's/setTickets(tData);\n    });/setTickets(tData);\n    }, (err) => console.error("Tickets error:", err));/g' components/AdminPanel.tsx
sed -i 's/setSupportChats(cData);\n    });/setSupportChats(cData);\n    }, (err) => console.error("Chats error:", err));/g' components/AdminPanel.tsx
sed -i 's/setAppeals(aData);\n    });/setAppeals(aData);\n    }, (err) => console.error("Appeals error:", err));/g' components/AdminPanel.tsx
