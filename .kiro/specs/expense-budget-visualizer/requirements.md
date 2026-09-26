# Requirements Document

## Introduction

Expense Budget Visualizer adalah aplikasi web single-page berbasis Pure HTML5, CSS3, dan Vanilla JS (ES6+) yang memungkinkan pengguna mencatat transaksi pengeluaran, memvisualisasikan distribusi pengeluaran per kategori menggunakan Pie Chart, dan memantau total pengeluaran terhadap batas anggaran yang ditentukan sendiri. Seluruh data disimpan menggunakan localStorage. Desain mengutamakan pendekatan mobile-first dengan tampilan modern bergaya aplikasi keuangan.

## Glossary

- **App**: Aplikasi Expense Budget Visualizer secara keseluruhan.
- **Transaction**: Satu entri pengeluaran dengan properti `{ id: String/Number, name: String, amount: Number, category: String }`.
- **Transaction List**: Daftar seluruh transaksi yang tersimpan dan ditampilkan secara scrollable.
- **Input Form**: Formulir di halaman utama untuk menambahkan transaksi baru.
- **Total Balance**: Nilai akumulasi total amount dari seluruh transaksi yang ditampilkan secara real-time.
- **Pie Chart**: Grafik lingkaran yang dirender menggunakan Chart.js via CDN untuk menampilkan distribusi pengeluaran per kategori.
- **Category**: Klasifikasi transaksi; nilai yang valid adalah `Food`, `Transport`, dan `Fun`.
- **Spending Limit**: Nilai batas anggaran (angka positif) yang diinput oleh pengguna dan disimpan ke localStorage.
- **Dark Mode**: Tema tampilan gelap yang preferensinya disimpan ke localStorage.
- **Light Mode**: Tema tampilan terang (default) yang preferensinya disimpan ke localStorage.
- **localStorage**: Web Storage API browser untuk persistensi data transaksi, preferensi tema, dan spending limit.

---

## Requirements

### Requirement 1 — Data Persistence

**User Story:** As a user, I want my transactions, spending limit, and theme preference to persist across browser sessions, so that I don't lose my data when I refresh or close the tab.

#### Acceptance Criteria

1. WHEN the App initializes, THE App SHALL load all stored transactions from localStorage and render them in the Transaction List.
2. WHEN the App initializes, THE App SHALL load the stored Spending Limit value from localStorage and populate the spending limit input field with that value.
3. WHEN the App initializes, THE App SHALL load the stored theme preference from localStorage and apply the corresponding Dark Mode or Light Mode to the UI.
4. WHEN a Transaction is added or deleted, THE App SHALL persist the updated Transaction array to localStorage immediately.
5. WHEN the Spending Limit is updated by the user, THE App SHALL persist the new Spending Limit value to localStorage immediately.
6. WHEN the theme preference is toggled, THE App SHALL persist the new theme preference to localStorage immediately.

---

### Requirement 2 — Input Form & Validation

**User Story:** As a user, I want to add a new expense transaction through a validated form, so that only valid data is stored and displayed.

#### Acceptance Criteria

1. THE Input Form SHALL contain three fields: a text field for transaction name, a numeric field for amount, and a dropdown selector for category.
2. THE Input Form category dropdown SHALL offer exactly three options: `Food`, `Transport`, and `Fun`.
3. WHEN the user submits the Input Form, THE App SHALL validate that the name field is not empty.
4. WHEN the user submits the Input Form, THE App SHALL validate that the amount field contains a numeric value greater than zero (`amount > 0`).
5. WHEN the user submits the Input Form, THE App SHALL validate that a category has been selected.
6. IF any validation rule is violated upon form submission, THEN THE App SHALL display an inline error message adjacent to the invalid field and SHALL NOT create a Transaction.
7. WHEN all validation rules pass upon form submission, THE App SHALL create a new Transaction with a unique `id`, persist the Transaction to localStorage, and reset the Input Form fields to their default empty state.

---

### Requirement 3 — Transaction List Display

**User Story:** As a user, I want to see all my transactions in a scrollable list with the option to delete any entry, so that I can manage my expense records.

#### Acceptance Criteria

1. THE Transaction List SHALL display all stored transactions, with each item showing the transaction name, amount, and category.
2. THE Transaction List container SHALL be scrollable when the number of transactions exceeds the visible area.
3. WHEN a Transaction is added, THE Transaction List SHALL update immediately to include the new Transaction without requiring a page reload.
4. WHEN the user clicks the Delete button on a Transaction item, THE App SHALL remove that Transaction from localStorage and re-render the Transaction List immediately.
5. WHEN all transactions are deleted, THE Transaction List SHALL display an empty state message indicating no transactions exist.

---

### Requirement 4 — Total Balance Display

**User Story:** As a user, I want to see the total of all my expenses in real-time, so that I always know how much I have spent in aggregate.

#### Acceptance Criteria

1. THE App SHALL display the Total Balance as the sum of all Transaction `amount` values.
2. WHEN a Transaction is added, THE App SHALL update the Total Balance display immediately to reflect the new sum.
3. WHEN a Transaction is deleted, THE App SHALL update the Total Balance display immediately to reflect the updated sum.
4. WHILE no transactions exist, THE App SHALL display the Total Balance as `0`.

---

### Requirement 5 — Pie Chart Visualization

**User Story:** As a user, I want to see a pie chart showing the distribution of my spending by category, so that I can quickly understand where my money goes.

#### Acceptance Criteria

1. THE App SHALL render a Pie Chart using Chart.js (loaded via CDN) that visualizes total spending grouped by Category.
2. THE Pie Chart SHALL display exactly the categories that have at least one Transaction; categories with no transactions SHALL be omitted from the chart.
3. WHEN a Transaction is added or deleted, THE App SHALL destroy the existing Pie Chart instance and re-render a new Pie Chart to reflect the updated category totals.
4. WHILE no transactions exist, THE App SHALL display a placeholder message in place of the Pie Chart indicating there is no data to visualize.
5. THE Pie Chart SHALL assign a distinct, consistent color to each of the three categories (`Food`, `Transport`, `Fun`).

---

### Requirement 6 — Sort Transactions (Challenge 1)

**User Story:** As a user, I want to sort my transaction list by amount or category, so that I can view my expenses in a meaningful order.

#### Acceptance Criteria

1. THE App SHALL provide a sort control (dropdown or button group) with at least two options: sort by `Amount` and sort by `Category`.
2. WHEN the user selects sort by `Amount`, THE App SHALL re-render the Transaction List in ascending order of Transaction `amount`.
3. WHEN the user selects sort by `Category`, THE App SHALL re-render the Transaction List in alphabetical ascending order of Transaction `category`.
4. WHEN a sort option is active and a new Transaction is added, THE App SHALL apply the active sort order to the updated Transaction List before rendering.

---

### Requirement 7 — Dark/Light Mode Toggle (Challenge 2)

**User Story:** As a user, I want to toggle between dark and light themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a visible toggle control (button or switch) to switch between Dark Mode and Light Mode.
2. WHEN the user activates Dark Mode, THE App SHALL apply a dark color scheme across all UI components immediately.
3. WHEN the user activates Light Mode, THE App SHALL apply a light color scheme across all UI components immediately.
4. THE App SHALL apply the persisted theme preference from localStorage on initialization before first render to prevent a flash of the wrong theme.

---

### Requirement 8 — Spending Limit Alert (Challenge 3)

**User Story:** As a user, I want to set a spending limit and receive a visual alert when my total expenses exceed it, so that I can stay within my budget.

#### Acceptance Criteria

1. THE App SHALL provide a numeric input field on the main page where the user can enter a Spending Limit value.
2. WHEN the user submits or changes the Spending Limit input, THE App SHALL accept only a positive numeric value (`Spending Limit > 0`).
3. IF the user enters a non-positive or non-numeric value in the Spending Limit field, THEN THE App SHALL display an error message and SHALL NOT update the stored Spending Limit.
4. WHILE the Total Balance exceeds the stored Spending Limit, THE App SHALL display a prominent visual alert (e.g., highlighted warning banner or color change on Total Balance) indicating the budget has been exceeded.
5. WHEN the Total Balance falls at or below the Spending Limit (due to a deletion), THE App SHALL remove the visual alert immediately.
6. WHILE no Spending Limit has been set, THE App SHALL NOT display any budget-exceeded alert.

---

### Requirement 9 — UI & Responsive Layout

**User Story:** As a user, I want a modern, mobile-friendly interface, so that I can use the app comfortably on any device.

#### Acceptance Criteria

1. THE App SHALL be delivered as three files: `index.html`, `css/style.css`, and `js/script.js`, with no additional framework or library dependencies beyond Chart.js loaded via CDN.
2. THE App SHALL use a card-based layout with visible box-shadow, rounded corners, and clean typography across all UI sections.
3. THE App SHALL implement a mobile-first responsive design where the single-column layout adapts to a wider multi-column layout on viewports wider than or equal to 768px.
4. THE App SHALL NOT use React, Vue, jQuery, or any JavaScript library other than Chart.js.
