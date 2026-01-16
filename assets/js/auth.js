/**
 * Authentication module for Panagioti's Cooking
 * 
 * SECURITY DISCLAIMER:
 * This is CLIENT-SIDE authentication only. The password is visible in the source code.
 * GitHub Pages cannot provide true secure authentication without a backend.
 * This is suitable for personal use to keep casual visitors out, not for actual security.
 * 
 * For secure authentication, consider:
 * - Using a backend server with proper session management
 * - Cloudflare Workers with password verification
 * - GitHub private repos with GitHub Actions
 */

const AUTH_CONFIG = {
    password: '1969cooking',
    storageKey: 'panagiotis_cooking_auth',
    sessionDuration: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Check if user is authenticated
function isAuthenticated() {
    const session = localStorage.getItem(AUTH_CONFIG.storageKey);
    if (!session) return false;

    try {
        const data = JSON.parse(session);
        const now = Date.now();

        // Check if session is still valid
        if (data.expires && now < data.expires) {
            return true;
        }

        // Session expired
        localStorage.removeItem(AUTH_CONFIG.storageKey);
        return false;
    } catch {
        localStorage.removeItem(AUTH_CONFIG.storageKey);
        return false;
    }
}

// Attempt login
function login(password) {
    if (password === AUTH_CONFIG.password) {
        const session = {
            authenticated: true,
            loginTime: Date.now(),
            expires: Date.now() + AUTH_CONFIG.sessionDuration
        };
        localStorage.setItem(AUTH_CONFIG.storageKey, JSON.stringify(session));
        return true;
    }
    return false;
}

// Logout
function logout() {
    localStorage.removeItem(AUTH_CONFIG.storageKey);
    window.location.href = 'index.html';
}

// Protect page (redirect if not authenticated)
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Initialize login page
function initLoginPage() {
    // If already authenticated, redirect to app
    if (isAuthenticated()) {
        window.location.href = 'app.html';
        return;
    }

    const form = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const password = passwordInput.value.trim();

        if (login(password)) {
            window.location.href = 'app.html';
        } else {
            errorMessage.textContent = 'Incorrect password. Please try again.';
            passwordInput.value = '';
            passwordInput.focus();

            // Shake animation
            form.style.animation = 'none';
            form.offsetHeight; // Trigger reflow
            form.style.animation = 'shake 0.5s ease';
        }
    });
}

// Add shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-10px); }
        40%, 80% { transform: translateX(10px); }
    }
`;
document.head.appendChild(shakeStyle);

// Auto-initialize based on page
if (document.body.classList.contains('login-page')) {
    document.addEventListener('DOMContentLoaded', initLoginPage);
}
