// ============================================================================
// js/auth.js
//
// Responsible for:
//   - Login (supabaseClient.auth.signInWithPassword)
//   - Session checking
//   - Logout (supabaseClient.auth.signOut)
//   - Redirecting unauthenticated users
//
// Also defines showToast(), a small helper used by equipment.js and
// transactions.js to show success/error messages, since all these files
// share one global scope (they are loaded as plain <script> tags).
//
// WHERE TO SAVE THIS FILE:
//   SAD-EquipmentBorrowing-Lastname/js/auth.js
// ============================================================================

// ----------------------------------------------------------------------
// TOAST / MESSAGE HELPER (shared across the whole app)
// ----------------------------------------------------------------------
// Shows a small message banner at the top of the main content area.
// type: "success" | "error"
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return; // toast container only exists on index.html

    toast.textContent = message;
    toast.className = "toast toast-" + type + " active";

    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
        toast.className = "toast";
    }, 4000);
}

// ----------------------------------------------------------------------
// LOGIN (login.html)
// ----------------------------------------------------------------------
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const errorBox = document.getElementById("loginError");
    const submitBtn = document.getElementById("loginSubmitBtn");

    errorBox.style.display = "none";
    errorBox.textContent = "";

    // Basic required-field validation before calling Supabase at all.
    if (!email || !password) {
        errorBox.textContent = "Please enter both email and password.";
        errorBox.style.display = "block";
        return;
    }

    // Loading state.
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            errorBox.textContent = "Login failed: " + error.message;
            errorBox.style.display = "block";
            return;
        }

        if (data.session) {
            // Successful login -> go to the dashboard.
            window.location.href = "index.html";
        }
    } catch (err) {
        // Network errors, unexpected failures, etc.
        errorBox.textContent = "Something went wrong. Please try again.";
        errorBox.style.display = "block";
        console.error("Login error:", err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign In";
    }
}

// If the user is already logged in and opens login.html again, skip
// straight to the dashboard instead of showing the form.
async function redirectIfLoggedIn() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = "index.html";
    }
}

// ----------------------------------------------------------------------
// LOGOUT (index.html)
// ----------------------------------------------------------------------
async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

// ----------------------------------------------------------------------
// SESSION CHECK + APP STARTUP (index.html)
// ----------------------------------------------------------------------
// Runs when index.html loads. If there is no active session, the user is
// sent back to login.html (BR-11: only authenticated users may manage
// records). If there IS a session, we show the user's email and kick off
// the initial data loading for equipment + transactions + dashboard.
async function checkAuthAndInit() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "login.html";
        return;
    }

    const emailLabel = document.getElementById("currentUserEmail");
    if (emailLabel) {
        emailLabel.textContent = session.user.email;
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    // Load data from Supabase (defined in equipment.js / transactions.js).
    await loadEquipment();
    await loadTransactions();
    updateDashboardStats();
}

// ----------------------------------------------------------------------
// WIRE UP login.html'S FORM, IF PRESENT ON THIS PAGE
// ----------------------------------------------------------------------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    redirectIfLoggedIn();
    loginForm.addEventListener("submit", handleLogin);
}
