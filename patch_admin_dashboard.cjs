const fs = require('fs');
let code = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

const oldDashboard = `<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
             <span className="text-gray-500 font-medium mb-2">Total Platform Deposits</span>
             <span className="text-5xl font-bold text-green-600">₹{totalDeposits.toLocaleString()}</span>
          </div>`;
          
const newDashboard = `<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
             <span className="text-gray-500 font-medium mb-2">Total User Deposits</span>
             <span className="text-5xl font-bold text-green-600">₹{totalDeposits.toLocaleString()}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
             <span className="text-gray-500 font-medium mb-2">Company Wallet</span>
             <span className="text-5xl font-bold text-indigo-600">₹{companyWallet.toLocaleString()}</span>
          </div>`;

code = code.replace(oldDashboard, newDashboard);
fs.writeFileSync('components/AdminPanel.tsx', code);
