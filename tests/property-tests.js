/**
 * Property-Based Tests — Expense Budget Visualizer
 *
 * Runs in Node.js (no browser). Uses a localStorage mock so the
 * StorageModule logic can be exercised outside a DOM environment.
 *
 * Each test suite runs ≥ 100 random iterations to validate universal
 * properties that must hold across all valid inputs.
 */

'use strict';

// ---------------------------------------------------------------------------
// localStorage mock (in-memory Map)
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store = new Map();
  return {
    getItem(key)        { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key)     { store.delete(key); },
    clear()             { store.clear(); },
  };
})();

// Inject mock into the global scope so the StorageModule code can reference
// `localStorage` without modification.
global.localStorage = localStorageMock;

// ---------------------------------------------------------------------------
// Inline StorageModule (mirrors js/script.js exactly)
// ---------------------------------------------------------------------------
const StorageModule = (() => {
  const KEYS = {
    TRANSACTIONS: 'ebv_transactions',
    LIMIT:        'ebv_spending_limit',
    THEME:        'ebv_theme',
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

// ---------------------------------------------------------------------------
// Inline TransactionModule (mirrors js/script.js exactly)
// ---------------------------------------------------------------------------
const TransactionModule = (() => {
  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function addTransaction(txArray, { name, amount, category }) {
    const newTx = {
      id: generateId(),
      name: name.trim(),
      amount: parseFloat(amount),
      category,
    };
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

// ---------------------------------------------------------------------------
// Minimal property-testing harness
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runProperty(name, generator, predicate, iterations = 100) {
  console.log(`\n  Running: ${name} (${iterations} iterations)`);
  let counterexample = null;
  for (let i = 0; i < iterations; i++) {
    const input = generator(i);
    try {
      predicate(input);
    } catch (err) {
      counterexample = { iteration: i + 1, input, error: err.message };
      break;
    }
  }
  if (counterexample) {
    console.log(`  ✗ FAILED — counterexample at iteration ${counterexample.iteration}`);
    console.log(`    Input : ${JSON.stringify(counterexample.input)}`);
    console.log(`    Error : ${counterexample.error}`);
    failures.push({ name, ...counterexample });
    failed++;
  } else {
    console.log(`  ✓ PASSED`);
    passed++;
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Generates a variety of positive numeric values:
 * - small decimals (< 1)
 * - typical mid-range values
 * - large integers and floats
 * - values very close to zero (but still > 0)
 * - high-precision floats
 */
function positiveNumberGenerator(i) {
  // Deterministic seed for reproducibility across runs
  const seed = (i * 1_000_003 + 7) % 999_983; // prime-modulo shuffle

  const bucket = i % 6;
  switch (bucket) {
    case 0: return 0.01 + (seed % 99) * 0.01;            // small decimals 0.01–0.99
    case 1: return 1 + (seed % 999);                      // integers 1–999
    case 2: return 1_000 + (seed % 999_000);              // integers 1000–999999
    case 3: return (seed % 100) / 100 + 0.001;            // high-precision close to 0
    case 4: return parseFloat(((seed % 10000) / 100).toFixed(2)); // 2 dp floats
    case 5: return 1_000_000 + seed * 1.5;                // large floats
    default: return 1;
  }
}

// ---------------------------------------------------------------------------
// Property 1: Transaction persistence round-trip
// Validates: Requirements 1.4
// ---------------------------------------------------------------------------
/**
 * Generates an array of 0–5 transactions with deterministic values.
 */
function transactionArrayGenerator(i) {
  const categories = ['Food', 'Transport', 'Fun'];
  const count = i % 6; // 0 to 5 transactions
  const arr = [];
  for (let j = 0; j < count; j++) {
    const seed = (i * 31 + j * 97) % 1000;
    arr.push({
      id:       `${i}-${j}`,
      name:     `Expense ${i}-${j}`,
      amount:   parseFloat((1 + seed * 0.99).toFixed(2)),
      category: categories[seed % 3],
    });
  }
  return arr;
}

console.log('\n=== Property 1: Transaction persistence round-trip ===');
console.log('Validates: Requirements 1.4\n');

runProperty(
  'saveTransactions(arr) → loadTransactions() returns identical array',
  transactionArrayGenerator,
  (arr) => {
    localStorage.clear();
    StorageModule.saveTransactions(arr);
    const loaded = StorageModule.loadTransactions();

    assert(
      loaded.length === arr.length,
      `Length mismatch: expected ${arr.length}, got ${loaded.length}`
    );

    for (let i = 0; i < arr.length; i++) {
      const orig = arr[i];
      const back = loaded[i];
      assert(back.id       === orig.id,       `id mismatch at [${i}]: expected ${orig.id}, got ${back.id}`);
      assert(back.name     === orig.name,     `name mismatch at [${i}]: expected "${orig.name}", got "${back.name}"`);
      assert(back.amount   === orig.amount,   `amount mismatch at [${i}]: expected ${orig.amount}, got ${back.amount}`);
      assert(back.category === orig.category, `category mismatch at [${i}]: expected ${orig.category}, got ${back.category}`);
    }
  },
  100
);

// ---------------------------------------------------------------------------
// Property 2: Spending limit persistence round-trip
// Validates: Requirements 1.5
// ---------------------------------------------------------------------------
console.log('\n=== Property 2: Spending limit persistence round-trip ===');
console.log('Validates: Requirements 1.5\n');

runProperty(
  'saveLimit(v) → loadLimit() returns the same numeric value',
  positiveNumberGenerator,
  (v) => {
    localStorage.clear();
    StorageModule.saveLimit(v);
    const loaded = StorageModule.loadLimit();

    assert(
      loaded !== null,
      `Expected a number but got null for input ${v}`
    );

    // Compare with a small tolerance (1e-9) to account for floating-point
    // string serialization in localStorage (String(v) → parseFloat).
    const tolerance = 1e-9;
    const diff = Math.abs(loaded - v);
    assert(
      diff <= tolerance,
      `Round-trip value mismatch: saved ${v}, loaded ${loaded} (diff ${diff} > tolerance ${tolerance})`
    );
  },
  100
);

// ---------------------------------------------------------------------------
// Property 3: Theme persistence round-trip
// Validates: Requirements 1.6, 1.3
// ---------------------------------------------------------------------------
/**
 * Generates alternating theme values: 'dark' or 'light'.
 * Each iteration cycles through valid theme preferences.
 */
function themeGenerator(i) {
  const themes = ['dark', 'light'];
  return themes[i % 2];
}

console.log('\n=== Property 3: Theme persistence round-trip ===');
console.log('Validates: Requirements 1.6, 1.3\n');

runProperty(
  'saveTheme(t) → loadTheme() returns the identical string',
  themeGenerator,
  (theme) => {
    localStorage.clear();
    StorageModule.saveTheme(theme);
    const loaded = StorageModule.loadTheme();

    assert(
      loaded === theme,
      `Round-trip theme mismatch: saved "${theme}", loaded "${loaded}"`
    );

    assert(
      typeof loaded === 'string',
      `Expected string but got ${typeof loaded}`
    );
  },
  100
);



// ---------------------------------------------------------------------------
// Property 6: Valid submission creates a unique transaction
// Validates: Requirements 2.7
// ---------------------------------------------------------------------------
/**
 * Generates valid transaction input triples (name, amount, category)
 * and an existing transaction array.
 */
function validTransactionInputGenerator(i) {
  const categories = ['Food', 'Transport', 'Fun'];
  
  // Generate existing transactions (0-5 existing transactions)
  const existingCount = i % 6;
  const existingTransactions = [];
  const existingIds = new Set();
  
  for (let j = 0; j < existingCount; j++) {
    const seed = (i * 31 + j * 97) % 1000;
    const id = `existing-${i}-${j}`;
    existingIds.add(id);
    existingTransactions.push({
      id,
      name: `Existing expense ${i}-${j}`,
      amount: parseFloat((1 + seed * 0.99).toFixed(2)),
      category: categories[seed % 3],
    });
  }
  
  // Generate valid input triple for new transaction
  const names = [
    'Coffee',
    'Lunch',
    'Groceries',
    'Taxi fare',
    'Movie ticket',
    'Gas bill',
    'Internet',
    'Dinner',
    'Snack',
    'Transport pass',
    'Concert ticket',
    'Name with spaces',
    'Name-with-dashes',
    'Name_with_underscores',
    'A',
  ];
  
  const seed = (i * 1009 + 13) % 1000;
  const name = names[seed % names.length];
  const amount = positiveNumberGenerator(i);
  const category = categories[seed % 3];
  
  return {
    existingTransactions,
    existingIds,
    input: { name, amount, category },
  };
}

console.log('\n=== Property 6: Valid submission creates a unique transaction ===');
console.log('Validates: Requirements 2.7\n');

runProperty(
  'addTransaction creates a new transaction with a unique id not in the original array',
  validTransactionInputGenerator,
  ({ existingTransactions, existingIds, input }) => {
    // Call addTransaction
    const result = TransactionModule.addTransaction(existingTransactions, input);
    
    // Check 1: Result array length should be original length + 1
    assert(
      result.length === existingTransactions.length + 1,
      `Expected result length ${existingTransactions.length + 1}, got ${result.length}`
    );
    
    // Check 2: The new transaction should be at the end of the array
    const newTransaction = result[result.length - 1];
    
    assert(
      newTransaction !== undefined,
      'New transaction is undefined'
    );
    
    // Check 3: The new transaction must have an id property
    assert(
      newTransaction.id !== undefined && newTransaction.id !== null,
      'New transaction must have an id property'
    );
    
    // Check 4: The new transaction's id must be unique (not in existingIds)
    assert(
      !existingIds.has(newTransaction.id),
      `New transaction id "${newTransaction.id}" is not unique; it already exists in the original array`
    );
    
    // Check 5: The new transaction's id should not match any other id in the result array
    const allIdsInResult = result.map(tx => tx.id);
    const uniqueIdsInResult = new Set(allIdsInResult);
    assert(
      allIdsInResult.length === uniqueIdsInResult.size,
      `Result array contains duplicate ids. All ids: ${JSON.stringify(allIdsInResult)}`
    );
    
    // Check 6: The new transaction should have the correct name (trimmed)
    assert(
      newTransaction.name === input.name.trim(),
      `Expected name "${input.name.trim()}", got "${newTransaction.name}"`
    );
    
    // Check 7: The new transaction should have the correct amount (parsed to float)
    const expectedAmount = parseFloat(input.amount);
    const tolerance = 1e-10;
    const diff = Math.abs(newTransaction.amount - expectedAmount);
    assert(
      diff <= tolerance,
      `Expected amount ${expectedAmount}, got ${newTransaction.amount} (diff ${diff})`
    );
    
    // Check 8: The new transaction should have the correct category
    assert(
      newTransaction.category === input.category,
      `Expected category "${input.category}", got "${newTransaction.category}"`
    );
    
    // Check 9: All existing transactions should still be present in the result
    // (with same content and order)
    for (let i = 0; i < existingTransactions.length; i++) {
      const orig = existingTransactions[i];
      const resultItem = result[i];
      
      assert(
        resultItem.id === orig.id,
        `Existing transaction [${i}] has different id: expected ${orig.id}, got ${resultItem.id}`
      );
      assert(
        resultItem.name === orig.name,
        `Existing transaction [${i}] has different name: expected "${orig.name}", got "${resultItem.name}"`
      );
      assert(
        resultItem.amount === orig.amount,
        `Existing transaction [${i}] has different amount: expected ${orig.amount}, got ${resultItem.amount}`
      );
      assert(
        resultItem.category === orig.category,
        `Existing transaction [${i}] has different category: expected ${orig.category}, got ${resultItem.category}`
      );
    }
  },
  100
);

// ---------------------------------------------------------------------------
// Property 8: Delete removes exactly one transaction
// Validates: Requirements 3.4, 1.4
// ---------------------------------------------------------------------------
/**
 * Generates a non-empty array of 1–5 transactions,
 * and an ID to delete (which may or may not exist in the array).
 */
function deleteTransactionInputGenerator(i) {
  const categories = ['Food', 'Transport', 'Fun'];
  const count = 1 + (i % 5); // 1–5 transactions (ensure non-empty)
  const arr = [];
  let targetId = null;

  for (let j = 0; j < count; j++) {
    const seed = (i * 31 + j * 97) % 1000;
    const id = `tx-${i}-${j}`;
    if (j === 0) targetId = id; // first transaction is deletion target
    arr.push({
      id,
      name:     `Expense ${i}-${j}`,
      amount:   parseFloat((1 + seed * 0.99).toFixed(2)),
      category: categories[seed % 3],
    });
  }

  // Occasionally test with a non-existent ID
  if (i % 10 === 0) {
    targetId = `nonexistent-${i}`;
  }

  return { arr, targetId };
}

console.log('\n=== Property 8: Delete removes exactly one transaction ===');
console.log('Validates: Requirements 3.4, 1.4\n');

runProperty(
  'deleteTransaction(arr, id) removes exactly one item (if exists), preserves all others',
  deleteTransactionInputGenerator,
  ({ arr, targetId }) => {
    // Count how many items with the target ID exist in the original array
    const countWithId = arr.filter(tx => tx.id === targetId).length;

    // Call deleteTransaction
    const result = TransactionModule.deleteTransaction(arr, targetId);

    // Check 1: Result length should be n - 1 if ID existed, or n if it didn't
    const expectedLength = arr.length - countWithId;
    assert(
      result.length === expectedLength,
      `Length mismatch: original ${arr.length}, deleted id "${targetId}" (count: ${countWithId}), expected result length ${expectedLength}, got ${result.length}`
    );

    // Check 2: Result should not contain any item with the target ID
    const resultHasTargetId = result.some(tx => tx.id === targetId);
    assert(
      !resultHasTargetId,
      `Expected no items with id "${targetId}" in result, but found at least one`
    );

    // Check 3: All other items should remain in the result (with same content)
    const itemsWithoutTargetId = arr.filter(tx => tx.id !== targetId);
    assert(
      result.length === itemsWithoutTargetId.length,
      `Count of non-target items mismatch: expected ${itemsWithoutTargetId.length}, got ${result.length}`
    );

    // Check 4: Verify each non-target item is still present in the result
    // (by checking same order and content)
    for (let i = 0; i < itemsWithoutTargetId.length; i++) {
      const orig = itemsWithoutTargetId[i];
      const resultItem = result[i];

      assert(
        resultItem.id === orig.id,
        `Preserved item [${i}] has different id: expected ${orig.id}, got ${resultItem.id}`
      );
      assert(
        resultItem.name === orig.name,
        `Preserved item [${i}] has different name: expected "${orig.name}", got "${resultItem.name}"`
      );
      assert(
        resultItem.amount === orig.amount,
        `Preserved item [${i}] has different amount: expected ${orig.amount}, got ${resultItem.amount}`
      );
      assert(
        resultItem.category === orig.category,
        `Preserved item [${i}] has different category: expected ${orig.category}, got ${resultItem.category}`
      );
    }
  },
  100
);

// ---------------------------------------------------------------------------
// ValidationModule (mirrors js/script.js exactly for testing)
// ---------------------------------------------------------------------------
const ValidationModule = (() => {
  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

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

    // Validate name — must be non-empty and not pure whitespace
    if (!name || name.trim() === '') {
      errors.name = 'Name is required.';
    }

    // Validate amount — must parse to a finite number greater than zero
    if (!isPositiveFiniteNumber(amount)) {
      errors.amount = 'Amount must be a positive number.';
    }

    // Validate category — must be one of the accepted values
    if (!category || !VALID_CATEGORIES.includes(category)) {
      errors.category = 'Please select a category.';
    }

    return errors; // empty object = all valid
  }

  function validateSpendingLimit(value) {
    if (!isPositiveFiniteNumber(value)) {
      return 'Spending limit must be a positive number.';
    }
    return null; // valid
  }

  return { validateTransaction, validateSpendingLimit };
})();

// ---------------------------------------------------------------------------
// Property 4: Form validation rejects invalid names
// Validates: Requirements 2.3, 2.6
// ---------------------------------------------------------------------------
/**
 * Generates various whitespace-only and empty strings:
 * - empty string
 * - single space
 * - multiple spaces
 * - tabs
 * - newlines
 * - mixed whitespace
 * - combinations of the above
 */
function invalidNameGenerator(i) {
  const whitespaceVariants = [
    '',                              // empty string
    ' ',                             // single space
    '  ',                            // two spaces
    '   ',                           // three spaces
    '\t',                            // tab
    '\n',                            // newline
    '\r',                            // carriage return
    ' \t ',                          // mixed: space-tab-space
    '\t\t\t',                        // multiple tabs
    '\n\n',                          // multiple newlines
    '  \t  \n  ',                    // complex mix
    '\r\n',                          // CRLF
    ' \t\n\r ',                      // comprehensive whitespace
    '\u00A0',                        // non-breaking space (U+00A0)
    ' \u00A0 ',                      // space + non-breaking space + space
  ];
  
  const index = i % whitespaceVariants.length;
  return whitespaceVariants[index];
}

console.log('\n=== Property 4: Form validation rejects invalid names ===');
console.log('Validates: Requirements 2.3, 2.6\n');

runProperty(
  'validateTransaction rejects all whitespace-only and empty names',
  invalidNameGenerator,
  (invalidName) => {
    // Use valid amount and category to isolate name validation
    const validAmount = 50;
    const validCategory = 'Food';

    const errors = ValidationModule.validateTransaction({
      name: invalidName,
      amount: validAmount,
      category: validCategory,
    });

    // The errors object must contain a 'name' field indicating rejection
    assert(
      errors.name !== undefined && errors.name !== null && errors.name !== '',
      `Expected name error for "${invalidName}", but got no error. Errors: ${JSON.stringify(errors)}`
    );

    // Verify no other field errors are present (name is the only invalid field)
    assert(
      errors.amount === undefined || errors.amount === null,
      `Unexpected amount error: ${errors.amount}`
    );
    assert(
      errors.category === undefined || errors.category === null,
      `Unexpected category error: ${errors.category}`
    );
  },
  100
);

// ---------------------------------------------------------------------------
// Property 4 (continued): Valid names must not produce name errors
// Validates: Requirements 2.3, 2.6
// ---------------------------------------------------------------------------
/**
 * Generates valid, non-whitespace names.
 */
function validNameGenerator(i) {
  const validNames = [
    'Coffee',
    'Lunch',
    'Groceries',
    'Taxi fare',
    'Movie ticket',
    'Gas',
    'Internet bill',
    'A',
    '123',
    'Name with   multiple spaces',
    'Name-with-dashes',
    'Name_with_underscores',
    'CamelCaseName',
    'UPPERCASE',
    'lowercase',
    'Mixed Case Name',
    'Name with 123 numbers',
    '!@#$%^&*()',
    'Unicode: café',
    'Name  with  tabs\t\ttabs',
  ];
  
  const index = i % validNames.length;
  return validNames[index];
}

console.log('\n=== Property 4 (continued): Valid names accepted ===');
console.log('Validates: Requirements 2.3, 2.6\n');

runProperty(
  'validateTransaction accepts all valid non-empty names',
  validNameGenerator,
  (validName) => {
    // Use valid amount and category
    const validAmount = 50;
    const validCategory = 'Food';

    const errors = ValidationModule.validateTransaction({
      name: validName,
      amount: validAmount,
      category: validCategory,
    });

    // The name field must NOT have an error
    assert(
      errors.name === undefined || errors.name === null,
      `Expected no name error for "${validName}", but got: ${errors.name}`
    );
  },
  100
);

// ---------------------------------------------------------------------------
// Property 5: Form validation rejects non-positive amounts
// Validates: Requirements 2.4, 2.6
// ---------------------------------------------------------------------------
/**
 * Generates various non-positive numeric values and non-numeric strings:
 * - zero
 * - negative integers
 * - negative floats
 * - non-numeric strings
 * - special edge cases (Infinity, -Infinity, NaN representations)
 */
function invalidAmountGenerator(i) {
  const invalidAmounts = [
    0,                               // exactly zero
    -1,                              // negative integer
    -0.01,                           // negative small decimal
    -100,                            // negative large integer
    -999.99,                         // negative large float
    'abc',                           // non-numeric string
    '',                              // empty string
    ' ',                             // whitespace string
    'not a number',                  // phrase
    '10abc',                         // partial numeric
    'abc10',                         // partial numeric (reversed)
    '-',                             // just minus sign
    '+',                             // just plus sign
    '.',                             // just decimal point
    '1.2.3',                         // invalid decimal format
    'NaN',                           // string 'NaN'
    'Infinity',                      // string 'Infinity'
    '-Infinity',                     // string '-Infinity'
    null,                            // null
    undefined,                       // undefined
    '0',                             // string zero
    '-0',                            // string negative zero
    '  0  ',                         // padded zero
    '  -5  ',                        // padded negative
    '1e-1000',                       // extremely small scientific notation (rounds to 0)
    -0.0000001,                      // very small negative
    -0,                              // negative zero (JavaScript edge case)
  ];
  
  const index = i % invalidAmounts.length;
  return invalidAmounts[index];
}

console.log('\n=== Property 5: Form validation rejects non-positive amounts ===');
console.log('Validates: Requirements 2.4, 2.6\n');

runProperty(
  'validateTransaction rejects all non-positive and non-numeric amounts',
  invalidAmountGenerator,
  (invalidAmount) => {
    // Use valid name and category to isolate amount validation
    const validName = 'Test Expense';
    const validCategory = 'Food';

    const errors = ValidationModule.validateTransaction({
      name: validName,
      amount: invalidAmount,
      category: validCategory,
    });

    // The errors object must contain an 'amount' field indicating rejection
    assert(
      errors.amount !== undefined && errors.amount !== null && errors.amount !== '',
      `Expected amount error for "${invalidAmount}" (type: ${typeof invalidAmount}), but got no error. Errors: ${JSON.stringify(errors)}`
    );

    // Verify no other field errors are present (amount is the only invalid field)
    assert(
      errors.name === undefined || errors.name === null,
      `Unexpected name error: ${errors.name}`
    );
    assert(
      errors.category === undefined || errors.category === null,
      `Unexpected category error: ${errors.category}`
    );
  },
  150  // Use more iterations to cover all edge cases
);

// ---------------------------------------------------------------------------
// Property 5 (continued): Valid positive amounts must not produce amount errors
// Validates: Requirements 2.4, 2.6
// ---------------------------------------------------------------------------
/**
 * Generates valid positive numeric values (as numbers or strings):
 * - small positive floats
 * - integers
 * - large numbers
 * - string representations of valid numbers
 */
function validAmountGenerator(i) {
  const bucket = i % 12;
  
  switch (bucket) {
    case 0: return 0.01;                               // minimum positive
    case 1: return 0.5;                                // small decimal
    case 2: return 1;                                  // unit integer
    case 3: return 10;                                 // small integer
    case 4: return 99.99;                              // typical float
    case 5: return 100;                                // round hundred
    case 6: return 1000.50;                            // large with decimal
    case 7: return 999999.99;                          // very large
    case 8: return '50';                               // string integer
    case 9: return '25.75';                            // string float
    case 10: return '  100.50  ';                      // padded string (valid)
    case 11: return parseFloat((1 + (i % 100)).toFixed(2)); // varying values
    default: return 1;
  }
}

console.log('\n=== Property 5 (continued): Valid positive amounts accepted ===');
console.log('Validates: Requirements 2.4, 2.6\n');

runProperty(
  'validateTransaction accepts all valid positive amounts',
  validAmountGenerator,
  (validAmount) => {
    // Use valid name and category
    const validName = 'Test Expense';
    const validCategory = 'Food';

    const errors = ValidationModule.validateTransaction({
      name: validName,
      amount: validAmount,
      category: validCategory,
    });

    // The amount field must NOT have an error
    assert(
      errors.amount === undefined || errors.amount === null,
      `Expected no amount error for ${validAmount} (type: ${typeof validAmount}), but got: ${errors.amount}`
    );
  },
  100
);

// ---------------------------------------------------------------------------
// Property 9: Total Balance equals the arithmetic sum
// Validates: Requirements 4.1, 4.2, 4.3, 4.4
// ---------------------------------------------------------------------------
/**
 * Generates diverse transaction arrays:
 * - empty array (edge case)
 * - single transaction
 * - multiple transactions with varying amounts
 * Edge cases: very small amounts, large amounts, high precision
 */
function totalBalanceTransactionGenerator(i) {
  const categories = ['Food', 'Transport', 'Fun'];
  const bucket = i % 7;
  const arr = [];

  switch (bucket) {
    case 0: {
      // Empty array (edge case)
      return arr;
    }
    case 1: {
      // Single transaction
      const amount = parseFloat((1 + (i % 100) * 0.5).toFixed(2));
      arr.push({
        id: `single-${i}`,
        name: 'Single expense',
        amount: amount,
        category: 'Food',
      });
      return arr;
    }
    case 2: {
      // 2-3 transactions with small amounts
      const count = 2 + (i % 2);
      for (let j = 0; j < count; j++) {
        const seed = (i * 17 + j * 19) % 1000;
        arr.push({
          id: `small-${i}-${j}`,
          name: `Small expense ${j}`,
          amount: parseFloat((0.01 + (seed % 100) * 0.01).toFixed(2)),
          category: categories[seed % 3],
        });
      }
      return arr;
    }
    case 3: {
      // 3-5 transactions with large amounts
      const count = 3 + (i % 3);
      for (let j = 0; j < count; j++) {
        const seed = (i * 23 + j * 29) % 1000;
        arr.push({
          id: `large-${i}-${j}`,
          name: `Large expense ${j}`,
          amount: parseFloat((100 + seed * 5).toFixed(2)),
          category: categories[seed % 3],
        });
      }
      return arr;
    }
    case 4: {
      // 2-4 transactions with mixed amounts
      const count = 2 + (i % 3);
      for (let j = 0; j < count; j++) {
        const seed = (i * 31 + j * 37) % 1000;
        const val = seed % 3 === 0 ? 0.5 : seed % 3 === 1 ? 25.75 : 1000.99;
        arr.push({
          id: `mixed-${i}-${j}`,
          name: `Mixed expense ${j}`,
          amount: val,
          category: categories[seed % 3],
        });
      }
      return arr;
    }
    case 5: {
      // High-precision floats
      const count = 2 + (i % 4);
      for (let j = 0; j < count; j++) {
        const seed = (i * 41 + j * 43) % 1000;
        arr.push({
          id: `precise-${i}-${j}`,
          name: `Precise expense ${j}`,
          amount: parseFloat(((seed / 100) * Math.PI).toFixed(2)),
          category: categories[seed % 3],
        });
      }
      return arr;
    }
    case 6: {
      // 5-10 transactions (stress test)
      const count = 5 + (i % 6);
      for (let j = 0; j < count; j++) {
        const seed = (i * 47 + j * 53) % 1000;
        arr.push({
          id: `stress-${i}-${j}`,
          name: `Stress expense ${j}`,
          amount: parseFloat((Math.random() * 500 + 1).toFixed(2)),
          category: categories[seed % 3],
        });
      }
      return arr;
    }
    default:
      return arr;
  }
}

console.log('\n=== Property 9: Total Balance equals the arithmetic sum ===');
console.log('Validates: Requirements 4.1, 4.2, 4.3, 4.4\n');

runProperty(
  'calculateTotal(arr) equals the arithmetic sum of all amount fields',
  totalBalanceTransactionGenerator,
  (arr) => {
    // Calculate total using the TransactionModule function
    const calculatedTotal = TransactionModule.calculateTotal(arr);

    // Calculate expected total manually (reference implementation)
    let expectedTotal = 0;
    for (let i = 0; i < arr.length; i++) {
      expectedTotal += arr[i].amount;
    }

    // The totals should be arithmetically equal
    // Use a small tolerance (1e-10) to account for floating-point precision
    const tolerance = 1e-10;
    const diff = Math.abs(calculatedTotal - expectedTotal);

    assert(
      diff <= tolerance,
      `Total mismatch: calculateTotal returned ${calculatedTotal}, expected ${expectedTotal} (diff ${diff} > tolerance ${tolerance}). Array: ${JSON.stringify(arr)}`
    );

    // Additional validation: for empty array, total must be 0
    if (arr.length === 0) {
      assert(
        calculatedTotal === 0,
        `Empty array should return 0, got ${calculatedTotal}`
      );
    }
  },
  100
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailing properties:');
  failures.forEach(f => console.log(`  - ${f.name}`));
  process.exit(1);
} else {
  console.log('\nAll properties hold. ✓');
  process.exit(0);
}
