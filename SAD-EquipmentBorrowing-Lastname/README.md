# Online Equipment Borrowing and Return Monitoring System Using GitHub and Supabase

**Course:** Systems Analysis and Design
**Repository name:** `SAD-EquipmentBorrowing-Lastname` — replace `Lastname` with your actual surname before creating your GitHub repository.

---

## 1. Project Description

This system lets a college equipment custodian register lab equipment, record who borrows it and when, and track returns — including automatically flagging overdue items. It is a static frontend (HTML, CSS, JavaScript) backed entirely by Supabase (PostgreSQL database + Authentication), hosted for free on GitHub Pages.

## 2. Problem Background

Many college labs still track borrowed equipment using paper logbooks or shared spreadsheets. This makes it hard to know, at a glance, what is currently borrowed, who has it, and whether it is overdue. This project digitizes that process with a simple, centralized, authenticated web application.

## 3. Objectives

- Provide a single source of truth for equipment status (Available / Borrowed).
- Record every borrow and return transaction with accurate dates.
- Automatically surface overdue transactions without manual tracking.
- Restrict record-keeping to authenticated users only.
- Deploy the entire system as a free static site with a managed backend.

## 4. Technologies Used

| Layer          | Technology                              |
|----------------|------------------------------------------|
| Frontend       | HTML5, CSS3, vanilla JavaScript (ES6)     |
| Backend / DB   | Supabase (PostgreSQL)                    |
| Authentication | Supabase Auth (email + password)         |
| Hosting        | GitHub Pages                             |

No frameworks (React/Vue/Angular), no server-side code (PHP/Node/Express), and no localStorage-as-database are used anywhere in this project.

## 5. Features

- **Authentication** — email/password login via Supabase Auth, session checking, logout, and route protection (unauthenticated users are redirected to `login.html`).
- **Dashboard** — live counts of Total Equipment, Available, Borrowed, Returned, and Overdue, computed from real Supabase data.
- **Equipment Management** — add, view, edit, and delete equipment, with delete requiring confirmation.
- **Borrowing** — a form that only lists equipment currently marked `Available`; recording a borrow updates both the transaction and the equipment's availability.
- **Returns** — a Return action per transaction that sets `date_returned`, updates status, and frees up the equipment; already-returned transactions cannot be returned again.
- **Overdue detection** — computed live in JavaScript by comparing today's date to `due_date` for any transaction that isn't Returned.
- **Search & filter** — equipment by name/asset code and availability; transactions by borrower name and status.

## 6. Database Tables

### `equipment`

| Column         | Type      | Notes                          |
|----------------|-----------|---------------------------------|
| id             | BIGINT    | Primary key, auto-generated     |
| equipment_name | TEXT      | Required                        |
| category       | TEXT      | Required                        |
| asset_code     | TEXT      | Required, unique                |
| condition      | TEXT      | Defaults to `Good`               |
| availability   | TEXT      | Defaults to `Available`          |
| created_at     | TIMESTAMPTZ | Defaults to `NOW()`            |

### `borrow_transactions`

| Column          | Type      | Notes                                     |
|-----------------|-----------|---------------------------------------------|
| id              | BIGINT    | Primary key, auto-generated                |
| equipment_id    | BIGINT    | References `equipment(id)`                 |
| borrower_name   | TEXT      | Required                                   |
| borrower_type   | TEXT      | Required                                   |
| department      | TEXT      | Required                                   |
| date_borrowed   | DATE      | Defaults to current date                   |
| due_date        | DATE      | Required                                   |
| date_returned   | DATE      | Set when the item is returned              |
| status          | TEXT      | Defaults to `Borrowed`                     |
| user_id         | UUID      | References `auth.users(id)`                |
| created_at      | TIMESTAMPTZ | Defaults to `NOW()`                      |

Both tables already exist in the Supabase project used for this lab and already have Row Level Security (RLS) enabled — this project does not create or alter tables.

## 7. Database Relationship

```
EQUIPMENT (1) ──────< (many) BORROW_TRANSACTIONS
     id                       equipment_id (FK)
```

One equipment item can appear in many borrow transactions over time (borrowed, returned, borrowed again, etc.), but each transaction points to exactly one equipment item.

## 8. Business Rules

| ID    | Rule                                                              |
|-------|--------------------------------------------------------------------|
| BR-01 | Equipment name must not be empty.                                   |
| BR-02 | Asset code must be unique.                                          |
| BR-03 | Only available equipment may be borrowed.                           |
| BR-04 | Borrower name is required.                                          |
| BR-05 | Due date must be greater than or equal to the borrowing date.       |
| BR-06 | A newly borrowed transaction has status `Borrowed`.                 |
| BR-07 | Borrowed equipment becomes unavailable.                              |
| BR-08 | Returned equipment becomes `Available`.                             |
| BR-09 | Past-due transactions display as `Overdue`.                         |
| BR-10 | Equipment deletion requires confirmation.                            |
| BR-11 | Only authenticated users may manage records.                        |
| BR-12 | A returned transaction cannot be returned twice.                    |

## 9. How to Configure Supabase

1. Open your existing Supabase project.
2. Go to **Project Settings → API**.
3. Copy the **Project URL** and the **anon / public** key (never the `service_role` key).
4. Open `js/supabase.js` in this project and paste them in:

   ```js
   const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
   const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY_HERE";
   ```

5. Open the **SQL Editor** in Supabase and run the contents of `database_policies.sql` (included in this project) so authenticated users are allowed to read and write the two tables. RLS is already enabled on both tables — this step is what grants access to logged-in users; without it, every request will be blocked.
6. Confirm you already have a test user under **Authentication → Users** (email + password) to log in with.

## 10. How to Run Locally

Because this project uses `<script>` tags loaded from a CDN and relative file paths, you can run it with any simple local static server:

**Option A — VS Code Live Server extension**
1. Open the project folder in VS Code.
2. Right-click `login.html` → "Open with Live Server".

**Option B — Python's built-in server**
```bash
cd SAD-EquipmentBorrowing-Lastname
python -m http.server 8000
```
Then visit `http://localhost:8000/login.html`.

> Opening `login.html` by double-clicking it (a `file://` URL) may cause issues with some browsers' module/security rules — always use a local server.

## 11. How to Deploy to GitHub Pages

1. Create a new GitHub repository named `SAD-EquipmentBorrowing-Lastname` (replace `Lastname` with your surname).
2. Push this project's files to the repository root (so `index.html` sits at the top level of the repo).
3. In the repository, go to **Settings → Pages**.
4. Under "Build and deployment", set **Source** to `Deploy from a branch`, choose the `main` branch and `/ (root)` folder, then save.
5. Wait a minute for GitHub to publish the site, then open the URL GitHub provides (something like `https://yourusername.github.io/SAD-EquipmentBorrowing-Lastname/login.html`).

## 12. GitHub Repository Naming Requirement

The repository **must** be named:

```
SAD-EquipmentBorrowing-Lastname
```

Replace `Lastname` with your actual surname (e.g. `SAD-EquipmentBorrowing-DelaCruz`).

## 13. Testing Instructions

| Test Case | Description                | How to test                                                                 |
|-----------|-----------------------------|-------------------------------------------------------------------------------|
| TC-01     | Login                       | Open `login.html`, sign in with your Supabase test user, confirm redirect to `index.html`. |
| TC-02     | Add equipment               | Go to Equipment → "+ Add Equipment", fill in the form, save, and confirm it appears in the table. |
| TC-03     | View equipment              | Confirm the Equipment table loads real rows from Supabase (empty table shows "No equipment found"). |
| TC-04     | Edit equipment              | Click "Edit" on a row, change a field, save, and confirm the table updates.  |
| TC-05     | Delete equipment            | Click "Delete", confirm the dialog, and confirm the row disappears.          |
| TC-06     | Record borrowing            | Go to Borrow Transactions, fill in the form with an Available item, submit, and confirm the equipment becomes Borrowed and the transaction appears. |
| TC-07     | Return equipment            | Click "Return" on a Borrowed transaction, confirm it becomes Returned and the equipment becomes Available again. |
| TC-08     | Overdue detection           | Add a transaction with a past due date (or edit one in Supabase) and confirm it displays as "Overdue" without manually changing its status. |
| TC-09     | Search / filter             | Use the search boxes and dropdown filters on both Equipment and Transactions and confirm the tables update accordingly. |
| TC-10     | Logout                      | Click "Logout" and confirm you are redirected to `login.html` and cannot access `index.html` without logging in again. |

## 14. Project Structure

```
SAD-EquipmentBorrowing-Lastname/
├── index.html
├── login.html
├── css/
│   └── style.css
├── js/
│   ├── supabase.js
│   ├── auth.js
│   ├── equipment.js
│   └── transactions.js
├── documentation/
│   ├── use-case.png
│   └── erd.png
├── database_policies.sql
└── README.md
```
