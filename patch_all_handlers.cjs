const fs = require('fs');

function patch(path, replacements) {
    let code = fs.readFileSync(path, 'utf8');
    for (let r of replacements) {
        code = code.replace(r[0], r[1]);
    }
    fs.writeFileSync(path, code);
}

// App.tsx
patch('App.tsx', [
    [/setCurrentUser\(null\);\n           \}\n        \}\);/g, 'setCurrentUser(null);\n           }\n        }, (err) => console.error(err));'],
    [/setVehicles\(vehiclesData\.sort\(\(a, b\) => a\.endTime - b\.endTime\)\);\n    \}\);/g, 'setVehicles(vehiclesData.sort((a, b) => a.endTime - b.endTime));\n    }, (err) => console.error(err));']
]);

// AdminPanel.tsx
patch('components/AdminPanel.tsx', [
    [/setActiveChatMessages\(msgs\);\n        \}, \(err\) => console\.error\(err\)\);/g, 'setActiveChatMessages(msgs);\n        }, (err) => console.error(err));'], // Already patched, just in case
    [/setIsLoading\(false\);\n    \}\);/g, 'setIsLoading(false);\n    }, (err) => console.error(err));'],
    [/setVehiclesCount\(counts\);\n    \}\);/g, 'setVehiclesCount(counts);\n    }, (err) => console.error(err));'],
    [/setTickets\(tData\);\n    \}\);/g, 'setTickets(tData);\n    }, (err) => console.error(err));'],
    [/setSupportChats\(cData\);\n    \}\);/g, 'setSupportChats(cData);\n    }, (err) => console.error(err));'],
    [/setAppeals\(aData\);\n    \}\);/g, 'setAppeals(aData);\n    }, (err) => console.error(err));']
]);

// HelpSupport.tsx
patch('components/HelpSupport.tsx', [
    [/setChat\(null\);\n        \}\n      \}\);/g, 'setChat(null);\n        }\n      }, (err) => console.error(err));'],
    [/setTimeout\(\(\) => messagesEndRef\.current\?\.scrollIntoView\(\{ behavior: 'smooth' \}\), 100\);\n      \}\);/g, "setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);\n      }, (err) => console.error(err));"]
]);

// Settings.tsx
patch('components/Settings.tsx', [
    [/setTickets\(data\);\n         \}\);/g, 'setTickets(data);\n         }, (err) => console.error(err));']
]);

console.log("Done patching handlers");
