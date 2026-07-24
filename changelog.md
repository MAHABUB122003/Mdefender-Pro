# Changelog

All notable changes to MDefender Pro will be documented in this file.

## [1.1.0] - 2026-07-24

### Bug Fixes
- Fixed `'InMemoryDB' object is not subscriptable` error when MongoDB connection fails (fallback InMemoryDB now supports `[]` access)
- Fixed 404 on root URL `/` - added root endpoint with API info
- Fixed CORS configuration - removed trailing slash from origin URL, added localhost origins

### Added
- Root endpoint (`GET /`) returning API status and version
- Health check endpoint (`GET /health`)

## [1.2.0] - 2026-07-24

### Features

#### 1. User Login/Logout System
- Email/password-based user login at `/user/login`
- User registration at `/register` with validation
- JWT token-based session management (stored in localStorage)
- Auto-logout on token expiry or invalid session
- Logout button on user dashboard topbar
- User profile display with account info

#### 2. Role-Based Permissions System
- Four-tier role hierarchy:
  - **Super Admin** (Level 4): Full access to all modules
  - **Finance Admin** (Level 3): Manage finance module, bank accounts, and transactions
  - **Finance Operator** (Level 2): Add and view transactions, limited access
  - **Read-only** (Level 1): View-only access to finance data
- Role assignment via admin panel (`PUT /api/admin/users/role`)
- New users default to `readonly` role
- Role displayed in user management table
- Permission checks enforced on all finance and notice board operations

#### 3. Bank Account Management (CRUD + Balance)
- Add, edit, and delete bank accounts
- Fields: Bank Name, Account Name, Account Number, Account Type (Savings/Current/Business), Currency (BDT/USD), Initial Balance, Notes
- Automatic balance calculation: Initial Balance + Total Income - Total Expense
- Account cards with visual balance display
- Delete protection: Only Super Admin can delete accounts (cascading transaction deletion)
- API endpoints:
  - `GET /api/finance/bank-accounts`
  - `POST /api/finance/bank-accounts`
  - `PUT /api/finance/bank-accounts?id=`
  - `DELETE /api/finance/bank-accounts?id=`

#### 4. Finance Module - Manual Transaction Entry (Add/Edit/Delete)
- Three transaction types: Income, Expense, Transfer
- Category selection with predefined subcategories:
  - **Income**: Sales Revenue, Service Revenue, Subscription, Commission, Interest Income, etc.
  - **Expense**: Salaries, Rent, Utilities, Office Supplies, Marketing, Software, Hosting, etc.
  - **Transfer**: Between Accounts, To Savings, From Savings, Investment Transfer, etc.
- Fields: Type, Amount, Bank Account, Date, Category, Subcategory, Description, Reference
- Filter transactions by: Account, Type, Category, Search text
- Pagination support (50 per page)
- Financial summary dashboard: Total Balance, Monthly Income, Monthly Expense, Net Balance
- Edit and delete with permission checks (Finance Operator+ for add/edit, Finance Admin+ for delete)
- API endpoints:
  - `GET /api/finance/transactions?page=&type=&category=&bank_account_id=&search=`
  - `POST /api/finance/transactions`
  - `PUT /api/finance/transactions?id=`
  - `DELETE /api/finance/transactions?id=`
  - `GET /api/finance/summary?month=&year=`
  - `GET /api/finance/categories`

#### 5. Finance Module - Import Transactions from Excel/CSV
- Upload CSV, XLS, or XLSX files
- Column mapping wizard: Map file columns to transaction fields (type, amount, category, subcategory, description, date, reference)
- Auto-detection of date formats (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY)
- Amount parsing with currency symbol removal (৳, $, BDT, commas)
- Target account selection for imported transactions
- Validation with error reporting:
  - Row-by-row error messages
  - Invalid amount detection
  - Missing required fields
  - Unsupported file format handling
- Import summary: Imported count, Skipped count, Error details
- API endpoint: `POST /api/finance/import` (multipart/form-data)

#### 6. Notice Board
- Text-only post system for team communication
- Post a notice with rich textarea input
- Display posted-by user name and avatar (first letter)
- Posted date and time display
- Delete button for own notices (Admin can delete any)
- Responsive card-based layout
- API endpoints:
  - `GET /api/notices`
  - `POST /api/notices`
  - `DELETE /api/notices?id=`

### Frontend Pages Added
- `/admin/finance` and `/user/finance` - Full finance management interface with bank accounts, transactions, and import tabs
- `/admin/notices` and `/user/notices` - Notice board with post/delete functionality

### Sidebar Updates
- Added "Finance" navigation link under new "Finance" section
- Added "Notice Board" navigation link under new "Communication" section

### Database Collections Added
- `bank_accounts` - Bank account storage with indexes on account_number
- `finance_transactions` - Transaction storage with indexes on date, bank_account_id, and type
- `notices` - Notice board posts with index on created_at

### Backend API Files Added
- `src/api/finance_api.py` - Finance module with bank accounts, transactions, import, categories, and summary
- `src/api/notice_api.py` - Notice board CRUD operations
