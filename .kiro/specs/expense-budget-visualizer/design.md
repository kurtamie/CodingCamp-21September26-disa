# Design Document — Expense Budget Visualizer

## Overview

Expense Budget Visualizer adalah Single-Page Application (SPA) berbasis Pure HTML5, CSS3, dan Vanilla JS (ES6+) tanpa build tool atau framework. Semua data disimpan di `localStorage`. Chart.js dimuat via CDN untuk visualisasi pie chart. Arsitektur mengikuti pola **Module Pattern** — setiap modul adalah IIFE atau ES6 module yang diekspor melalui objek namespace global `App`.

---

## Architecture

### High-Level Architecture

```
index.html
├── <head>  — Chart.js CDN, link ke css/style.css
└── <body>
    ├── #app-container
    │   ├── Header (title + theme toggle)
    │   ├── .card — Input Form
    │   ├── .card — Spending Limit
    │   ├── .card — Total Balance + Alert Banner
    │   ├── .card — Pie Chart / Placeholder
    │   ├── .card — Sort Controls + Transaction List
    │   └── Footer
    └── <script src="js/script.js">
```

### Module Breakdown (`js/script.js`)

```
script.js
├── StorageModule      — CRUD ke localStorage
├── StateModule        — state tunggal in-memory (transactions[], spendingLimit, theme)
├── ValidationModule   — validasi form input
├── TransactionModule  — logika tambah / hapus transaksi
├── ChartModule        — inisialisasi, destroy, re-render Chart.js instance
├── UIModule           — render DOM, update balance, toggle alert, apply theme
├── SortModule         — fungsi sort by amount / category
└── AppInit            — entry point, attach event listeners, load persisted state
```

Semua modul bersifat **stateless pure functions** kecuali `StateModule` dan `ChartModule` yang menyimpan referensi instance.

---

## Components & Interfaces

### 1. StorageModule

```js
const StorageModule = (() => {
  const KEYS = {
    TRANSACTIONS: 'ebv_transactions',
    LIMIT:        'ebv_spending_limit',
    THEME:        'ebv_theme',
  };

  function loadTransactions() { /* JSON.parse dari localStorage */ }
  function saveTransactions(txArray) { /* JSON.stringify ke localStorage */ }
  function loadLimit() { /* parseFloat dari localStorage */ }
  function saveLimit(value) { /* simpan number ke localStorage */ }
  function loadTheme() { /* 'dark' | 'light' | null */ }
  function saveTheme(theme) { /* simpan string */ }

  return { loadTransactions, saveTransactions, loadLimit, saveLimit, loadTheme, saveTheme };
})();
```

### 2. StateModule

```js
const StateModule = (() => {
  let transactions = [];
  let spendingLimit = null;
  let currentTheme = 'light';

  function getTransactions() { return [...transactions]; }
  function setTransactions(arr) { transactions = [...arr]; }
  function getSpendingLimit() { return spendingLimit; }
  function setSpendingLimit(val) { spendingLimit = val; }
  function getTheme() { return currentTheme; }
  function setTheme(t) { currentTheme = t; }

  return { getTransactions, setTransactions, getSpendingLimit, setSpendingLimit, getTheme, setTheme };
})();
```

### 3. ValidationModule

```js
const ValidationModule = (() => {
  function validateTransaction({ name, amount, category }) {
    const errors = {};
    if (!name || name.trim() === '') errors.name = 'Name is required.';
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) errors.amount = 'Amount must be a positive number.';
    if (!category) errors.category = 'Please select a category.';
    return errors; // empty object = valid
  }

  function validateSpendingLimit(value) {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) return 'Spending limit must be a positive number.';
    return null; // valid
  }

  return { validateTransaction, validateSpendingLimit };
})();
```

### 4. TransactionModule

```js
const TransactionModule = (() => {
  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function addTransaction(txArray, { name, amount, category }) {
    const newTx = { id: generateId(), name: name.trim(), amount: parseFloat(amount), category };
    return [...txArray, newTx];
  }

  function deleteTransaction(txArray, id) {
    return txArray.filter(tx => tx.id !== id);
  }

  function calculateTotal(txArray) {
    return txArray.reduce((sum, tx) => sum + tx.amount, 0);
  }

  return { addTransaction, deleteTransaction, calculateTotal };
})();
```

### 5. SortModule

```js
const SortModule = (() => {
  function sortByAmount(txArray) {
    return [...txArray].sort((a, b) => a.amount - b.amount);
  }

  function sortByCategory(txArray) {
    return [...txArray].sort((a, b) => a.category.localeCompare(b.category));
  }

  return { sortByAmount, sortByCategory };
})();
```

### 6. ChartModule

```js
const ChartModule = (() => {
  let chartInstance = null;
  const COLORS = { Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' };

  function buildChartData(txArray) {
    const totals = {};
    txArray.forEach(tx => {
      totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
    });
    return {
      labels: Object.keys(totals),
      data: Object.values(totals),
      colors: Object.keys(totals).map(k => COLORS[k]),
    };
  }

  function render(txArray) {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    const canvas = document.getElementById('pie-chart');
    const placeholder = document.getElementById('chart-placeholder');
    if (!txArray.length) {
      canvas.style.display = 'none';
      placeholder.style.display = 'block';
      return;
    }
    placeholder.style.display = 'none';
    canvas.style.display = 'block';
    const { labels, data, colors } = buildChartData(txArray);
    chartInstance = new Chart(canvas, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
    });
  }

  return { render, COLORS };
})();
```

### 7. UIModule

```js
const UIModule = (() => {
  function renderTransactionList(txArray) { /* buat <li> per transaksi */ }
  function updateBalance(total) { /* update #total-balance */ }
  function updateAlert(total, limit) { /* tampilkan/sembunyikan #budget-alert */ }
  function applyTheme(theme) { /* toggle class 'dark' pada <body> */ }
  function showFormErrors(errors) { /* tampilkan pesan error inline */ }
  function clearFormErrors() { /* hapus semua pesan error */ }
  function resetForm() { /* reset nilai input form */ }

  return { renderTransactionList, updateBalance, updateAlert, applyTheme, showFormErrors, clearFormErrors, resetForm };
})();
```

---

## Data Models

### Transaction

```js
{
  id:       String,   // format: `${Date.now()}-${random}`, globally unique
  name:     String,   // trimmed, non-empty
  amount:   Number,   // float > 0
  category: String,   // 'Food' | 'Transport' | 'Fun'
}
```

### localStorage Keys

| Key                    | Type     | Value                           |
|------------------------|----------|---------------------------------|
| `ebv_transactions`     | JSON     | `Transaction[]`                 |
| `ebv_spending_limit`   | String   | number as string, or absent     |
| `ebv_theme`            | String   | `'dark'` \| `'light'`           |

### State Shape (in-memory)

```js
{
  transactions:  Transaction[],
  spendingLimit: Number | null,
  currentTheme:  'light' | 'dark',
  activeSort:    'amount' | 'category' | null,
}
```

---

## Error Handling

| Skenario | Behavior |
|---|---|
| Form submit dengan nama kosong/whitespace | Tampilkan error inline di samping field name; jangan buat transaksi |
| Form submit dengan amount ≤ 0 atau bukan angka | Tampilkan error inline di samping field amount; jangan buat transaksi |
| Form submit tanpa pilih kategori | Tampilkan error inline di samping dropdown; jangan buat transaksi |
| Spending limit ≤ 0 atau bukan angka | Tampilkan error inline; jangan update localStorage |
| localStorage tidak tersedia (private mode) | Try/catch; graceful degradation — app tetap berjalan tanpa persistensi |
| Chart.js CDN gagal dimuat | Canvas disembunyikan; placeholder error message ditampilkan |
| JSON.parse gagal saat load dari localStorage | Default ke `[]` untuk transaksi dan `null` untuk limit |

---

## Event Flow

```
User Action
    │
    ▼
Event Listener (AppInit)
    │
    ├── validate (ValidationModule)
    │       │ errors → UIModule.showFormErrors()
    │       │ valid  → continue
    │
    ├── mutate state (TransactionModule / StateModule)
    │
    ├── persist (StorageModule)
    │
    ├── apply sort if active (SortModule)
    │
    ├── re-render UI (UIModule.renderTransactionList, updateBalance, updateAlert)
    │
    └── re-render chart (ChartModule.render)
```

---

## File Structure

```
project-root/
├── index.html
├── css/
│   └── style.css
└── js/
    └── script.js
```

`index.html` memuat Chart.js dari CDN sebelum `script.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="js/script.js" defer></script>
```

---

## Responsive Design

- **Mobile-first baseline** (`< 768px`): single column, full-width cards, stacked layout.
- **Tablet/Desktop** (`≥ 768px`): CSS Grid dua kolom — Form + Spending Limit di kiri, Chart + List di kanan.
- CSS Custom Properties (`--bg`, `--surface`, `--text`, `--accent`) digunakan untuk theming; kelas `.dark` pada `<body>` mengoverride semua nilai.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction persistence round-trip

*For any* array of transactions, serializing that array to localStorage and then deserializing it should produce an array equal to the original (same id, name, amount, and category for every element).

**Validates: Requirements 1.4**

---

### Property 2: Spending limit persistence round-trip

*For any* positive numeric spending limit, saving it to localStorage and then loading it back should return the same numeric value.

**Validates: Requirements 1.5**

---

### Property 3: Theme persistence round-trip

*For any* theme preference value (`'dark'` or `'light'`), saving it to localStorage and loading it back should return the identical string, and applying it should set the correct CSS class on `<body>`.

**Validates: Requirements 1.6, 1.3**

---

### Property 4: Form validation rejects invalid names

*For any* string composed entirely of whitespace characters (including the empty string), submitting the transaction form with that value as the name should be rejected: no transaction is created, and the transaction list length remains unchanged.

**Validates: Requirements 2.3, 2.6**

---

### Property 5: Form validation rejects non-positive amounts

*For any* numeric value ≤ 0, or any non-numeric string, submitting the transaction form with that value as the amount should be rejected: no transaction is created, and the transaction list length remains unchanged.

**Validates: Requirements 2.4, 2.6**

---

### Property 6: Valid submission creates a unique transaction and resets form

*For any* valid triple `(name, amount, category)` (non-empty name, amount > 0, valid category), submitting the form should produce exactly one new transaction with a unique `id` not shared by any other transaction in the list, persist it to localStorage, and leave all form fields in their default empty state.

**Validates: Requirements 2.7**

---

### Property 7: Transaction list always reflects state exactly

*For any* array of transactions stored in state, every rendered list item should correspond to exactly one transaction in the array (correct name, amount, category), and no extra or missing items should appear.

**Validates: Requirements 3.1, 3.3**

---

### Property 8: Delete removes exactly one transaction

*For any* non-empty transaction list, deleting the transaction with a given `id` should result in a new list of length `n − 1` that does not contain any item with that `id`, and all other transactions remain unchanged.

**Validates: Requirements 3.4, 1.4**

---

### Property 9: Total Balance equals the arithmetic sum

*For any* array of transactions, the displayed Total Balance value should equal the sum of all `amount` fields in that array. This holds after every add, delete, and initialization operation.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

---

### Property 10: Pie Chart labels match transaction categories exactly

*For any* array of transactions, the set of labels displayed in the Pie Chart should be equal to the set of unique categories present in the transaction array — no more, no fewer — and each category's slice value should equal the sum of amounts for that category.

**Validates: Requirements 5.2, 5.1**

---

### Property 11: Pie Chart colors are consistent per category

*For any* rendering of the Pie Chart containing category `C`, the color assigned to `C` is always the same constant color regardless of the other categories present or the order of transactions.

**Validates: Requirements 5.5**

---

### Property 12: Sort by Amount produces ascending order

*For any* array of transactions, applying sort-by-amount should produce a permutation of that array where `transactions[i].amount ≤ transactions[i+1].amount` for all valid indices `i`.

**Validates: Requirements 6.2**

---

### Property 13: Sort by Category produces alphabetical ascending order

*For any* array of transactions, applying sort-by-category should produce a permutation of that array where `transactions[i].category ≤ transactions[i+1].category` (lexicographic) for all valid indices `i`.

**Validates: Requirements 6.3**

---

### Property 14: Active sort is preserved after adding a transaction

*For any* transaction list with an active sort order (amount or category), adding a new transaction should result in a list that is still sorted by the active sort criterion.

**Validates: Requirements 6.4**

---

### Property 15: Budget alert is shown if and only if total exceeds limit

*For any* combination of total balance and spending limit, the visual budget alert is displayed if and only if `total > limit` and a limit has been set (`limit ≠ null`). When `total ≤ limit` or no limit is set, no alert is displayed.

**Validates: Requirements 8.4, 8.5, 8.6**

---

### Property 16: Spending limit validation rejects non-positive inputs

*For any* value that is ≤ 0 or non-numeric, attempting to set it as the spending limit should leave the stored spending limit in localStorage unchanged and display an error message.

**Validates: Requirements 8.2, 8.3**
