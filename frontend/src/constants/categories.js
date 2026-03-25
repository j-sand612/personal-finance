// Single source of truth for all sections and their categories.

export const SECTIONS = ['wants', 'needs', 'savings'];

export const CATEGORIES = {
  wants: [
    'Alcohol',
    'Appliances',
    'Children',
    'Clothes',
    'Coffee',
    'Dog',
    'Donation',
    'Entertainment',
    'Food',
    'Gifts',
    'Gym',
    'Misc',
    'Sports Gambling',
    'Subscriptions',
    'Travel',
    'Video Games',
  ],
  needs: [
    'Bill - Electric',
    'Bill - Gas',
    'Bill - Life Insurance',
    'Bill - Utilities',
    'Car - Gas',
    'Car - Insurance',
    'Car - Maintenance',
    'Car - Payment',
    'Children',
    'Dog',
    'Groceries',
    'HOA',
    'Internet',
    'Medical',
    'Mortgage',
    'Phone',
  ],
  savings: ['401k', 'HSA'],
};

// Income types
export const INCOME_TYPES = [
  { value: 'paycheck', label: 'Paycheck' },
  { value: 'stock_bonus', label: 'Stock Bonus' },
  { value: 'performance_bonus', label: 'Performance Bonus' },
  { value: 'misc', label: 'Misc Income' },
];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SECTION_LABELS = {
  wants: 'Wants',
  needs: 'Needs',
  savings: 'Savings',
};

// Budget percentages (50/30/20 rule)
export const BUDGET_PERCENTAGES = {
  needs: 0.50,
  wants: 0.30,
  savings: 0.20,
};
