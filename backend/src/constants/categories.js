// Mirror of frontend/src/constants/categories.js — CommonJS format.
// Keep in sync when adding/renaming categories.

const CATEGORIES = {
  wants: [
    'Food', 'Coffee', 'Dog', 'Travel', 'Donation', 'Subscriptions',
    'Misc', 'Gifts', 'Alcohol', 'Entertainment', 'Video Games',
    'Sports Gambling', 'Appliances', 'Clothes', 'Gym', 'Children',
  ],
  needs: [
    'Mortgage', 'HOA', 'Car - Payment', 'Internet', 'Phone',
    'Car - Insurance', 'Bill - Utilities', 'Bill - Electric',
    'Car - Maintenance', 'Groceries', 'Bill - Gas', 'Medical',
    'Car - Gas', 'Dog', 'Children', 'Bill - Life Insurance',
  ],
  savings: ['401k', 'HSA'],
};

const INCOME_TYPES = [
  { value: 'paycheck',            label: 'Paycheck' },
  { value: 'stock_bonus',         label: 'Stock Bonus' },
  { value: 'performance_bonus',   label: 'Performance Bonus' },
  { value: 'misc',                label: 'Misc Income' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BUDGET_PERCENTAGES = { needs: 0.50, wants: 0.30, savings: 0.20 };

module.exports = { CATEGORIES, INCOME_TYPES, MONTH_NAMES, BUDGET_PERCENTAGES };
