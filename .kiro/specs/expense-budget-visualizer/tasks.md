# Implementation Plan: Expense Budget Visualizer

## Overview

Implementasi dilakukan secara inkremental mengikuti arsitektur Module Pattern di `js/script.js`. Setiap modul dibangun, diwire, lalu divalidasi sebelum lanjut ke modul berikutnya. File utama adalah `index.html`, `css/style.css`, dan `js/script.js`.

---

## Tasks

- [x] 1. Buat struktur file proyek dan HTML boilerplate
  - Buat `index.html` dengan elemen struktural: `#app-container`, header (judul + tombol theme toggle), section card untuk Input Form, Spending Limit, Total Balance + alert banner, Pie Chart + placeholder, Sort Controls + Transaction List, dan footer
  - Muat Chart.js dari CDN (`https://cdn.jsdelivr.net/npm/chart.js`) sebelum `<script src="js/script.js" defer>`
  - Buat `css/style.css` kosong dan `js/script.js` kosong sebagai placeholder
  - _Requirements: 9.1, 9.2_

- [x] 2. Implementasi StorageModule dan StateModule
  - [x] 2.1 Implementasi `StorageModule` di `js/script.js`
    - Definisikan konstanta key: `ebv_transactions`, `ebv_spending_limit`, `ebv_theme`
    - Implementasikan `loadTransactions()`, `saveTransactions()`, `loadLimit()`, `saveLimit()`, `loadTheme()`, `saveTheme()` dengan try/catch untuk graceful degradation saat localStorage tidak tersedia
    - Handle `JSON.parse` gagal dengan fallback ke `[]` untuk transaksi dan `null` untuk limit
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Implementasi `StateModule` di `js/script.js`
    - Definisikan state in-memory: `transactions[]`, `spendingLimit`, `currentTheme`, `activeSort`
    - Implementasikan getter dan setter untuk setiap state property
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.3 Tulis property test untuk Transaction persistence round-trip (Property 1)
    - **Property 1: Transaction persistence round-trip**
    - Untuk sembarang array transaksi, `saveTransactions(arr)` lalu `loadTransactions()` harus menghasilkan array yang identik (id, name, amount, category sama)
    - **Validates: Requirements 1.4**

  - [x] 2.4 Tulis property test untuk Spending Limit persistence round-trip (Property 2)
    - **Property 2: Spending limit persistence round-trip**
    - Untuk sembarang nilai positif, `saveLimit(v)` lalu `loadLimit()` harus mengembalikan nilai numerik yang sama
    - **Validates: Requirements 1.5**

  - [x] 2.5 Tulis property test untuk Theme persistence round-trip (Property 3)
    - **Property 3: Theme persistence round-trip**
    - Untuk setiap nilai `'dark'` atau `'light'`, `saveTheme(t)` lalu `loadTheme()` harus mengembalikan string yang identik
    - **Validates: Requirements 1.6, 1.3**

- [x] 3. Implementasi ValidationModule dan TransactionModule
  - [x] 3.1 Implementasi `ValidationModule` di `js/script.js`
    - Implementasikan `validateTransaction({ name, amount, category })` — kembalikan objek errors (kosong = valid)
    - Implementasikan `validateSpendingLimit(value)` — kembalikan `null` jika valid, string error jika tidak
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 8.2, 8.3_

  - [x] 3.2 Implementasi `TransactionModule` di `js/script.js`
    - Implementasikan `generateId()` menggunakan `Date.now()` + random string
    - Implementasikan `addTransaction(txArray, { name, amount, category })` — kembalikan array baru dengan transaksi baru
    - Implementasikan `deleteTransaction(txArray, id)` — kembalikan array baru tanpa transaksi yang dihapus
    - Implementasikan `calculateTotal(txArray)` — kembalikan sum dari seluruh `amount`
    - _Requirements: 2.7, 3.4, 4.1_

  - [x] 3.3 Tulis property test untuk form validation menolak nama invalid (Property 4)
    - **Property 4: Form validation rejects invalid names**
    - Untuk sembarang string yang hanya terdiri dari whitespace atau string kosong, `validateTransaction` harus mengembalikan error di field `name`
    - **Validates: Requirements 2.3, 2.6**

  - [x] 3.4 Tulis property test untuk form validation menolak amount non-positif (Property 5)
    - **Property 5: Form validation rejects non-positive amounts**
    - Untuk sembarang nilai numerik ≤ 0 atau string non-numerik, `validateTransaction` harus mengembalikan error di field `amount`
    - **Validates: Requirements 2.4, 2.6**

  - [x] 3.5 Tulis property test untuk valid submission membuat transaksi unik (Property 6)
    - **Property 6: Valid submission creates a unique transaction and resets form**
    - Untuk sembarang triple valid `(name, amount, category)`, `addTransaction` harus menghasilkan transaksi baru dengan `id` unik yang tidak ada di array sebelumnya
    - **Validates: Requirements 2.7**

  - [x] 3.6 Tulis property test untuk delete menghapus tepat satu transaksi (Property 8)
    - **Property 8: Delete removes exactly one transaction**
    - Untuk sembarang array non-empty, `deleteTransaction(arr, id)` harus menghasilkan array berukuran `n-1` tanpa item dengan id tersebut, dan semua item lain tetap utuh
    - **Validates: Requirements 3.4, 1.4**

  - [x] 3.7 Tulis property test untuk Total Balance sama dengan jumlah aritmetika (Property 9)
    - **Property 9: Total Balance equals the arithmetic sum**
    - Untuk sembarang array transaksi, `calculateTotal(arr)` harus sama dengan jumlah semua field `amount`
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x] 3.8 Tulis property test untuk spending limit validation menolak input non-positif (Property 16)
    - **Property 16: Spending limit validation rejects non-positive inputs**
    - Untuk sembarang nilai ≤ 0 atau non-numerik, `validateSpendingLimit(v)` harus mengembalikan string error (bukan null)
    - **Validates: Requirements 8.2, 8.3**

- [x] 4. Checkpoint — Pastikan seluruh unit dan property test modul inti lulus
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementasi SortModule
  - [x] 5.1 Implementasi `SortModule` di `js/script.js`
    - Implementasikan `sortByAmount(txArray)` — kembalikan salinan array diurutkan ascending by `amount`
    - Implementasikan `sortByCategory(txArray)` — kembalikan salinan array diurutkan ascending alphabetical by `category`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.2 Tulis property test untuk sort by amount menghasilkan urutan ascending (Property 12)
    - **Property 12: Sort by Amount produces ascending order**
    - Untuk sembarang array transaksi, hasil `sortByAmount` harus memenuhi `arr[i].amount ≤ arr[i+1].amount` untuk semua indeks valid
    - **Validates: Requirements 6.2**

  - [x] 5.3 Tulis property test untuk sort by category menghasilkan urutan alphabetical ascending (Property 13)
    - **Property 13: Sort by Category produces alphabetical ascending order**
    - Untuk sembarang array transaksi, hasil `sortByCategory` harus memenuhi `arr[i].category ≤ arr[i+1].category` (lexicographic) untuk semua indeks valid
    - **Validates: Requirements 6.3**

- [x] 6. Implementasi ChartModule
  - [x] 6.1 Implementasi `ChartModule` di `js/script.js`
    - Definisikan konstanta warna kategori: `Food: '#FF6384'`, `Transport: '#36A2EB'`, `Fun: '#FFCE56'`
    - Implementasikan `buildChartData(txArray)` — kelompokkan total per kategori, kembalikan `{ labels, data, colors }`
    - Implementasikan `render(txArray)` — destroy instance lama jika ada, render Pie Chart baru; jika array kosong tampilkan placeholder dan sembunyikan canvas
    - Handle Chart.js CDN gagal dimuat dengan menampilkan placeholder error
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Tulis property test untuk Pie Chart labels sesuai kategori transaksi (Property 10)
    - **Property 10: Pie Chart labels match transaction categories exactly**
    - Untuk sembarang array transaksi, `buildChartData(arr).labels` harus identik dengan himpunan kategori unik yang ada di array
    - **Validates: Requirements 5.2, 5.1**

  - [x] 6.3 Tulis property test untuk konsistensi warna per kategori (Property 11)
    - **Property 11: Pie Chart colors are consistent per category**
    - Untuk sembarang subset kategori yang dirender, warna yang ditetapkan ke setiap kategori selalu sama dengan konstanta `COLORS[category]`
    - **Validates: Requirements 5.5**

- [x] 7. Implementasi UIModule
  - [x] 7.1 Implementasi `UIModule` di `js/script.js`
    - Implementasikan `renderTransactionList(txArray)` — buat `<li>` per transaksi menampilkan name, amount, category, dan tombol Delete; tampilkan empty state message jika array kosong
    - Implementasikan `updateBalance(total)` — update elemen `#total-balance`
    - Implementasikan `updateAlert(total, limit)` — tampilkan/sembunyikan `#budget-alert` sesuai kondisi `total > limit && limit !== null`
    - Implementasikan `applyTheme(theme)` — toggle class `'dark'` pada `<body>`
    - Implementasikan `showFormErrors(errors)`, `clearFormErrors()`, `resetForm()`
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3, 4.4, 7.2, 7.3, 8.4, 8.5, 8.6_

  - [x] 7.2 Tulis property test untuk Transaction List selalu mencerminkan state (Property 7)
    - **Property 7: Transaction list always reflects state exactly**
    - Untuk sembarang array transaksi, setiap item yang dirender oleh `renderTransactionList` harus berkorespondensi tepat satu-satu dengan transaksi di array (name, amount, category cocok), tidak ada item lebih atau kurang
    - **Validates: Requirements 3.1, 3.3**

  - [x] 7.3 Tulis property test untuk budget alert ditampilkan jika dan hanya jika total melebihi limit (Property 15)
    - **Property 15: Budget alert is shown if and only if total exceeds limit**
    - Untuk sembarang kombinasi total dan limit, alert ditampilkan jika dan hanya jika `total > limit && limit !== null`
    - **Validates: Requirements 8.4, 8.5, 8.6**

- [x] 8. Implementasi AppInit — wiring semua modul dan event listeners
  - [x] 8.1 Implementasi `AppInit` di `js/script.js`
    - Load state dari localStorage via `StorageModule` ke `StateModule` saat DOMContentLoaded
    - Terapkan tema dari state sebelum render pertama (cegah flash of wrong theme)
    - Attach event listener pada form submit: validasi → tambah transaksi → simpan ke storage → apply sort → re-render UI + chart
    - Attach event listener pada tombol Delete (gunakan event delegation pada container list)
    - Attach event listener pada Spending Limit input: validasi → simpan ke storage → update state → update alert
    - Attach event listener pada sort control: update `activeSort` di state → re-render list
    - Attach event listener pada theme toggle: toggle tema → simpan ke storage → `applyTheme`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.7, 3.3, 3.4, 4.2, 4.3, 5.3, 6.4, 7.1, 7.4, 8.1_

  - [x] 8.2 Tulis property test untuk active sort dipertahankan setelah menambah transaksi (Property 14)
    - **Property 14: Active sort is preserved after adding a transaction**
    - Untuk sembarang array terurut dengan sort aktif, setelah `addTransaction` + re-sort, hasil akhir harus tetap memenuhi kriteria sort yang aktif
    - **Validates: Requirements 6.4**

- [x] 9. Implementasi CSS — mobile-first responsive layout dan theming
  - [x] 9.1 Tulis `css/style.css` dengan layout mobile-first dan dukungan dark mode
    - Definisikan CSS Custom Properties: `--bg`, `--surface`, `--text`, `--accent` untuk theming
    - Implementasikan override variabel di selektor `body.dark` untuk dark color scheme
    - Implementasikan card-based layout dengan `box-shadow`, `border-radius`, dan tipografi bersih
    - Implementasikan single-column layout (default, `< 768px`)
    - Implementasikan CSS Grid dua kolom dengan `@media (min-width: 768px)`: Form + Spending Limit di kiri, Chart + List di kanan
    - Pastikan Transaction List container scrollable (`overflow-y: auto` dengan `max-height`)
    - _Requirements: 9.2, 9.3, 7.2, 7.3_

- [x] 10. Checkpoint akhir — Pastikan seluruh test lulus dan fitur terintegrasi
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirement spesifik untuk keterlacakan
- Checkpoint memastikan validasi inkremental di setiap tahap
- Property tests memvalidasi invariant universal yang berlaku di semua eksekusi valid
- Unit tests memvalidasi contoh spesifik dan edge case
- Seluruh implementasi menggunakan Vanilla JS (ES6+), HTML5, CSS3 — tanpa framework atau build tool

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "8.1", "9.1"] },
    { "id": 7, "tasks": ["8.2"] }
  ]
}
```
