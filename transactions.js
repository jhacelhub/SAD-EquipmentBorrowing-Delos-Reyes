// ============================================================================
// js/transactions.js
//
// Responsible for:
//   - Loading transactions (joined with equipment for the equipment name)
//   - Recording borrowing        (BR-03, BR-04, BR-05, BR-06, BR-07)
//   - Returning equipment        (BR-08, BR-12)
//   - Overdue checking           (BR-09, calculated in JavaScript)
//   - Transaction search / filtering
//   - Updating equipment availability
//   - Dashboard statistics
//
// WHERE TO SAVE THIS FILE:
//   SAD-EquipmentBorrowing-Lastname/js/transactions.js
//
// This file expects `supabaseClient` (from supabase.js), `showToast()`
// (from auth.js), and `equipmentCache` / `loadEquipment()` (from
// equipment.js) to already be loaded on the page.
//
// NOTE: Only visual changes were made in this update (a small icon on the
// Return button). All Supabase logic, validation, and business rules are
// unchanged.
// ============================================================================

// In-memory copy of everything currently in `borrow_transactions`,
// including the joined equipment name.
let transactionsCache = [];

// Small inline icon used on the Return button.
const RETURN_ICON = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>`;

// ----------------------------------------------------------------------
// LOAD (joins equipment so we can show the equipment name)
// ----------------------------------------------------------------------
async function loadTransactions() {
    const tbody = document.getElementById("transactionsTableBody");
    if (tbody) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="9">Loading transactions...</td></tr>`;
    }

    // The embedded select below performs the join: for every transaction
    // row, Supabase also returns the related equipment row's name.
    const { data, error } = await supabaseClient
        .from("borrow_transactions")
        .select("*, equipment ( equipment_name )")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to load transactions:", error);
        showToast("Failed to load transactions. Please refresh the page.", "error");
        transactionsCache = [];
    } else {
        transactionsCache = data || [];
    }

    applyTransactionFilters();
}

// ----------------------------------------------------------------------
// OVERDUE LOGIC (BR-09) — calculated here in JavaScript, not stored in DB
// ----------------------------------------------------------------------
// Rule: current date > due_date AND status is not Returned => Overdue.
function computeDisplayStatus(tx) {
    if (tx.status === "Returned") return "Returned";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(tx.due_date + "T00:00:00");

    if (today > due) return "Overdue";
    return tx.status; // "Borrowed"
}

// ----------------------------------------------------------------------
// RENDER TABLE
// ----------------------------------------------------------------------
function renderTransactionsTable(list) {
    const tbody = document.getElementById("transactionsTableBody");
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="9">No transactions found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((tx) => {
        const displayStatus = computeDisplayStatus(tx);
        const badgeClass =
            displayStatus === "Returned" ? "badge-returned" :
            displayStatus === "Overdue" ? "badge-overdue" : "badge-borrowed";

        const equipmentName = tx.equipment ? tx.equipment.equipment_name : getEquipmentNameById(tx.equipment_id);

        // BR-12: a returned transaction cannot be returned twice —
        // hide the Return button once status is Returned.
        const returnButton = tx.status === "Returned"
            ? `<span class="text-muted">—</span>`
            : `<button class="btn btn-accent btn-sm icon-btn" onclick="confirmReturnTransaction(${tx.id})">${RETURN_ICON} Return</button>`;

        return `
            <tr>
                <td>${escapeHtml(tx.borrower_name)}</td>
                <td>${escapeHtml(tx.borrower_type)}</td>
                <td>${escapeHtml(tx.department)}</td>
                <td>${escapeHtml(equipmentName)}</td>
                <td>${escapeHtml(tx.date_borrowed)}</td>
                <td>${escapeHtml(tx.due_date)}</td>
                <td>${escapeHtml(tx.date_returned || "—")}</td>
                <td><span class="badge ${badgeClass}">${displayStatus}</span></td>
                <td class="actions-cell">${returnButton}</td>
            </tr>
        `;
    }).join("");
}

// ----------------------------------------------------------------------
// SEARCH + FILTER (Transactions section)
// ----------------------------------------------------------------------
function applyTransactionFilters() {
    const searchInput = document.getElementById("transactionSearchInput");
    const statusFilter = document.getElementById("transactionStatusFilter");

    const term = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const status = statusFilter ? statusFilter.value : "All";

    let filtered = transactionsCache;

    if (term) {
        filtered = filtered.filter((tx) => tx.borrower_name.toLowerCase().includes(term));
    }

    if (status !== "All") {
        filtered = filtered.filter((tx) => computeDisplayStatus(tx) === status);
    }

    renderTransactionsTable(filtered);
}

// ----------------------------------------------------------------------
// RECORD BORROWING (BR-03, BR-04, BR-05, BR-06, BR-07)
// ----------------------------------------------------------------------
async function handleBorrowSubmit(event) {
    event.preventDefault();

    const errorBox = document.getElementById("borrowFormError");
    errorBox.style.display = "none";

    const borrowerName = document.getElementById("borrowerName").value.trim();
    const borrowerType = document.getElementById("borrowerType").value;
    const department = document.getElementById("department").value;
    const equipmentId = document.getElementById("borrowEquipmentSelect").value;
    const dateBorrowed = document.getElementById("dateBorrowed").value;
    const dueDate = document.getElementById("dueDate").value;

    // BR-04: Borrower name is required.
    if (!borrowerName) {
        errorBox.textContent = "Borrower name is required.";
        errorBox.style.display = "block";
        return;
    }
    if (!borrowerType || !department || !equipmentId || !dateBorrowed || !dueDate) {
        errorBox.textContent = "Please fill in all fields, including equipment and dates.";
        errorBox.style.display = "block";
        return;
    }

    // BR-05: Due date must be greater than or equal to borrowing date.
    if (dueDate < dateBorrowed) {
        errorBox.textContent = "Due date cannot be earlier than the date borrowed.";
        errorBox.style.display = "block";
        return;
    }

    // BR-03: Only available equipment may be borrowed (defensive re-check,
    // in case someone else borrowed it a moment ago).
    const equipmentItem = equipmentCache.find((eq) => String(eq.id) === String(equipmentId));
    if (!equipmentItem || equipmentItem.availability !== "Available") {
        errorBox.textContent = "That equipment is no longer available. Please refresh and pick another item.";
        errorBox.style.display = "block";
        await loadEquipment();
        return;
    }

    // Get the currently authenticated user so we can stamp user_id.
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        errorBox.textContent = "Your session has expired. Please log in again.";
        errorBox.style.display = "block";
        return;
    }

    const submitBtn = document.getElementById("borrowSubmitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Recording...";

    // Step 1: insert the borrowing transaction (BR-06: status = Borrowed).
    const { data: insertedTx, error: insertError } = await supabaseClient
        .from("borrow_transactions")
        .insert({
            equipment_id: equipmentId,
            borrower_name: borrowerName,
            borrower_type: borrowerType,
            department: department,
            date_borrowed: dateBorrowed,
            due_date: dueDate,
            status: "Borrowed",
            user_id: user.id,
        })
        .select()
        .single();

    if (insertError) {
        errorBox.textContent = "Failed to record borrowing: " + insertError.message;
        errorBox.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${RETURN_ICON === "" ? "" : ""}Record Borrowing`;
        submitBtn.textContent = "Record Borrowing";
        return;
    }

    // Step 2: mark the equipment as Borrowed (BR-07).
    const { error: updateError } = await supabaseClient
        .from("equipment")
        .update({ availability: "Borrowed" })
        .eq("id", equipmentId);

    submitBtn.disabled = false;
    submitBtn.textContent = "Record Borrowing";

    if (updateError) {
        // Keep the two tables consistent: undo the transaction we just
        // created, since the equipment could not be marked as Borrowed.
        await supabaseClient.from("borrow_transactions").delete().eq("id", insertedTx.id);
        errorBox.textContent = "Failed to update equipment availability. The borrowing was not recorded.";
        errorBox.style.display = "block";
        return;
    }

    document.getElementById("borrowForm").reset();
    setDefaultBorrowDate();
    showToast("Borrowing recorded successfully.", "success");

    await loadEquipment();
    await loadTransactions();
    updateDashboardStats();
}

// ----------------------------------------------------------------------
// RETURN EQUIPMENT (BR-08, BR-12)
// ----------------------------------------------------------------------
let transactionIdPendingReturn = null;

function confirmReturnTransaction(id) {
    transactionIdPendingReturn = id;
    document.getElementById("confirmModalTitle").textContent = "Mark as Returned?";
    document.getElementById("confirmModalText").textContent =
        "This will mark the transaction as returned and make the equipment available again.";
    document.getElementById("confirmModalAction").onclick = performReturnTransaction;
    document.getElementById("confirmModalOverlay").classList.add("active");
}

async function performReturnTransaction() {
    if (transactionIdPendingReturn === null) return;
    const txId = transactionIdPendingReturn;

    document.getElementById("confirmModalOverlay").classList.remove("active");
    transactionIdPendingReturn = null;

    const tx = transactionsCache.find((t) => t.id === txId);
    if (!tx) return;

    // BR-12: a returned transaction cannot be returned twice.
    if (tx.status === "Returned") {
        showToast("This transaction has already been returned.", "error");
        return;
    }

    const today = new Date().toISOString().slice(0, 10);

    // Step 1: update the transaction.
    const { error: txError } = await supabaseClient
        .from("borrow_transactions")
        .update({ date_returned: today, status: "Returned" })
        .eq("id", txId)
        .eq("status", "Borrowed"); // extra guard against double-return races

    if (txError) {
        showToast("Failed to return equipment: " + txError.message, "error");
        return;
    }

    // Step 2: make the equipment Available again (BR-08).
    const { error: eqError } = await supabaseClient
        .from("equipment")
        .update({ availability: "Available" })
        .eq("id", tx.equipment_id);

    if (eqError) {
        showToast("Transaction returned, but equipment availability could not be updated: " + eqError.message, "error");
    } else {
        showToast("Equipment returned successfully.", "success");
    }

    await loadEquipment();
    await loadTransactions();
    updateDashboardStats();
}

// ----------------------------------------------------------------------
// DASHBOARD STATISTICS
// ----------------------------------------------------------------------
function updateDashboardStats() {
    const totalEl = document.getElementById("statTotalEquipment");
    const availableEl = document.getElementById("statAvailable");
    const borrowedEl = document.getElementById("statBorrowed");
    const returnedEl = document.getElementById("statReturned");
    const overdueEl = document.getElementById("statOverdue");

    if (!totalEl) return; // stats only exist on the Dashboard view

    const total = equipmentCache.length;
    const available = equipmentCache.filter((eq) => eq.availability === "Available").length;
    const borrowed = equipmentCache.filter((eq) => eq.availability === "Borrowed").length;

    const returned = transactionsCache.filter((tx) => computeDisplayStatus(tx) === "Returned").length;
    const overdue = transactionsCache.filter((tx) => computeDisplayStatus(tx) === "Overdue").length;

    totalEl.textContent = total;
    availableEl.textContent = available;
    borrowedEl.textContent = borrowed;
    returnedEl.textContent = returned;
    overdueEl.textContent = overdue;
}

// ----------------------------------------------------------------------
// SMALL HELPER: set the "Date Borrowed" field to today by default
// ----------------------------------------------------------------------
function setDefaultBorrowDate() {
    const dateBorrowedInput = document.getElementById("dateBorrowed");
    if (dateBorrowedInput) {
        dateBorrowedInput.value = new Date().toISOString().slice(0, 10);
    }
}