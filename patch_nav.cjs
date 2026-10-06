const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/  const navigate = \(view: string\) => {[\s\S]*?    handleViewChange\(view as ViewState\);\n  };/, `  const navigate = (view: string) => {
    if (view === 'wallet') {
        setSettingsSection('WALLET');
        handleViewChange('settings');
        return;
    }
    if (view === 'settings') {
        setSettingsSection('MENU');
    }
    if (view === 'profile') {
        setProfileUser(currentUser);
    }
    handleViewChange(view as ViewState);
  };`);

code = code.replace(/activePage=\{settingsSection === 'WALLET' \? 'wallet' : currentView\}/g, `activePage={currentView === 'settings' && settingsSection === 'WALLET' ? 'wallet' : currentView}`);

fs.writeFileSync('App.tsx', code);
