// Supabase configuration
console.log('Config.js loaded');

const SUPABASE_URL = 'https://lnhadznrbueitsfmirpd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaGFkem5yYnVlaXRzZm1pcnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NDIxNzgsImV4cCI6MjA1NzIxODE3OH0.MALZ4YcGbw3_Wl6X5w1xlcpeLung82lj9TYvoxAtUT0';

// Initialize Supabase client
console.log('Config.js loaded');

// Initialize Supabase client if not already initialized
if (!window.supabaseClient) {
  console.log('Initializing Supabase client');
  try {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase client created successfully');
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    alert('Error initializing Supabase: ' + error.message);
  }
} else {
  console.log('Using existing Supabase client');
}

console.log('supabaseClient initialized:', window.supabaseClient ? 'Yes' : 'No'); 