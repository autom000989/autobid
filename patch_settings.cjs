const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');

code = code.replace(/const \[activeSection, setActiveSection\] = useState\<SettingsSection\>\(initialSection \|\| 'MENU'\);/, `const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection || 'MENU');

  useEffect(() => {
     if (initialSection) {
         setActiveSection(initialSection);
     } else {
         setActiveSection('MENU');
     }
  }, [initialSection]);`);

fs.writeFileSync('components/Settings.tsx', code);
