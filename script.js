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

// Budget settings
let budgetSettings = {
    food: 20000,
    transport: 10000,
    entertainment: 8000,
    shopping: 15000
};

// User accounts
let users = JSON.parse(localStorage.getItem('users')) || [];

// Load transactions from localStorage
function loadTransactions() {
    if (!currentUser) return;
    
    const userData = JSON.parse(localStorage.getItem(`user_${currentUser.email}`));
    if (userData) {
        transactions = userData.transactions || [];
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
        renderCalendar();
    }
}

// Save transactions to localStorage
function saveTransactions() {
    if (!currentUser) return;
    
    const userData = {
        ...currentUser,
        transactions: transactions,
        budgetSettings: budgetSettings
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
            income: '💰'
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
        shopping: { spent: 0, budget: budgetSettings.shopping }
    };

    // Calculate spent amounts per category
    transactions.forEach(transaction => {
        if (transaction.type === 'expense' && categories[transaction.category]) {
            categories[transaction.category].spent += transaction.amount;
        }
    });

    // Update each progress item
    document.querySelectorAll('.progress-item').forEach(item => {
        const category = item.querySelector('.progress-label').textContent.toLowerCase();
        const categoryKey = {
            'food & dining': 'food',
            'transportation': 'transport',
            'entertainment': 'entertainment',
            'shopping': 'shopping'
        }[category];

        if (categoryKey && categories[categoryKey]) {
            const { spent, budget } = categories[categoryKey];
            const percentage = Math.min(100, (spent / budget) * 100);
            
            const progressValue = item.querySelector('.progress-value');
            const progressFill = item.querySelector('.progress-fill');
            
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
    });
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

// Budget Settings
function openBudgetSettings() {
    document.getElementById('food-budget').value = budgetSettings.food;
    document.getElementById('transport-budget').value = budgetSettings.transport;
    document.getElementById('entertainment-budget').value = budgetSettings.entertainment;
    document.getElementById('shopping-budget').value = budgetSettings.shopping;
    document.getElementById('budget-settings-modal').style.display = 'flex';
}

function saveBudgetSettings() {
    budgetSettings = {
        food: parseFloat(document.getElementById('food-budget').value) || 20000,
        transport: parseFloat(document.getElementById('transport-budget').value) || 10000,
        entertainment: parseFloat(document.getElementById('entertainment-budget').value) || 8000,
        shopping: parseFloat(document.getElementById('shopping-budget').value) || 15000
    };
    
    updateBudgetProgress();
    saveTransactions();
    closeModal('budget-settings-modal');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
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
    
    // Set today's date as default in transaction form
    document.getElementById('transaction-date').valueAsDate = new Date();
    
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

document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

// Call initApp when the page loads
window.addEventListener('load', initApp);

// Check budget alerts after initial render
setTimeout(checkBudgetAlerts, 2000);