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

// Load transactions from localStorage
function loadTransactions() {
    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
        
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
    }
}

// Save transactions to localStorage
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Add Transaction
function addTransaction() {
    const desc = document.getElementById('transaction-desc').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const category = document.getElementById('transaction-category').value;
    const type = document.getElementById('transaction-type').value;
    
    if (!desc || isNaN(amount) || !category) {
        alert('Please fill all fields with valid values');
        return;
    }

    const transaction = {
        id: Date.now(),
        desc,
        amount,
        category,
        type,
        date: new Date().toISOString()
    };

    transactions.push(transaction);
    
    if (type === 'income') {
        totalIncome += amount;
    } else {
        totalExpense += amount;
    }

    updateDashboard();
    renderTransactions();
    saveTransactions();
    
    // Clear form
    document.getElementById('transaction-desc').value = '';
    document.getElementById('transaction-amount').value = '';
    document.getElementById('transaction-category').value = '';
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
        
        transactionItem.innerHTML = `
            <div class="transaction-icon" style="background: ${iconColor};">${categoryIcons[transaction.category] || '💰'}</div>
            <div class="transaction-details">
                <div class="transaction-title">${transaction.desc}</div>
                <div class="transaction-category">${document.querySelector(`option[value="${transaction.category}"]`)?.textContent || transaction.category}</div>
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
    saveTransactions();
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
    
    // Update percentage changes
    document.querySelectorAll('.card-change').forEach(el => {
        if (el.classList.contains('change-positive')) {
            el.innerHTML = `↗ +${Math.floor(Math.random() * 20)}% from last month`;
        } else if (el.classList.contains('change-negative')) {
            el.innerHTML = `↘ +${Math.floor(Math.random() * 20)}% from last month`;
        }
    });
}

// Initialize the app
function initApp() {
    loadTheme();
    loadTransactions();
    
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

// Smooth scrolling for navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Update active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        
        // Simple page sections (in real app, this would route to different views)
        const section = this.textContent.toLowerCase();
        let targetElement;
        
        switch(section) {
            case 'dashboard':
                targetElement = document.querySelector('.dashboard-grid');
                break;
            case 'transactions':
                targetElement = document.querySelector('.transactions-section');
                break;
            case 'budget':
                targetElement = document.querySelector('.budget-progress');
                break;
            case 'reports':
                targetElement = document.querySelector('.charts-section');
                break;
        }
        
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Enhanced category selection with animations
document.getElementById('transaction-category').addEventListener('change', function() {
    const categoryIcon = this.options[this.selectedIndex].text.split(' ')[0];
    
    if (categoryIcon && categoryIcon !== 'Select') {
        // Create a floating icon animation
        const floatingIcon = document.createElement('div');
        floatingIcon.textContent = categoryIcon;
        floatingIcon.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            font-size: 3rem;
            pointer-events: none;
            z-index: 1000;
            animation: floatUp 1s ease-out forwards;
        `;
        
        document.body.appendChild(floatingIcon);
        
        setTimeout(() => {
            floatingIcon.remove();
        }, 1000);
    }
});

// Budget alerts
function checkBudgetAlerts() {
    const progressItems = document.querySelectorAll('.progress-item');
    progressItems.forEach(item => {
        const progressFill = item.querySelector('.progress-fill');
        const width = parseFloat(progressFill.style.width);
        
        if (width >= 100) {
            item.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                item.style.animation = '';
            }, 500);
        }
    });
}

// Call initApp when the page loads
window.addEventListener('load', initApp);

// Check budget alerts after initial render
setTimeout(checkBudgetAlerts, 2000);