// script.js (final cleaned & Firestore-integrated)
// -----------------------------------------------------------------------------
// Requires: firebase-init.js (exports saveUserData, loadUserData)
// Place firebase-init.js in same folder and ensure index.html loads script.js as type="module"
// -----------------------------------------------------------------------------

import { saveUserData, loadUserData } from "./firebase-init.js";

/* -------------------------
   Helper: Button Loading
   ------------------------- */
function setButtonLoading(btn, isLoading, loadingText = "Saving...") {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.classList.add("loading");
    btn.innerHTML = loadingText;
    btn.disabled = true;
  } else {
    btn.classList.remove("loading");
    btn.disabled = false;
    if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
  }
}

/* -------------------------
   Google Identity Services
   ------------------------- */
window.addEventListener("load", () => {
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id:
        "698206969022-c30bmj91rm23a1k8dnk8hgs9iea58d1b.apps.googleusercontent.com",
      callback: handleCredentialResponse,
    });

    const googleBtn = document.getElementById("googleSignInBtn");
    if (googleBtn) {
      googleBtn.addEventListener("click", () => {
        setButtonLoading(googleBtn, true, "Signing in...");
        google.accounts.id.prompt();
      });
    }
  } else {
    console.warn("Google Identity Services not loaded (google.accounts.id missing)");
  }
});

async function handleCredentialResponse(response) {
  try {
    const data = parseJwt(response.credential);
    const email = data.email;
    const name = data.name || email.split("@")[0];

    // If user exists locally, login; otherwise register
    const existingUser = users.find((u) => u.email === email);
    if (existingUser) {
      // local auth: loginUser expects (email, password) in original code; we keep same signature
      loginUser(email, existingUser.password || "");
    } else {
      registerUser(name, email, "google-oauth-" + Date.now());
    }
  } catch (err) {
    console.error("Google credential handling failed:", err);
  } finally {
    const googleBtn = document.getElementById("googleSignInBtn");
    setButtonLoading(googleBtn, false);
  }
}

function parseJwt(token) {
  try {
    var base64Url = token.split(".")[1];
    var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    var jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to parse JWT", e);
    return {};
  }
}

/* -------------------------
   App State
   ------------------------- */
let transactions = [];
let totalIncome = 0;
let totalExpense = 0;
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let creditCardBills = [];

let budgetSettings = {
  food: 20000,
  transport: 10000,
  entertainment: 8000,
  shopping: 15000,
  bills: 12000,
  health: 5000,
  education: 5000,
  savings: 10000,
};

let users = JSON.parse(localStorage.getItem("users")) || [];

/* -------------------------
   Save & Load (Firestore + LS)
   ------------------------- */
async function saveTransactions() {
  if (!currentUser) return;

  const userData = {
    name: currentUser.name || "",
    email: currentUser.email,
    transactions,
    creditCardBills,
    budgetSettings,
  };

  try {
    await saveUserData(currentUser.email, userData);
    console.log("Saved user data to Firestore");
  } catch (err) {
    console.error("Failed to save to Firestore:", err);
    // still update localStorage as fallback
    localStorage.setItem(`user_${currentUser.email}`, JSON.stringify(userData));
  }
}

async function loadTransactions() {
  if (!currentUser) return;

  try {
    const userData = await loadUserData(currentUser.email);
    if (userData) {
      transactions = userData.transactions || [];
      creditCardBills = userData.creditCardBills || [];
      budgetSettings = userData.budgetSettings || budgetSettings;

      // Recalculate totals
      totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
      totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);

      updateDashboard();
      renderTransactions();
      renderCreditCardBills();
      console.log("Loaded user data from Firestore/localStorage");
    } else {
      console.log("No cloud data found; using localStorage (if any)");
      const local = JSON.parse(localStorage.getItem(`user_${currentUser.email}`) || "null");
      if (local) {
        transactions = local.transactions || [];
        creditCardBills = local.creditCardBills || [];
        budgetSettings = local.budgetSettings || budgetSettings;
        totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
        totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
        updateDashboard();
        renderTransactions();
        renderCreditCardBills();
      }
    }
  } catch (err) {
    console.error("Failed to load user data:", err);
    // fallback to localStorage
    const local = JSON.parse(localStorage.getItem(`user_${currentUser.email}`) || "null");
    if (local) {
      transactions = local.transactions || [];
      creditCardBills = local.creditCardBills || [];
      budgetSettings = local.budgetSettings || budgetSettings;
      totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
      totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
      updateDashboard();
      renderTransactions();
      renderCreditCardBills();
    }
  }
}

/* -------------------------
   Add Transaction
   ------------------------- */
function addTransaction() {
  if (!currentUser) {
    alert("Please login to add transactions");
    return;
  }

  const desc = document.getElementById("transaction-desc")?.value || "";
  const amount = parseFloat(document.getElementById("transaction-amount")?.value || "0");
  const category = document.getElementById("transaction-category")?.value || "";
  const type = document.getElementById("transaction-type")?.value || "expense";
  let date = document.getElementById("transaction-date")?.value || "";

  if (!desc || isNaN(amount) || !category) {
    alert("Please fill all fields with valid values");
    return;
  }

  if (!date) date = new Date().toISOString().split("T")[0];

  const transaction = {
    id: Date.now(),
    desc,
    amount,
    category,
    type,
    date,
  };

  transactions.push(transaction);
  if (type === "income") totalIncome += amount;
  else totalExpense += amount;

  updateDashboard();
  renderTransactions();
  renderCalendar();

  // Save (async) but don't block UI
  saveTransactions();
  checkBudgetAlerts();

  // Clear the form
  const fields = ["transaction-desc", "transaction-amount", "transaction-category", "transaction-date"];
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

/* -------------------------
   Render Transactions
   ------------------------- */
function renderTransactions() {
  const list = document.getElementById("transactions-list");
  if (!list) return;
  list.innerHTML = "";

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const icons = {
    food: "🍕",
    transport: "🚗",
    shopping: "🛍️",
    entertainment: "🎬",
    bills: "💡",
    health: "🏥",
    education: "📚",
    savings: "💰",
    income: "💵",
  };

  sorted.forEach((t) => {
    const item = document.createElement("div");
    item.className = "transaction-item fade-in";
    item.dataset.id = t.id;

    const color =
      t.type === "income"
        ? "linear-gradient(135deg, #06d6a0, #0891b2)"
        : "linear-gradient(135deg, #ef4444, #dc2626)";

    const amountClass = t.type === "income" ? "amount-positive" : "amount-negative";
    const prefix = t.type === "income" ? "+" : "-";
    const formattedDate = new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    item.innerHTML = `
      <div class="transaction-icon" style="background: ${color};">${icons[t.category] || "💰"}</div>
      <div class="transaction-details">
        <div class="transaction-title">${t.desc}</div>
        <div class="transaction-meta">
          <span class="transaction-category">${document.querySelector(`option[value="${t.category}"]`)?.textContent || t.category}</span>
          <span class="transaction-date">${formattedDate}</span>
        </div>
      </div>
      <div class="transaction-amount ${amountClass}">${prefix}₹${Number(t.amount).toFixed(2)}</div>
      <div class="transaction-delete" onclick="deleteTransaction(${t.id})">🗑️</div>
    `;
    list.appendChild(item);
  });
}

/* -------------------------
   Delete Transaction
   ------------------------- */
function deleteTransaction(id) {
  if (!confirm("Are you sure you want to delete this transaction?")) return;
  const idx = transactions.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const t = transactions[idx];
  if (t.type === "income") totalIncome -= t.amount;
  else totalExpense -= t.amount;
  transactions.splice(idx, 1);
  updateDashboard();
  renderTransactions();
  renderCalendar();
  saveTransactions();
  checkBudgetAlerts();
}

/* -------------------------
   Dashboard & Budget
   ------------------------- */
function updateDashboard() {
  const expenseEl = document.getElementById("expense-value");
  const balanceEl = document.getElementById("balance-value");
  const budgetEl = document.getElementById("budget-value");
  if (!expenseEl || !balanceEl || !budgetEl) return;

  const balance = totalIncome - totalExpense;
  const budgetPercent = totalIncome > 0 ? Math.min(100, (totalExpense / totalIncome) * 100) : 0;

  expenseEl.textContent = `₹${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  balanceEl.textContent = `₹${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  budgetEl.textContent = `${Math.round(budgetPercent)}%`;

  updateBudgetProgress();

  document.querySelectorAll(".card-change").forEach((el) => {
    if (el.classList.contains("change-positive")) {
      el.innerHTML = `↗ +${Math.floor(Math.random() * 20)}% from last month`;
    } else if (el.classList.contains("change-negative")) {
      el.innerHTML = `↘ +${Math.floor(Math.random() * 20)}% from last month`;
    }
  });
}

function updateBudgetProgress() {
  const categories = {
    food: { spent: 0, budget: budgetSettings.food },
    transport: { spent: 0, budget: budgetSettings.transport },
    entertainment: { spent: 0, budget: budgetSettings.entertainment },
    shopping: { spent: 0, budget: budgetSettings.shopping },
    bills: { spent: 0, budget: budgetSettings.bills },
    health: { spent: 0, budget: budgetSettings.health },
    education: { spent: 0, budget: budgetSettings.education },
    savings: { spent: 0, budget: budgetSettings.savings },
  };

  transactions.forEach((t) => {
    if (t.type === "expense" && categories[t.category]) categories[t.category].spent += Number(t.amount || 0);
  });

  Object.entries(categories).forEach(([category, data]) => {
    const { spent, budget } = data;
    const percentage = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
    const progressValue = document.getElementById(`${category}-progress`);
    const progressFill = document.getElementById(`${category}-fill`);
    if (!progressValue || !progressFill) return;
    progressValue.textContent = `₹${spent.toFixed(2)} / ₹${budget.toFixed(2)}`;
    progressFill.style.width = `${percentage}%`;
    if (percentage >= 90) progressFill.className = "progress-fill progress-danger";
    else if (percentage >= 70) progressFill.className = "progress-fill progress-warning";
    else progressFill.className = "progress-fill progress-safe";
  });
}

function checkBudgetAlerts() {
  document.querySelectorAll(".progress-item").forEach((item) => {
    const progressFill = item.querySelector(".progress-fill");
    const width = parseFloat(progressFill.style.width) || 0;
    if (width >= 90) {
      item.style.animation = "shake 0.5s ease-in-out";
      setTimeout(() => (item.style.animation = ""), 500);
      if (width >= 90 && width - parseFloat(progressFill.dataset.lastWidth || 0) > 5) {
        const category = item.querySelector(".progress-label").textContent;
        alert(`Warning: You've used ${Math.round(width)}% of your ${category} budget!`);
      }
    }
    progressFill.dataset.lastWidth = width;
  });
}

/* -------------------------
   Credit Card Bills
   ------------------------- */
function addCreditCardBill() {
  const name = document.getElementById("card-name")?.value || "";
  const amount = parseFloat(document.getElementById("card-amount")?.value || "0");
  const dueDate = document.getElementById("card-due-date")?.value || "";
  const status = document.getElementById("card-status")?.value || "unpaid";

  if (!name || isNaN(amount) || !dueDate) {
    alert("Please fill all required fields");
    return;
  }

  const bill = {
    id: Date.now(),
    name,
    amount,
    dueDate,
    status,
    paidDate: status === "paid" ? new Date().toISOString().split("T")[0] : null,
  };

  creditCardBills.push(bill);
  saveTransactions();
  renderCreditCardBills();

  ["card-name", "card-amount", "card-due-date"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("card-status").value = "unpaid";
}

function renderCreditCardBills() {
  const list = document.getElementById("bills-list");
  if (!list) return;
  list.innerHTML = "";

  const sorted = [...creditCardBills].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  sorted.forEach((bill) => {
    const billEl = document.createElement("div");
    billEl.className = `credit-card-bill ${bill.status === "paid" ? "paid" : ""}`;
    if (new Date(bill.dueDate) < new Date() && bill.status !== "paid") billEl.classList.add("overdue");

    billEl.innerHTML = `
      <div class="bill-info">
        <h4>${bill.name}</h4>
        <div class="bill-meta">
          <span>₹${Number(bill.amount).toFixed(2)}</span>
          <span>Due: ${new Date(bill.dueDate).toLocaleDateString()}</span>
          ${bill.status === "paid" ? `<span>Paid on: ${new Date(bill.paidDate).toLocaleDateString()}</span>` : ""}
        </div>
      </div>
      <div class="bill-actions">
        ${bill.status === "unpaid" ? `<button class="btn mark-paid" onclick="markBillAsPaid(${bill.id})"><i class="fas fa-check"></i> Mark Paid</button>` : ""}
        <button class="btn delete-bill" onclick="deleteBill(${bill.id})"><i class="fas fa-trash"></i> Delete</button>
      </div>
    `;
    list.appendChild(billEl);
  });
}

function markBillAsPaid(id) {
  const bill = creditCardBills.find((b) => b.id === id);
  if (!bill) return;
  bill.status = "paid";
  bill.paidDate = new Date().toISOString().split("T")[0];
  saveTransactions();
  renderCreditCardBills();

  if (confirm("Add this payment as an expense transaction?")) {
    const transaction = {
      id: Date.now(),
      desc: `Credit Card Payment: ${bill.name}`,
      amount: bill.amount,
      category: "bills",
      type: "expense",
      date: bill.paidDate,
    };
    transactions.push(transaction);
    totalExpense += bill.amount;
    updateDashboard();
    renderTransactions();
    saveTransactions();
  }
}

function deleteBill(id) {
  if (!confirm("Are you sure you want to delete this bill?")) return;
  creditCardBills = creditCardBills.filter((b) => b.id !== id);
  saveTransactions();
  renderCreditCardBills();
}

/* -------------------------
   Budget Settings
   ------------------------- */
function openBudgetSettings() {
  document.getElementById("food-budget").value = budgetSettings.food;
  document.getElementById("transport-budget").value = budgetSettings.transport;
  document.getElementById("entertainment-budget").value = budgetSettings.entertainment;
  document.getElementById("shopping-budget").value = budgetSettings.shopping;
  document.getElementById("bills-budget").value = budgetSettings.bills;
  document.getElementById("health-budget").value = budgetSettings.health || 5000;
  document.getElementById("education-budget").value = budgetSettings.education || 5000;
  document.getElementById("savings-budget").value = budgetSettings.savings || 10000;
  document.getElementById("budget-settings-modal").style.display = "flex";
}

function saveBudgetSettings() {
  budgetSettings = {
    food: parseFloat(document.getElementById("food-budget").value) || 20000,
    transport: parseFloat(document.getElementById("transport-budget").value) || 10000,
    entertainment: parseFloat(document.getElementById("entertainment-budget").value) || 8000,
    shopping: parseFloat(document.getElementById("shopping-budget").value) || 15000,
    bills: parseFloat(document.getElementById("bills-budget").value) || 12000,
    health: parseFloat(document.getElementById("health-budget").value) || 5000,
    education: parseFloat(document.getElementById("education-budget").value) || 5000,
    savings: parseFloat(document.getElementById("savings-budget").value) || 10000,
  };
  updateBudgetProgress();
  saveTransactions();
  closeModal("budget-settings-modal");
  alert("Budget settings saved successfully");
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.style.display = "none";
}

/* -------------------------
   Profile
   ------------------------- */
function openProfile() {
  if (!currentUser) return;
  document.getElementById("profile-name").value = currentUser.name || "";
  document.getElementById("profile-email").value = currentUser.email || "";
  document.getElementById("profile-password").value = "";
  document.getElementById("profile-modal").style.display = "flex";
}

function saveProfile() {
  if (!currentUser) return;
  const name = document.getElementById("profile-name").value;
  const password = document.getElementById("profile-password").value;
  if (!name) {
    alert("Please enter your name");
    return;
  }
  currentUser.name = name;
  if (password) currentUser.password = password;

  const idx = users.findIndex((u) => u.email === currentUser.email);
  if (idx !== -1) {
    users[idx] = currentUser;
    localStorage.setItem("users", JSON.stringify(users));
  }
  document.getElementById("user-name").textContent = name;
  document.getElementById("user-avatar").textContent = name.charAt(0).toUpperCase();
  saveTransactions();
  closeModal("profile-modal");
  alert("Profile updated successfully");
}

/* -------------------------
   Calendar
   ------------------------- */
function renderCalendar() {
  const calendarGrid = document.getElementById("calendar-grid");
  const monthYearDisplay = document.getElementById("current-month");
  if (!calendarGrid || !monthYearDisplay) return;

  const monthNames = [
    "January","February","March","April","May","June","July","August","September","October","November","December",
  ];
  monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  calendarGrid.innerHTML = "";

  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  dayNames.forEach((d) => {
    const el = document.createElement("div");
    el.className = "calendar-day-header";
    el.textContent = d;
    calendarGrid.appendChild(el);
  });

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();

  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement("div");
    e.className = "calendar-day other-month";
    calendarGrid.appendChild(e);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const dayTransactions = transactions.filter((t) => t.date === dateStr);
    const totalAmt = dayTransactions.reduce((s, t) => s + (t.type === "income" ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);

    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    if (currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate()) dayEl.classList.add("today");
    if (dayTransactions.length > 0) dayEl.classList.add("has-transactions");

    dayEl.innerHTML = `
      <div class="calendar-day-number">${day}</div>
      <div class="calendar-day-amount">₹${Math.abs(totalAmt).toFixed(0)}</div>
    `;

    dayEl.addEventListener("click", () => showDayTransactions(dateStr, dayTransactions));
    calendarGrid.appendChild(dayEl);
  }

  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 0; i < remaining; i++) {
    const e = document.createElement("div");
    e.className = "calendar-day other-month";
    calendarGrid.appendChild(e);
  }
}

function changeMonth(offset) {
  currentMonth += offset;
  if (currentMonth < 0) {
    currentMonth = 11; currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0; currentYear++;
  }
  renderCalendar();
}

function showDayTransactions(dateStr, dayTransactions) {
  // Implement a modal or console log for now
  console.log("Transactions for", dateStr, dayTransactions);
  // you can show a modal with the list if needed
}

/* -------------------------
   Auth (email/password & local fallback)
   ------------------------- */
function loginUser(email, password) {
  // local authentication (keeps previous behavior)
  const user = users.find((u) => u.email === email && u.password === password);
  if (user) {
    currentUser = user;
    localStorage.setItem("currentUser", JSON.stringify(user));
    document.getElementById("login-modal").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    document.getElementById("user-name").textContent = user.name;
    document.getElementById("user-avatar").textContent = user.name.charAt(0).toUpperCase();
    loadTransactions();
    return true;
  } else {
    return false;
  }
}

function registerUser(name, email, password) {
  if (users.some((u) => u.email === email)) return false;
  const newUser = {
    name, email, password,
    transactions: [], creditCardBills: [], budgetSettings: { ...budgetSettings }
  };
  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));
  currentUser = newUser;
  localStorage.setItem("currentUser", JSON.stringify(newUser));
  document.getElementById("login-modal").style.display = "none";
  document.getElementById("app-container").style.display = "block";
  document.getElementById("user-name").textContent = name;
  document.getElementById("user-avatar").textContent = name.charAt(0).toUpperCase();
  // Persist initial profile to Firestore
  saveTransactions();
  return true;
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("currentUser");
  document.getElementById("login-modal").style.display = "flex";
  document.getElementById("app-container").style.display = "none";
  document.getElementById("login-form").style.display = "block";
  document.getElementById("register-container").style.display = "none";
}

/* -------------------------
   Init App + Events
   ------------------------- */
function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById("theme-icon");
  const themeText = document.getElementById("theme-text");
  if (body.getAttribute("data-theme") === "dark") {
    body.removeAttribute("data-theme");
    themeIcon.textContent = "🌙";
    themeText.textContent = "Dark";
    localStorage.setItem("theme", "light");
  } else {
    body.setAttribute("data-theme", "dark");
    themeIcon.textContent = "☀️";
    themeText.textContent = "Light";
    localStorage.setItem("theme", "dark");
  }
}

function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.body.setAttribute("data-theme", "dark");
    document.getElementById("theme-icon").textContent = "☀️";
    document.getElementById("theme-text").textContent = "Light";
  }
}

function initApp() {
  loadTheme();
  const savedUser = localStorage.getItem("currentUser");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    document.getElementById("login-modal").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    document.getElementById("user-name").textContent = currentUser.name || "User";
    document.getElementById("user-avatar").textContent = (currentUser.name || "U").charAt(0).toUpperCase();
    loadTransactions();
  } else {
    document.getElementById("login-modal").style.display = "flex";
    document.getElementById("app-container").style.display = "none";
  }

  // default dates
  const tdate = document.getElementById("transaction-date");
  if (tdate) tdate.valueAsDate = new Date();
  const ddate = document.getElementById("card-due-date");
  if (ddate) ddate.valueAsDate = new Date();

  // animated fades
  const fadeEls = document.querySelectorAll(".fade-in");
  fadeEls.forEach((el, i) => (el.style.animationDelay = `${i * 0.1}s`));

  setTimeout(() => {
    const bars = document.querySelectorAll(".bar");
    bars.forEach((bar) => (bar.style.height = `${20 + Math.random() * 80}%`));
  }, 500);
}

/* Event listeners that existed before (preserve) */
document.getElementById("login-form")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const email = document.getElementById("login-email")?.value;
  const password = document.getElementById("login-password")?.value;
  if (!loginUser(email, password)) alert("Invalid email or password");
});

document.getElementById("register-form")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("register-name")?.value;
  const email = document.getElementById("register-email")?.value;
  const password = document.getElementById("register-password")?.value;
  const confirmPassword = document.getElementById("register-confirm")?.value;
  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }
  if (!registerUser(name, email, password)) alert("Email already registered");
});

document.getElementById("show-register")?.addEventListener("click", function (e) {
  e.preventDefault();
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-container").style.display = "block";
});

document.getElementById("show-login")?.addEventListener("click", function (e) {
  e.preventDefault();
  document.getElementById("login-form").style.display = "block";
  document.getElementById("register-container").style.display = "none";
});

document.getElementById("logout-link")?.addEventListener("click", function (e) {
  e.preventDefault();
  logoutUser();
});

document.getElementById("settings-link")?.addEventListener("click", function (e) {
  e.preventDefault();
  openBudgetSettings();
});

document.getElementById("profile-link")?.addEventListener("click", function (e) {
  e.preventDefault();
  openProfile();
});

document.getElementById("prev-month")?.addEventListener("click", () => changeMonth(-1));
document.getElementById("next-month")?.addEventListener("click", () => changeMonth(1));

window.addEventListener("load", initApp);

/* -------------------------
   Expose to global (for inline onclick)
   ------------------------- */
window.addTransaction = addTransaction;
window.deleteTransaction = deleteTransaction;
window.addCreditCardBill = addCreditCardBill;
window.markBillAsPaid = markBillAsPaid;
window.deleteBill = deleteBill;
window.openBudgetSettings = openBudgetSettings;
window.saveBudgetSettings = saveBudgetSettings;
window.openProfile = openProfile;
window.saveProfile = saveProfile;
window.logoutUser = logoutUser;
window.loginUser = loginUser;
window.registerUser = registerUser;

console.log("script.js loaded (cleaned & Firestore integrated)");
