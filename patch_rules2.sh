sed -i 's/function isEmployee() {/function isAccountant() {\n      return isAuthenticated() && getUserData().role == '"'"'accountant'"'"';\n    }\n    function isEmployee() {/g' firestore.rules

sed -i 's/isAdmin() || isFinance() || isSupport() || isEmployee() || isOwner(resource.data.userId)/isAdmin() || isFinance() || isAccountant() || isSupport() || isEmployee() || isOwner(resource.data.userId)/g' firestore.rules

sed -i 's/isAdmin() || isSupport() || isEmployee() || isOwner(resource.data.userId)/isAdmin() || isFinance() || isAccountant() || isSupport() || isEmployee() || isOwner(resource.data.userId)/g' firestore.rules
