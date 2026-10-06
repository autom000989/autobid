const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/setDoc\(userDocRef, newUser\);\n           \}\n        \}\);/g, 'setDoc(userDocRef, newUser);\n           }\n        }, (err) => console.error("User fetch error:", err));');

code = code.replace(/setVehicles\(vehiclesData\.sort\(\(a, b\) => a\.endTime - b\.endTime\)\);\n      setIsLoading\(false\);\n    \}\);/g, 'setVehicles(vehiclesData.sort((a, b) => a.endTime - b.endTime));\n      setIsLoading(false);\n    }, (err) => console.error("Vehicles fetch error:", err));');

fs.writeFileSync('App.tsx', code);
