// ==========================================
// 1. SUPABASE CLIENT INITIALIZATION ENGINE
// ==========================================
const SUPABASE_URL = "https://nmfivhcvfqbksyykxkba.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZml2aGN2ZnFia3N5eWt4a2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwOTc5MTQsImV4cCI6MjA5MjY3MzkxNH0.m9Nk56JdKb1LHxwpxO2hmdA_Eyt70WLZl_17UBiPsPo";

// Detect UMD global object securely without variable collision
const supabaseLib = window.supabase;

if (!supabaseLib || typeof supabaseLib.createClient !== 'function') {
  console.error("CRITICAL FAILURE: Supabase SDK failed to load from local supabase.js.");
  alert("System Engine Error: Unable to load database client library.");
}

// Renamed variable to 'supabaseClient' to avoid shadowing global 'window.supabase'
const supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// ==========================================
// 2. DOM CONTENT LOADED ENTRY POINT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTabEngine();
  initAuthEngine();
  initDataEngine();
});

// ==========================================
// 3. TAB NAVIGATION CONTROLLER
// ==========================================
function initTabEngine() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const systemPanels = document.querySelectorAll('.system-panel');

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');

      navButtons.forEach(btn => btn.classList.remove('active'));
      systemPanels.forEach(panel => panel.classList.remove('active-panel'));

      button.classList.add('active');
      const activePanel = document.getElementById(`panel-${targetId}`);
      if (activePanel) {
        activePanel.classList.add('active-panel');
      }
    });
  });
}

// ==========================================
// 4. AUTHENTICATION CONTROLLER (SIGN-UP / SIGN-IN)
// ==========================================
function initAuthEngine() {
  const btnLogin = document.getElementById('btn-login');
  const btnSignup = document.getElementById('btn-signup');
  const btnLogout = document.getElementById('btn-logout');
  const authOverlay = document.getElementById('auth-overlay');
  const authStatus = document.getElementById('auth-status');
  const userEmailLabel = document.getElementById('user-email-label');

  // Check active session on initial load
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      handleAuthSuccess(session.user);
    }
  });

  // Listen to auth state updates
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session) {
      handleAuthSuccess(session.user);
    } else {
      currentUser = null;
      authOverlay.style.display = 'flex';
      if (btnLogout) btnLogout.style.display = 'none';
      if (userEmailLabel) userEmailLabel.textContent = 'Guest';
    }
  });

  // Handle Login
  btnLogin.addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
      authStatus.textContent = "Please provide email and password.";
      authStatus.style.color = "#dc2626";
      return;
    }

    authStatus.textContent = "Authenticating...";
    authStatus.style.color = "#000";

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      authStatus.textContent = error.message;
      authStatus.style.color = "#dc2626";
    } else {
      handleAuthSuccess(data.user);
    }
  });

  // Handle Sign Up (Attaching Custom Username Metadata)
  btnSignup.addEventListener('click', async () => {
    const username = document.getElementById('auth-username').value.trim();
    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = document.getElementById('auth-password').value;

    if (!username || !email || !password) {
      authStatus.textContent = "Please fill in all fields (Username, Email, Password).";
      authStatus.style.color = "#dc2626";
      return;
    }

    authStatus.textContent = "Creating account...";
    authStatus.style.color = "#000";

    // Pass custom metadata via options.data
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    });

    if (error) {
      authStatus.textContent = error.message;
      authStatus.style.color = "#dc2626";
    } else {
      if (data.user && !data.session) {
        authStatus.textContent = "Account created! Please check your email or sign in.";
        authStatus.style.color = "#166534";
      } else if (data.session) {
        handleAuthSuccess(data.user);
      }
    }
  });

  // Handle Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
    });
  }

  // Hydrate UI with Username Metadata
  function handleAuthSuccess(user) {
    currentUser = user;
    authOverlay.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'block';
    
    // Read custom username metadata, fallback to email if not set
    const displayName = user.user_metadata && user.user_metadata.username 
      ? user.user_metadata.username 
      : user.email;

    if (userEmailLabel) userEmailLabel.textContent = displayName;
    
    // Hydrate preclinical database inputs
    fetchUserData();
  }
}

// ==========================================
// 5. DATABASE DATA ENGINE (STRING & BOUNDARY HARDENED)
// ==========================================
function initDataEngine() {
  const btnSaveAll = document.getElementById('btn-save-all');
  const saveStatus = document.getElementById('save-status');

  btnSaveAll.addEventListener('click', async () => {
    if (!currentUser) {
      alert("No authenticated user session found!");
      return;
    }

    const fields = [
      'ihs_theory', 'ihs_practical', 'mss_theory', 'mss_practical',
      'cvs_theory', 'cvs_practical', 'rs_theory', 'rs_practical',
      'git_theory', 'git_practical', 'nvs_theory', 'nvs_practical',
      'ers_theory', 'ers_practical', 'renal_theory', 'renal_practical'
    ];

    const USER_FRIENDLY_ERROR = "Error! Please recheck your marks, make sure the range is between 0 and 100.";

    // 1. DUAL-GATE DEFENSIVE PERIMETER CHECK
    for (const fieldId of fields) {
      const inputEl = document.getElementById(fieldId);
      if (inputEl) {
        
        // GATE A: Intercept strings, letters, and invalid symbols via DOM validity engine
        if (inputEl.validity && inputEl.validity.badInput) {
          saveStatus.textContent = USER_FRIENDLY_ERROR;
          saveStatus.style.color = "#dc2626";
          inputEl.focus();
          return; // Terminate execution immediately
        }

        // GATE B: Intercept numeric values outside the 0-100 range
        if (inputEl.value !== "") {
          const val = parseFloat(inputEl.value);
          if (isNaN(val) || val < 0 || val > 100) {
            saveStatus.textContent = USER_FRIENDLY_ERROR;
            saveStatus.style.color = "#dc2626";
            inputEl.focus();
            return; // Terminate execution immediately
          }
        }
      }
    }

    saveStatus.textContent = "Saving to database...";
    saveStatus.style.color = "#000";

    // 2. Construct sanitized payload
    const payload = {
      user_id: currentUser.id,
      ihs_theory: parseFloat(document.getElementById('ihs_theory').value) || 0.0,
      ihs_practical: parseFloat(document.getElementById('ihs_practical').value) || 0.0,
      mss_theory: parseFloat(document.getElementById('mss_theory').value) || 0.0,
      mss_practical: parseFloat(document.getElementById('mss_practical').value) || 0.0,
      cvs_theory: parseFloat(document.getElementById('cvs_theory').value) || 0.0,
      cvs_practical: parseFloat(document.getElementById('cvs_practical').value) || 0.0,
      rs_theory: parseFloat(document.getElementById('rs_theory').value) || 0.0,
      rs_practical: parseFloat(document.getElementById('rs_practical').value) || 0.0,
      git_theory: parseFloat(document.getElementById('git_theory').value) || 0.0,
      git_practical: parseFloat(document.getElementById('git_practical').value) || 0.0,
      nvs_theory: parseFloat(document.getElementById('nvs_theory').value) || 0.0,
      nvs_practical: parseFloat(document.getElementById('nvs_practical').value) || 0.0,
      ers_theory: parseFloat(document.getElementById('ers_theory').value) || 0.0,
      ers_practical: parseFloat(document.getElementById('ers_practical').value) || 0.0,
      renal_theory: parseFloat(document.getElementById('renal_theory').value) || 0.0,
      renal_practical: parseFloat(document.getElementById('renal_practical').value) || 0.0,
    };

    // 3. Fire UPSERT command targeting user_id
    const { data, error } = await supabaseClient
      .from('preclinical')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error("Database Error Payload:", error);
      
      if (error.code === '23514' || error.message.includes('check constraint')) {
        saveStatus.textContent = USER_FRIENDLY_ERROR;
      } else {
        saveStatus.textContent = "Save failed: " + error.message;
      }
      saveStatus.style.color = "#dc2626";
    } else if (data) {
      saveStatus.textContent = "Saved successfully!";
      saveStatus.style.color = "#166534";

      updateOverviewUI(data.theory_score_weighted, data.practical_score_weighted);
    }
  });
}

// Fetch existing user record from public.preclinical
async function fetchUserData(retryCount = 0) {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from('preclinical')
    .select('*')
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Fetch Error:", error);

    if ((error.code === 'PGRST303' || error.message.includes('future')) && retryCount < 2) {
      setTimeout(() => { fetchUserData(retryCount + 1); }, 1500);
      return;
    }
    return;
  }

  if (data) {
    const fields = [
      'ihs_theory', 'ihs_practical', 'mss_theory', 'mss_practical',
      'cvs_theory', 'cvs_practical', 'rs_theory', 'rs_practical',
      'git_theory', 'git_practical', 'nvs_theory', 'nvs_practical',
      'ers_theory', 'ers_practical', 'renal_theory', 'renal_practical'
    ];

    fields.forEach(field => {
      const el = document.getElementById(field);
      if (el) {
        const val = parseFloat(data[field]);
        // Only set the value if it's greater than 0, otherwise keep it empty for placeholder display
        if (!isNaN(val) && val > 0) {
          el.value = val.toFixed(2);
        } else {
          el.value = ''; // Reveals native placeholder "0 - 100"
        }
      }
    });

    updateOverviewUI(data.theory_score_weighted, data.practical_score_weighted);
  }
}

// Render Overview UI Metrics & Pass Logic (Fixed)
function updateOverviewUI(theoryWeighted = 0.00, practicalWeighted = 0.00) {
  const theory = parseFloat(theoryWeighted) || 0.00;
  const practical = parseFloat(practicalWeighted) || 0.00;
  const total = theory + practical;

  // 1. Update individual metric DOM nodes
  const theoryEl = document.querySelector('[data-target="theory-score"]');
  const practicalEl = document.querySelector('[data-target="practical-score"]');
  const totalEl = document.querySelector('[data-target="total-score"]');

  if (theoryEl) theoryEl.textContent = theory.toFixed(2);
  if (practicalEl) practicalEl.textContent = practical.toFixed(2);
  if (totalEl) totalEl.textContent = total.toFixed(2);

  // 2. Passing Threshold Physics
  const passDisplay = document.getElementById('display-pass-needed');
  const PASS_THRESHOLD = 50.00; // Standard 50% Passing Mark

  if (passDisplay) {
    if (total >= PASS_THRESHOLD) {
      passDisplay.textContent = "-";
      passDisplay.style.color = "#166534"; // Green for passing status
    } else {
      const needed = PASS_THRESHOLD - total;
      passDisplay.textContent = needed.toFixed(2) + "%";
      passDisplay.style.color = "#dc2626"; // Alert Red when marks are needed
    }
  }
}