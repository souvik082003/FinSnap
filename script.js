// Theme Toggle
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Dark';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Light';
        localStorage.setItem('theme', 'dark');
    }
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        document.getElementById('theme-icon').textContent = '☀️';
        document.getElementById('theme-text').textContent = 'Light';
    }
}

// Store transactions data
let transactions = [];
let totalIncome = 0;
let totalExpense = 0;
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let creditCardBills = [];

// Budget settings
let budgetSettings = {
    food: 20000,
    transport: 10000,
    entertainment: 8000,
    shopping: 15000,
    bills: 12000,
    health: 5000,
    education: 5000,
    savings: 10000
};

// User accounts
let users = JSON.parse(localStorage.getItem('users')) || [];

// Google Sign-In
function onGoogleSignIn(googleUser) {
    const profile = googleUser.getBasicProfile();
    const email = profile.getEmail();
    const name = profile.getName();
    
    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    
    if (existingUser) {
        loginUser(email, existingUser.password); // Password won't be used
    } else {
        // Register new user with dummy password
        registerUser(name, email, 'google-oauth-' + Date.now());
    }
}

function signOut() {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(() => {
        logoutUser();
    });
}

// Toggle password visibility
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = field.nextElementSibling.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Load transactions from localStorage
function loadTransactions() {
    if (!currentUser) return;
    
    const userData = JSON.parse(localStorage.getItem(`user_${currentUser.email}`));
    if (userData) {
        transactions = userData.transactions || [];
        creditCardBills = userData.creditCardBills || [];
        budgetSettings = userData.budgetSettings || budgetSettings;
        
        // Calculate totals
        totalIncome = 0;
        totalExpense = 0;
        transactions.forEach(transaction => {
            if (transaction.type === 'income') {
                totalIncome += transaction.amount;
            } else {
                totalExpense += transaction.amount;
            }
        });
        
        updateDashboard();
        renderTransactions();
        renderCreditCardBills();
    }
}

// Save transactions to localStorage
function saveTransactions() {
    if (!currentUser) return;
    
    const userData = {
        ...currentUser,
        transactions,
        creditCardBills,
        budgetSettings
    };
    
    localStorage.setItem(`user_${currentUser.email}`, JSON.stringify(userData));
}

// Add Transaction
function addTransaction() {
    if (!currentUser) {
        alert('Please login to add transactions');
        return;
    }
    
    const desc = document.getElementById('transaction-desc').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const category = document.getElementById('transaction-category').value;
    const type = document.getElementById('transaction-type').value;
    let date = document.getElementById('transaction-date').value;
    
    if (!desc || isNaN(amount) || !category) {
        alert('Please fill all fields with valid values');
        return;
    }
    
    if (!date) {
        date = new Date().toISOString().split('T')[0];
    }

    const transaction = {
        id: Date.now(),
        desc,
        amount,
        category,
        type,
        date: date
    };

    transactions.push(transaction);
    
    if (type === 'income') {
        totalIncome += amount;
    } else {
        totalExpense += amount;
    }

    updateDashboard();
    renderTransactions();
    renderCalendar();
    saveTransactions();
    checkBudgetAlerts();
    
    // Clear form
    document.getElementById('transaction-desc').value = '';
    document.getElementById('transaction-amount').value = '';
    document.getElementById('transaction-category').value = '';
    document.getElementById('transaction-date').value = '';
}

// Render Transactions
function renderTransactions() {
    const transactionsList = document.getElementById('transactions-list');
    transactionsList.innerHTML = '';
    
    // Sort by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTransactions.forEach(transaction => {
        const categoryIcons = {
            food: '🍕',
            transport: '🚗',
            shopping: '🛍️',
            entertainment: '🎬',
            bills: '💡',
            health: '🏥',
            education: '📚',
            savings: '💰',
            income: '💵'
        };

        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item fade-in';
        transactionItem.dataset.id = transaction.id;
        
        const iconColor = transaction.type === 'income' ? 
            'linear-gradient(135deg, #06d6a0, #0891b2)' : 
            'linear-gradient(135deg, #ef4444, #dc2626)';
        
        const amountClass = transaction.type === 'income' ? 'amount-positive' : 'amount-negative';
        const amountPrefix = transaction.type === 'income' ? '+' : '-';
        const transactionDate = new Date(transaction.date);
        const formattedDate = transactionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        transactionItem.innerHTML = `
            <div class="transaction-icon" style="background: ${iconColor};">${categoryIcons[transaction.category] || '💰'}</div>
            <div class="transaction-details">
                <div class="transaction-title">${transaction.desc}</div>
                <div class="transaction-meta">
                    <span class="transaction-category">${document.querySelector(`option[value="${transaction.category}"]`)?.textContent || transaction.category}</span>
                    <span class="transaction-date">${formattedDate}</span>
                </div>
            </div>
            <div class="transaction-amount ${amountClass}">${amountPrefix}₹${transaction.amount.toFixed(2)}</div>
            <div class="transaction-delete" onclick="deleteTransaction(${transaction.id})">🗑️</div>
        `;
        
        transactionsList.appendChild(transactionItem);
    });
}

// Delete Transaction
function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }
    
    const transactionIndex = transactions.findIndex(t => t.id === id);
    if (transactionIndex === -1) return;
    
    const transaction = transactions[transactionIndex];
    
    if (transaction.type === 'income') {
        totalIncome -= transaction.amount;
    } else {
        totalExpense -= transaction.amount;
    }
    
    transactions.splice(transactionIndex, 1);
    updateDashboard();
    renderTransactions();
    renderCalendar();
    saveTransactions();
    checkBudgetAlerts();
}

// Update Dashboard
function updateDashboard() {
    const expenseEl = document.getElementById('expense-value');
    const balanceEl = document.getElementById('balance-value');
    const budgetEl = document.getElementById('budget-value');
    
    const newBalance = totalIncome - totalExpense;
    const budgetPercentage = totalIncome > 0 ? Math.min(100, (totalExpense / totalIncome) * 100) : 0;
    
    expenseEl.textContent = `₹${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    balanceEl.textContent = `₹${newBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    budgetEl.textContent = `${Math.round(budgetPercentage)}%`;
    
    updateBudgetProgress();
    
    // Update percentage changes
    document.querySelectorAll('.card-change').forEach(el => {
        if (el.classList.contains('change-positive')) {
            el.innerHTML = `↗ +${Math.floor(Math.random() * 20)}% from last month`;
        } else if (el.classList.contains('change-negative')) {
            el.innerHTML = `↘ +${Math.floor(Math.random() * 20)}% from last month`;
        }
    });
}

// Update Budget Progress
function updateBudgetProgress() {
    const categories = {
        food: { spent: 0, budget: budgetSettings.food },
        transport: { spent: 0, budget: budgetSettings.transport },
        entertainment: { spent: 0, budget: budgetSettings.entertainment },
        shopping: { spent: 0, budget: budgetSettings.shopping },
        bills: { spent: 0, budget: budgetSettings.bills },
        health: { spent: 0, budget: budgetSettings.health },
        education: { spent: 0, budget: budgetSettings.education },
        savings: { spent: 0, budget: budgetSettings.savings }
    };

    // Calculate spent amounts per category
    transactions.forEach(transaction => {
        if (transaction.type === 'expense' && categories[transaction.category]) {
            categories[transaction.category].spent += transaction.amount;
        }
    });

    // Update each progress item
    for (const [category, data] of Object.entries(categories)) {
        const { spent, budget } = data;
        const percentage = Math.min(100, (spent / budget) * 100);
        
        const progressValue = document.getElementById(`${category}-progress`);
        const progressFill = document.getElementById(`${category}-fill`);
        
        if (progressValue && progressFill) {
            progressValue.textContent = `₹${spent.toFixed(2)} / ₹${budget.toFixed(2)}`;
            progressFill.style.width = `${percentage}%`;
            
            // Update color based on percentage
            if (percentage >= 90) {
                progressFill.className = 'progress-fill progress-danger';
            } else if (percentage >= 70) {
                progressFill.className = 'progress-fill progress-warning';
            } else {
                progressFill.className = 'progress-fill progress-safe';
            }
        }
    }
}

// Check Budget Alerts
function checkBudgetAlerts() {
    document.querySelectorAll('.progress-item').forEach(item => {
        const progressFill = item.querySelector('.progress-fill');
        const width = parseFloat(progressFill.style.width) || 0;
        
        if (width >= 90) {
            item.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                item.style.animation = '';
            }, 500);
            
            // Show alert only once when crossing 90%
            if (width >= 90 && width - parseFloat(progressFill.dataset.lastWidth || 0) > 5) {
                const category = item.querySelector('.progress-label').textContent;
                alert(`Warning: You've used ${Math.round(width)}% of your ${category} budget!`);
            }
        }
        progressFill.dataset.lastWidth = width;
    });
}

// Credit Card Bill Functions
function addCreditCardBill() {
    const name = document.getElementById('card-name').value;
    const amount = parseFloat(document.getElementById('card-amount').value);
    const dueDate = document.getElementById('card-due-date').value;
    const status = document.getElementById('card-status').value;

    if (!name || isNaN(amount) || !dueDate) {
        alert('Please fill all required fields');
        return;
    }

    const bill = {
        id: Date.now(),
        name,
        amount,
        dueDate,
        status,
        paidDate: status === 'paid' ? new Date().toISOString().split('T')[0] : null
    };

    creditCardBills.push(bill);
    saveTransactions();
    renderCreditCardBills();
    
    // Clear form
    document.getElementById('card-name').value = '';
    document.getElementById('card-amount').value = '';
    document.getElementById('card-due-date').value = '';
    document.getElementById('card-status').value = 'unpaid';
}

function renderCreditCardBills() {
    const billsList = document.getElementById('bills-list');
    billsList.innerHTML = '';

    // Sort by due date (soonest first)
    const sortedBills = [...creditCardBills].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    sortedBills.forEach(bill => {
        const billElement = document.createElement('div');
        billElement.className = `credit-card-bill ${bill.status === 'paid' ? 'paid' : ''}`;
        billElement.dataset.id = bill.id;
        
        // Check if overdue
        const today = new Date();
        const dueDate = new Date(bill.dueDate);
        const isOverdue = dueDate < today && bill.status !== 'paid';
        
        if (isOverdue) {
            billElement.classList.add('overdue');
        }
        
        billElement.innerHTML = `
            <div class="bill-info">
                <h4>${bill.name}</h4>
                <div class="bill-meta">
                    <span>₹${bill.amount.toFixed(2)}</span>
                    <span>Due: ${new Date(bill.dueDate).toLocaleDateString()}</span>
                    ${bill.status === 'paid' ? `<span>Paid on: ${new Date(bill.paidDate).toLocaleDateString()}</span>` : ''}
                </div>
            </div>
            <div class="bill-actions">
                ${bill.status === 'unpaid' ? 
                    `<button class="btn mark-paid" onclick="markBillAsPaid(${bill.id})">
                        <i class="fas fa-check"></i> Mark Paid
                    </button>` : ''}
                <button class="btn delete-bill" onclick="deleteBill(${bill.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        billsList.appendChild(billElement);
    });
}

function markBillAsPaid(id) {
    const bill = creditCardBills.find(b => b.id === id);
    if (bill) {
        bill.status = 'paid';
        bill.paidDate = new Date().toISOString().split('T')[0];
        saveTransactions();
        renderCreditCardBills();
        
        // Optional: Add as expense transaction
        if (confirm('Add this payment as an expense transaction?')) {
            const transaction = {
                id: Date.now(),
                desc: `Credit Card Payment: ${bill.name}`,
                amount: bill.amount,
                category: 'bills',
                type: 'expense',
                date: bill.paidDate
            };
            
            transactions.push(transaction);
            totalExpense += bill.amount;
            updateDashboard();
            renderTransactions();
            saveTransactions();
        }
    }
}

function deleteBill(id) {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    creditCardBills = creditCardBills.filter(b => b.id !== id);
    saveTransactions();
    renderCreditCardBills();
}

// Budget Settings
function openBudgetSettings() {
    document.getElementById('food-budget').value = budgetSettings.food;
    document.getElementById('transport-budget').value = budgetSettings.transport;
    document.getElementById('entertainment-budget').value = budgetSettings.entertainment;
    document.getElementById('shopping-budget').value = budgetSettings.shopping;
    document.getElementById('bills-budget').value = budgetSettings.bills;
    document.getElementById('health-budget').value = budgetSettings.health || 5000;
    document.getElementById('education-budget').value = budgetSettings.education || 5000;
    document.getElementById('savings-budget').value = budgetSettings.savings || 10000;
    document.getElementById('budget-settings-modal').style.display = 'flex';
}

function saveBudgetSettings() {
    budgetSettings = {
        food: parseFloat(document.getElementById('food-budget').value) || 20000,
        transport: parseFloat(document.getElementById('transport-budget').value) || 10000,
        entertainment: parseFloat(document.getElementById('entertainment-budget').value) || 8000,
        shopping: parseFloat(document.getElementById('shopping-budget').value) || 15000,
        bills: parseFloat(document.getElementById('bills-budget').value) || 12000,
        health: parseFloat(document.getElementById('health-budget').value) || 5000,
        education: parseFloat(document.getElementById('education-budget').value) || 5000,
        savings: parseFloat(document.getElementById('savings-budget').value) || 10000
    };
    
    updateBudgetProgress();
    saveTransactions();
    closeModal('budget-settings-modal');
    alert('Budget settings saved successfully');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Profile functions
function openProfile() {
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-password').value = '';
    document.getElementById('profile-modal').style.display = 'flex';
}

function saveProfile() {
    const name = document.getElementById('profile-name').value;
    const password = document.getElementById('profile-password').value;
    
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    // Update current user
    currentUser.name = name;
    if (password) {
        currentUser.password = password;
    }
    
    // Update in users array
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // Update UI
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-avatar').textContent = name.charAt(0).toUpperCase();
    
    saveTransactions();
    closeModal('profile-modal');
    alert('Profile updated successfully');
}

// Calendar Functions
function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearDisplay = document.getElementById('current-month');
    
    // Set month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Clear previous calendar
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Get first day of month and total days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTransactions = transactions.filter(t => t.date === dateStr);
        const totalAmount = dayTransactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // Check if today
        if (currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate()) {
            dayElement.classList.add('today');
        }
        
        // Check if has transactions
        if (dayTransactions.length > 0) {
            dayElement.classList.add('has-transactions');
        }
        
        dayElement.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            <div class="calendar-day-amount">₹${Math.abs(totalAmount).toFixed(0)}</div>
        `;
        
        // Add click event to show transactions for this day
        dayElement.addEventListener('click', () => {
            showDayTransactions(dateStr, dayTransactions);
        });
        
        calendarGrid.appendChild(dayElement);
    }
    
    // Fill remaining cells (next month)
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    
    for (let i = 0; i < remainingCells; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }
}

function changeMonth(offset) {
    currentMonth += offset;
    
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    
    renderCalendar();
}

// User Authentication
function loginUser(email, password) {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        
        // Update user info in header
        document.getElementById('user-name').textContent = user.name;
        document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();
        
        loadTransactions();
        return true;
    }
    return false;
}

function registerUser(name, email, password) {
    // Check if user already exists
    if (users.some(u => u.email === email)) {
        return false;
    }
    
    const newUser = {
        name,
        email,
        password,
        transactions: [],
        creditCardBills: [],
        budgetSettings: { ...budgetSettings }
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Automatically login the new user
    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    
    // Update user info in header
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-avatar').textContent = name.charAt(0).toUpperCase();
    
    return true;
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-container').style.display = 'none';
    
    // Sign out from Google if signed in
    if (typeof gapi !== 'undefined' && gapi.auth2) {
        const auth2 = gapi.auth2.getAuthInstance();
        auth2.signOut();
    }
}

// Initialize the app
function initApp() {
    loadTheme();
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        
        // Update user info in header
        document.getElementById('user-name').textContent = currentUser.name;
        document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
        
        loadTransactions();
    } else {
        document.getElementById('login-modal').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
    
    // Set default dates
    document.getElementById('transaction-date').valueAsDate = new Date();
    document.getElementById('card-due-date').valueAsDate = new Date();
    
    // Initialize animations
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Animate bar charts
    setTimeout(() => {
        const bars = document.querySelectorAll('.bar');
        bars.forEach((bar, index) => {
            bar.style.height = `${20 + Math.random() * 80}%`;
        });
    }, 500);
}

// Event Listeners
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (loginUser(email, password)) {
        // Success
    } else {
        alert('Invalid email or password');
    }
});

document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (registerUser(name, email, password)) {
        // Success
    } else {
        alert('Email already registered');
    }
});

document.getElementById('show-register').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-container').style.display = 'block';
});

document.getElementById('show-login').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-container').style.display = 'none';
});

document.getElementById('logout-link').addEventListener('click', function(e) {
    e.preventDefault();
    logoutUser();
});

document.getElementById('settings-link').addEventListener('click', function(e) {
    e.preventDefault();
    openBudgetSettings();
});

document.getElementById('profile-link').addEventListener('click', function(e) {
    e.preventDefault();
    openProfile();
});

document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

// Initialize the app
window.addEventListener('load', initApp);

// Check budget alerts after initial render
setTimeout(checkBudgetAlerts, 2000);