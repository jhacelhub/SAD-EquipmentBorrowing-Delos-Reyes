// ============================================================================
// js/equipment.js
//
// Responsible for:
//   - Loading equipment from Supabase
//   - Adding equipment      (BR-01, BR-02)
//   - Editing equipment
//   - Deleting equipment    (BR-10: requires confirmation)
//   - Equipment search / filtering
//   - Feeding the "Equipment" dropdown on the Borrow form
//     (BR-03: only Available equipment can be selected)
//
// WHERE TO SAVE THIS FILE:
//   SAD-EquipmentBorrowing-Lastname/js/equipment.js
//
// This file expects `supabaseClient` (from supabase.js) and `showToast()`
// (from auth.js) to already be loaded on the page.
//
// NOTE: Only visual changes were made in this update (small edit/delete
// icons in the table). All Supabase CRUD logic, validation, and business
// rules are unchanged.
// ============================================================================

// In-memory copy of everything currently in the `equipment` table.
// Kept up to date after every load/add/edit/delete so search & filter can
// run instantly without hitting the database again.
let equipmentCache = [];

// Tracks which equipment row is being edited. Empty string = "Add" mode.
let editingEquipmentId = "";

// Small inline icons used on the Edit / Delete buttons.
const EDIT_ICON = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const DELETE_ICON = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>`;

// ----------------------------------------------------------------------
// LOAD
// ----------------------------------------------------------------------
async function loadEquipment() {
    const tbody = document.getElementById("equipmentTableBody");
    if (tbody) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Loading equipment...</td></tr>`;
    }

    const { data, error } = await supabaseClient
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to load equipment:", error);
        showToast("Failed to load equipment. Please refresh the page.", "error");
        equipmentCache = [];
    } else {
        equipmentCache = data || [];
    }

    applyEquipmentFilters();
    populateEquipmentDropdown();
}

// ----------------------------------------------------------------------
// RENDER TABLE
// ----------------------------------------------------------------------
function renderEquipmentTable(list) {
    const tbody = document.getElementById("equipmentTableBody");
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No equipment found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((item) => {
        const badgeClass = item.availability === "Available" ? "badge-available" : "badge-borrowed";
        return `
            <tr>
                <td>${escapeHtml(item.equipment_name)}</td>
                <td>${escapeHtml(item.category)}</td>
                <td>${escapeHtml(item.asset_code)}</td>
                <td>${escapeHtml(item.condition || "")}</td>
                <td><span class="badge ${badgeClass}">${escapeHtml(item.availability)}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-outline btn-sm icon-btn" onclick="openEditEquipmentModal(${item.id})">${EDIT_ICON} Edit</button>
                    <button class="btn btn-danger btn-sm icon-btn" onclick="confirmDeleteEquipment(${item.id})">${DELETE_ICON} Delete</button>
                </td>
            </tr>
        `;
    }).join("");
}

// ----------------------------------------------------------------------
// SEARCH + FILTER (Equipment section)
// ----------------------------------------------------------------------
function applyEquipmentFilters() {
    const searchInput = document.getElementById("equipmentSearchInput");
    const availabilityFilter = document.getElementById("equipmentAvailabilityFilter");

    const term = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const availability = availabilityFilter ? availabilityFilter.value : "All";

    let filtered = equipmentCache;

    if (term) {
        filtered = filtered.filter((item) =>
            item.equipment_name.toLowerCase().includes(term) ||
            item.asset_code.toLowerCase().includes(term)
        );
    }

    if (availability !== "All") {
        filtered = filtered.filter((item) => item.availability === availability);
    }

    renderEquipmentTable(filtered);
}

// ----------------------------------------------------------------------
// ADD / EDIT MODAL
// ----------------------------------------------------------------------
function openAddEquipmentModal() {
    editingEquipmentId = "";
    document.getElementById("equipmentModalTitle").textContent = "Add Equipment";
    document.getElementById("equipmentForm").reset();
    document.getElementById("equipmentFormError").style.display = "none";
    document.getElementById("equipmentModalOverlay").classList.add("active");
}

function openEditEquipmentModal(id) {
    const item = equipmentCache.find((eq) => eq.id === id);
    if (!item) return;

    editingEquipmentId = id;
    document.getElementById("equipmentModalTitle").textContent = "Edit Equipment";
    document.getElementById("equipmentFormError").style.display = "none";

    document.getElementById("equipmentName").value = item.equipment_name;
    document.getElementById("equipmentCategory").value = item.category;
    document.getElementById("equipmentAssetCode").value = item.asset_code;
    document.getElementById("equipmentCondition").value = item.condition || "Good";
    document.getElementById("equipmentAvailability").value = item.availability;

    document.getElementById("equipmentModalOverlay").classList.add("active");
}

function closeEquipmentModal() {
    document.getElementById("equipmentModalOverlay").classList.remove("active");
}

// ----------------------------------------------------------------------
// ADD / EDIT SUBMIT (BR-01, BR-02)
// ----------------------------------------------------------------------
async function handleEquipmentFormSubmit(event) {
    event.preventDefault();

    const errorBox = document.getElementById("equipmentFormError");
    errorBox.style.display = "none";

    const name = document.getElementById("equipmentName").value.trim();
    const category = document.getElementById("equipmentCategory").value.trim();
    const assetCode = document.getElementById("equipmentAssetCode").value.trim();
    const condition = document.getElementById("equipmentCondition").value;
    const availability = document.getElementById("equipmentAvailability").value;

    // BR-01: Equipment name must not be empty.
    if (!name) {
        errorBox.textContent = "Equipment name is required.";
        errorBox.style.display = "block";
        return;
    }
    if (!category || !assetCode) {
        errorBox.textContent = "Category and Asset Code are required.";
        errorBox.style.display = "block";
        return;
    }

    // BR-02: Asset code must be unique (client-side pre-check for a fast,
    // friendly message; the database UNIQUE constraint is the real guard).
    const duplicate = equipmentCache.find((eq) =>
        eq.asset_code.toLowerCase() === assetCode.toLowerCase() &&
        eq.id !== editingEquipmentId
    );
    if (duplicate) {
        errorBox.textContent = "That asset code is already used by another item.";
        errorBox.style.display = "block";
        return;
    }

    const payload = {
        equipment_name: name,
        category: category,
        asset_code: assetCode,
        condition: condition,
        availability: availability,
    };

    let error;
    if (editingEquipmentId) {
        ({ error } = await supabaseClient
            .from("equipment")
            .update(payload)
            .eq("id", editingEquipmentId));
    } else {
        ({ error } = await supabaseClient
            .from("equipment")
            .insert(payload));
    }

    if (error) {
        // Postgres unique_violation code, in case two people submit at once.
        if (error.code === "23505") {
            errorBox.textContent = "That asset code is already used by another item.";
        } else {
            errorBox.textContent = "Could not save equipment: " + error.message;
        }
        errorBox.style.display = "block";
        return;
    }

    closeEquipmentModal();
    showToast(editingEquipmentId ? "Equipment updated." : "Equipment added.", "success");
    await loadEquipment();
    updateDashboardStats();
}

// ----------------------------------------------------------------------
// DELETE (BR-10: requires confirmation)
// ----------------------------------------------------------------------
let equipmentIdPendingDelete = null;

function confirmDeleteEquipment(id) {
    equipmentIdPendingDelete = id;
    document.getElementById("confirmModalTitle").textContent = "Delete Equipment?";
    document.getElementById("confirmModalText").textContent =
        "This will permanently remove this equipment record. This action cannot be undone.";
    document.getElementById("confirmModalAction").onclick = performDeleteEquipment;
    document.getElementById("confirmModalOverlay").classList.add("active");
}

async function performDeleteEquipment() {
    if (equipmentIdPendingDelete === null) return;

    const { error } = await supabaseClient
        .from("equipment")
        .delete()
        .eq("id", equipmentIdPendingDelete);

    document.getElementById("confirmModalOverlay").classList.remove("active");
    equipmentIdPendingDelete = null;

    if (error) {
        // Most likely a foreign key violation because transactions still
        // reference this equipment.
        if (error.code === "23503") {
            showToast("Cannot delete: this equipment has borrowing records linked to it.", "error");
        } else {
            showToast("Failed to delete equipment: " + error.message, "error");
        }
        return;
    }

    showToast("Equipment deleted.", "success");
    await loadEquipment();
    updateDashboardStats();
}

// ----------------------------------------------------------------------
// BORROW FORM DROPDOWN (only Available equipment, BR-03)
// ----------------------------------------------------------------------
function populateEquipmentDropdown() {
    const select = document.getElementById("borrowEquipmentSelect");
    if (!select) return;

    const availableItems = equipmentCache.filter((eq) => eq.availability === "Available");

    if (!availableItems.length) {
        select.innerHTML = `<option value="">No equipment available</option>`;
        return;
    }

    select.innerHTML = `<option value="">Select Equipment</option>` +
        availableItems.map((eq) =>
            `<option value="${eq.id}">${escapeHtml(eq.equipment_name)} (${escapeHtml(eq.asset_code)})</option>`
        ).join("");
}

function getEquipmentNameById(id) {
    const item = equipmentCache.find((eq) => eq.id === id);
    return item ? item.equipment_name : "Unknown equipment";
}

// ----------------------------------------------------------------------
// SMALL UTILITY: escape user text before inserting into innerHTML
// ----------------------------------------------------------------------
function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}