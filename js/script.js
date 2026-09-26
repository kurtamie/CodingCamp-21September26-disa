// js/script.js — Expense Budget Visualizer

// =============================================================================
// StateModule — in-memory application state
// =============================================================================
const StateModule = (() => {
  let transactions = [];
  let spendingLimit = null;
  let currentTheme = 'dark';
  let activeSort = null;

  function getTransactions() { return [...transactions]; }
  function setTransactions(arr) { transactions = Array.isArray(arr) ? [...arr] : []; }
  function getSpendingLimit() { return spendingLimit; }
  function setSpendingLimit(val) { spendingLimit = val; }
  function getTheme() { return currentTheme; }
  function setTheme(t) { currentTheme = t === 'dark' ? 'dark' : 'light'; }
  function getActiveSort() { return activeSort; }
  function setActiveSort(s) { activeSort = s === 'amount' || s === 'category' ? s : null; }

  return {
    getTransactions,
    setTransactions,
    getSpendingLimit,
    setSpendingLimit,
    getTheme,
    setTheme,
    getActiveSort,
    setActiveSort,
  };
})();

// =============================================================================
// StorageModule — CRUD operations against localStorage
// =============================================================================
const StorageModule = (() => {
  const KEYS = {
    TRANSACTIONS: 'ebv_transactions',
    LIMIT: 'ebv_spending_limit',
    THEME: 'ebv_theme',
  };

  function loadTransactions() {
    try {
      const raw = localStorage.getItem(KEYS.TRANSACTIONS);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveTransactions(txArray) {
    try {
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txArray));
    } catch (_) {}
  }

  function loadLimit() {
    try {
      const raw = localStorage.getItem(KEYS.LIMIT);
      if (raw === null) return null;
      const parsed = parseFloat(raw);
      return isFinite(parsed) ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function saveLimit(value) {
    try {
      localStorage.setItem(KEYS.LIMIT, String(value));
    } catch (_) {}
  }

  function loadTheme() {
    try {
      const raw = localStorage.getItem(KEYS.THEME);
      if (raw === 'dark' || raw === 'light') return raw;
      return null;
    } catch (_) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(KEYS.THEME, theme);
    } catch (_) {}
  }

  return { loadTransactions, saveTransactions, loadLimit, saveLimit, loadTheme, saveTheme };
})();

// =============================================================================
// ValidationModule — input validation
// =============================================================================
const ValidationModule = (() => {
  const VALID_CATEGORIES = ['Makanan', 'Transportasi', 'Hiburan'];

  function isPositiveFiniteNumber(value) {
    if (value === null || value === undefined || typeof value === 'boolean') {
      return false;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return false;
    }
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0;
  }

  function validateTransaction({ name, amount, category }) {
    const errors = {};

    if (!name || name.trim() === '') {
      errors.name = 'Nama wajib diisi.';
    }

    if (!isPositiveFiniteNumber(amount)) {
      errors.amount = 'Jumlah harus berupa angka positif.';
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      errors.category = 'Silakan pilih kategori.';
    }

    return errors;
  }

  function validateSpendingLimit(value) {
    if (!isPositiveFiniteNumber(value)) {
      return 'Batas pengeluaran harus berupa angka positif.';
    }
    return null;
  }

  return { validateTransaction, validateSpendingLimit };
})();

// =============================================================================
// TransactionModule — transaction CRUD and calculations
// =============================================================================
const TransactionModule = (() => {
  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function addTransaction(txArray, { name, amount, category }) {
    const newTx = {
      id: generateId(),
      name: String(name).trim(),
      amount: parseFloat(amount),
      category,
    };
    return [...txArray, newTx];
  }

  function deleteTransaction(txArray, id) {
    return txArray.filter(tx => tx.id !== id);
  }

  function calculateTotal(txArray) {
    return txArray.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }

  return { generateId, addTransaction, deleteTransaction, calculateTotal };
})();

// =============================================================================
// SortModule — sort transaction arrays
// =============================================================================
const SortModule = (() => {
  function sortByAmount(txArray) {
    return [...txArray].sort((a, b) => Number(a.amount) - Number(b.amount));
  }

  function sortByCategory(txArray) {
    return [...txArray].sort((a, b) => {
      const categoryDiff = String(a.category || '').localeCompare(String(b.category || ''));
      return categoryDiff !== 0 ? categoryDiff : Number(a.amount) - Number(b.amount);
    });
  }

  return { sortByAmount, sortByCategory };
})();

// =============================================================================
// ChartModule — pie chart rendering
// =============================================================================
const ChartModule = (() => {
  const COLORS = {
    Makanan: '#FF6384',
    Transportasi: '#36A2EB',
    Hiburan: '#FFCE56',
  };

  function buildChartData(txArray) {
    const totals = {};

    txArray.forEach((tx) => {
      const category = tx.category;
      totals[category] = (totals[category] || 0) + Number(tx.amount || 0);
    });

    const labels = Object.keys(totals);
    const data = labels.map(label => totals[label]);
    const colors = labels.map(label => COLORS[label] || '#999999');

    return { labels, data, colors };
  }

  function render(txArray) {
    if (typeof document === 'undefined') return;

    const canvas = document.getElementById('pie-chart');
    const placeholder = document.getElementById('chart-placeholder');
    if (!canvas || !placeholder) return;

    if (window.__ebvChartInstance) {
      window.__ebvChartInstance.destroy();
      window.__ebvChartInstance = null;
    }

    if (!Array.isArray(txArray) || txArray.length === 0) {
      canvas.style.display = 'none';
      placeholder.style.display = 'block';
      return;
    }

    const { labels, data, colors } = buildChartData(txArray);
    if (!labels.length) {
      canvas.style.display = 'none';
      placeholder.style.display = 'block';
      return;
    }

    canvas.style.display = 'block';
    placeholder.style.display = 'none';

    if (typeof Chart === 'undefined') {
      placeholder.textContent = 'Chart.js gagal dimuat. Silakan refresh halaman.';
      placeholder.style.display = 'block';
      canvas.style.display = 'none';
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      placeholder.textContent = 'Chart.js gagal dimuat. Silakan refresh halaman.';
      placeholder.style.display = 'block';
      canvas.style.display = 'none';
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    window.__ebvChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 13,
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                return label + ': Rp ' + value.toLocaleString('id-ID');
              }
            }
          }
        },
      },
    });
  }

  return { COLORS, buildChartData, render };
})();

// =============================================================================
// UIModule — DOM rendering
// =============================================================================
const UIModule = (() => {
  function formatCurrency(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
  }

  function renderTransactionList(txArray) {
    if (typeof document === 'undefined') return;

    const list = document.getElementById('transaction-list');
    const emptyState = document.getElementById('empty-state');
    if (!list || !emptyState) return;

    list.innerHTML = '';

    if (!Array.isArray(txArray) || txArray.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    txArray.forEach((tx) => {
      const item = document.createElement('li');
      item.className = 'transaction-item';

      const summary = document.createElement('div');
      summary.className = 'transaction-summary';

      const name = document.createElement('span');
      name.className = 'transaction-name';
      name.textContent = tx.name;

      const category = document.createElement('small');
      category.className = 'transaction-category';
      category.textContent = tx.category;

      const amount = document.createElement('strong');
      amount.className = 'transaction-amount';
      amount.textContent = formatCurrency(tx.amount);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'delete-btn';
      deleteBtn.dataset.id = tx.id;
      deleteBtn.textContent = 'Hapus';

      summary.appendChild(name);
      summary.appendChild(category);
      item.appendChild(summary);
      item.appendChild(amount);
      item.appendChild(deleteBtn);
      list.appendChild(item);
    });
  }

  function updateBalance(total) {
    if (typeof document === 'undefined') return;

    const balanceNode = document.getElementById('total-balance');
    if (!balanceNode) return;

    balanceNode.textContent = formatCurrency(total);
  }

  function updateAlert(total, limit) {
    if (typeof document === 'undefined') return;

    const alert = document.getElementById('budget-alert');
    if (!alert) return;

    const shouldShow = Number.isFinite(limit) && limit !== null && total > limit;
    alert.hidden = !shouldShow;
  }

  function applyTheme(theme) {
    if (typeof document === 'undefined') return;

    document.body.classList.toggle('dark', theme === 'dark');
  }

  function clearFormErrors() {
    if (typeof document === 'undefined') return;

    ['name', 'amount', 'category', 'limit'].forEach((field) => {
      const errorNode = document.getElementById(`error-${field}`);
      if (errorNode) {
        errorNode.textContent = '';
      }
    });
  }

  function showFormErrors(errors = {}) {
    clearFormErrors();

    if (typeof document === 'undefined') return;

    Object.entries(errors).forEach(([field, message]) => {
      const errorNode = document.getElementById(`error-${field}`);
      if (errorNode && message) {
        errorNode.textContent = message;
      }
    });
  }

  function resetForm() {
    if (typeof document === 'undefined') return;

    const form = document.getElementById('transaction-form');
    if (form) {
      form.reset();
    }
    clearFormErrors();
  }

  return {
    formatCurrency,
    renderTransactionList,
    updateBalance,
    updateAlert,
    applyTheme,
    clearFormErrors,
    showFormErrors,
    resetForm,
  };
})();

// =============================================================================
// AppInit — initialize and wire all modules
// =============================================================================
const AppInit = (() => {
  function applySortToTransactions(txArray) {
    const sortType = StateModule.getActiveSort();

    if (sortType === 'amount') {
      return SortModule.sortByAmount(txArray);
    }

    if (sortType === 'category') {
      return SortModule.sortByCategory(txArray);
    }

    return [...txArray];
  }

  function updateSortButtonStates() {
    const activeSort = StateModule.getActiveSort();
    document.querySelectorAll('.btn-sort').forEach((button) => {
      if (button.dataset.sort === activeSort) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  function renderAll() {
    const transactions = StateModule.getTransactions();
    const visibleTransactions = applySortToTransactions(transactions);

    UIModule.renderTransactionList(visibleTransactions);
    UIModule.updateBalance(TransactionModule.calculateTotal(transactions));
    UIModule.updateAlert(
      TransactionModule.calculateTotal(transactions),
      StateModule.getSpendingLimit()
    );
    ChartModule.render(transactions);
    updateSortButtonStates();

    const limitInput = document.getElementById('spending-limit');
    if (limitInput) {
      limitInput.value = StateModule.getSpendingLimit() === null ? '' : StateModule.getSpendingLimit();
    }
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name') ?? '',
      amount: formData.get('amount') ?? '',
      category: formData.get('category') ?? '',
    };

    const errors = ValidationModule.validateTransaction(payload);
    if (Object.keys(errors).length > 0) {
      UIModule.showFormErrors(errors);
      return;
    }

    const nextTransactions = TransactionModule.addTransaction(StateModule.getTransactions(), payload);
    StateModule.setTransactions(nextTransactions);
    StorageModule.saveTransactions(nextTransactions);

    UIModule.resetForm();
    renderAll();
  }

  function handleDelete(event) {
    const deleteBtn = event.target.closest('.delete-btn');
    if (!deleteBtn) return;

    const id = deleteBtn.dataset.id;
    const nextTransactions = TransactionModule.deleteTransaction(StateModule.getTransactions(), id);
    StateModule.setTransactions(nextTransactions);
    StorageModule.saveTransactions(nextTransactions);
    renderAll();
  }

  function handleLimitSubmit() {
    const value = document.getElementById('spending-limit')?.value ?? '';
    
    if (value.trim() === '') {
      StateModule.setSpendingLimit(null);
      StorageModule.saveLimit(null);
      UIModule.clearFormErrors();
      renderAll();
      return;
    }

    const error = ValidationModule.validateSpendingLimit(value);

    if (error) {
      UIModule.showFormErrors({ limit: error });
      return;
    }

    const nextLimit = Number(value);
    StateModule.setSpendingLimit(nextLimit);
    StorageModule.saveLimit(nextLimit);
    UIModule.clearFormErrors();
    renderAll();
  }

  function attachEventListeners() {
    const form = document.getElementById('transaction-form');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }

    const transactionList = document.getElementById('transaction-list');
    if (transactionList) {
      transactionList.addEventListener('click', handleDelete);
    }

    const limitButton = document.getElementById('set-limit-btn');
    if (limitButton) {
      limitButton.addEventListener('click', handleLimitSubmit);
    }

    const limitInput = document.getElementById('spending-limit');
    if (limitInput) {
      limitInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleLimitSubmit();
        }
      });
    }

    document.querySelectorAll('.btn-sort').forEach((button) => {
      button.addEventListener('click', () => {
        const nextSort = button.dataset.sort;
        const currentSort = StateModule.getActiveSort();
        
        if (currentSort === nextSort) {
          StateModule.setActiveSort(null);
        } else {
          StateModule.setActiveSort(nextSort);
        }
        
        renderAll();
      });
    });

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const nextTheme = StateModule.getTheme() === 'dark' ? 'light' : 'dark';
        StateModule.setTheme(nextTheme);
        StorageModule.saveTheme(nextTheme);
        UIModule.applyTheme(nextTheme);
      });
    }
  }

  function init() {
    if (typeof document === 'undefined') return;

    const savedTransactions = StorageModule.loadTransactions();
    const savedLimit = StorageModule.loadLimit();
    const savedTheme = StorageModule.loadTheme();

    StateModule.setTransactions(savedTransactions);
    StateModule.setSpendingLimit(savedLimit);
    StateModule.setTheme(savedTheme || 'dark');

    UIModule.applyTheme(StateModule.getTheme());
    attachEventListeners();
    renderAll();
  }

  return { init };
})();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', AppInit.init);
}

if (typeof window !== 'undefined') {
  window.StateModule = StateModule;
  window.StorageModule = StorageModule;
  window.ValidationModule = ValidationModule;
  window.TransactionModule = TransactionModule;
  window.SortModule = SortModule;
  window.ChartModule = ChartModule;
  window.UIModule = UIModule;
  window.AppInit = AppInit;
}
