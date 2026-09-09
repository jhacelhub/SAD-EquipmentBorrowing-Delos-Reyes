// Supabase configuration
// Online Equipment Borrowing and Return Monitoring System

const SUPABASE_URL = "https://ntkudujqstuqadwisvon.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_-5C95k6xNbjNRV6MhBwrLA_0Y-K3q81";

// Create Supabase client
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);