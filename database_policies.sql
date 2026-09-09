-- ============================================================================
-- database_policies.sql
--
-- Row Level Security (RLS) policies for the Online Equipment Borrowing and
-- Return Monitoring System.
--
-- CONTEXT:
--   - RLS is already ENABLED on both `equipment` and `borrow_transactions`
--     (per the lab requirements). Enabling RLS with no policies blocks ALL
--     access, so these policies are what actually let the app work.
--   - These policies only allow access to AUTHENTICATED users
--     (BR-11: only authenticated users may manage records).
--   - The service_role key is NEVER used by the frontend, and RLS is never
--     disabled — these policies are the correct, secure way to allow the
--     anon/public key + a logged-in session to read and write data.
--
-- HOW TO RUN THIS FILE:
--   1. Open your Supabase project.
--   2. Go to the SQL Editor.
--   3. Paste the contents of this file and click "Run".
--   (You only need to do this once per project.)
-- ============================================================================

-- ----------------------------------------------------------------------
-- EQUIPMENT TABLE POLICIES
-- ----------------------------------------------------------------------

-- Allow any logged-in user to view equipment.
CREATE POLICY "Authenticated users can view equipment"
ON equipment
FOR SELECT
TO authenticated
USING (true);

-- Allow any logged-in user to add equipment.
CREATE POLICY "Authenticated users can insert equipment"
ON equipment
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow any logged-in user to edit equipment.
CREATE POLICY "Authenticated users can update equipment"
ON equipment
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow any logged-in user to delete equipment.
CREATE POLICY "Authenticated users can delete equipment"
ON equipment
FOR DELETE
TO authenticated
USING (true);

-- ----------------------------------------------------------------------
-- BORROW_TRANSACTIONS TABLE POLICIES
-- ----------------------------------------------------------------------

-- Allow any logged-in user to view transactions.
CREATE POLICY "Authenticated users can view transactions"
ON borrow_transactions
FOR SELECT
TO authenticated
USING (true);

-- Allow any logged-in user to record a borrowing transaction.
-- (The frontend always sets user_id to the current auth.uid() on insert.)
CREATE POLICY "Authenticated users can insert transactions"
ON borrow_transactions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow any logged-in user to update a transaction (used when returning
-- equipment: sets date_returned and status).
CREATE POLICY "Authenticated users can update transactions"
ON borrow_transactions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow any logged-in user to delete a transaction if needed
-- (not used by the UI directly, but kept for completeness/admin cleanup).
CREATE POLICY "Authenticated users can delete transactions"
ON borrow_transactions
FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- NOTE ON SCOPE
-- ============================================================================
-- This lab exercise treats every authenticated user as a single kind of
-- system user (the equipment custodian), so these policies grant full
-- access to any authenticated user rather than restricting rows by
-- user_id. If a future version of this project needs to restrict
-- borrowers to only see/edit their own transactions, change the
-- `USING (true)` / `WITH CHECK (true)` clauses on borrow_transactions to
-- `USING (auth.uid() = user_id)` / `WITH CHECK (auth.uid() = user_id)`.
-- ============================================================================
