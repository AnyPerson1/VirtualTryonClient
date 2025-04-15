// --- Configuration ---
// IMPORTANT: Replace this with build-time environment variables
const API_BASE_URL = 'http://31.223.108.44:8080'; // Use HTTPS and your actual domain

// --- DOMContentLoaded Listener ---
window.addEventListener('DOMContentLoaded', () => {
    // Attempt to validate existing token instead of auto-login with stored creds
    validateTokenAndRedirect();
    setupLoginForm(); // Setup listener after DOM is loaded
});

// --- Functions ---

/**
 * Checks for an existing token, validates it with the server,
 * and redirects to the main app if valid. Otherwise, ensures the user is on the login page.
 */
async function validateTokenAndRedirect() {
    const token = localStorage.getItem('authToken'); // Or sessionStorage / check cookie

    if (token) {
        try {
            // Assume you have a backend endpoint to validate the token and get user info
            const response = await fetch(`${API_BASE_URL}/api/validate-token`, { // Use HTTPS
                method: 'GET', // Or POST depending on your backend
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Send the token
                }
            });

            if (response.ok) {
                const userData = await response.json();
                // Optionally store necessary non-sensitive user info (like credits)
                localStorage.setItem('credits', userData.credits || 0);
                // Redirect to the main application
                window.location.href = 'main.html';
            } else {
                // Token is invalid or expired, clear stored token and stay on login page
                console.warn('Token validation failed:', response.status);
                clearAuthData();
            }
        } catch (err) {
            // Network error, stay on login page
            console.error('Error validating token:', err);
            // Optionally show a message to the user
            // clearAuthData(); // Decide if you want to clear token on network error
        }
    }
    // If no token, do nothing, stay on the login page.
}

/**
 * Sets up the event listener for the login form submission.
 */
function setupLoginForm() {
    const loginButton = document.getElementById('submitButton');
    const phoneInput = document.getElementById('tel');
    const passwordInput = document.getElementById('password');

    if (loginButton && phoneInput && passwordInput) {
        loginButton.addEventListener('click', async () => {
            // Get values directly inside the handler
            const phone = phoneInput.value.trim();
            const password = passwordInput.value.trim();

            // Basic client-side validation
            if (!phone || !password) {
                alert('Lütfen telefon numarası ve şifre girin.');
                return;
            }
             // Optional: Add phone number format check if needed, though pattern exists in HTML
             if (!/0[5][0-9]{9}/.test(phone)) {
                 alert('Lütfen geçerli bir TR telefon numarası girin.');
                 return;
             }

            await handleLogin(phone, password);
        });
    } else {
        console.error("Login form elements not found.");
    }
}

/**
 * Handles the login API call.
 * @param {string} phone - The user's phone number.
 * @param {string} password - The user's password.
 */
async function handleLogin(phone, password) {
    const loginButton = document.getElementById('submitButton');
    const originalButtonText = loginButton ? loginButton.textContent : 'Giriş Yap';
    if(loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = 'Giriş Yapılıyor...';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, { // Use HTTPS
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Send credentials for the login attempt
            body: JSON.stringify({ tel: phone, sifre: password })
        });

        if (!response.ok) {
            let errorText = 'Giriş başarısız oldu.';
            try {
                const errorData = await response.json();
                // Use server error message if available and appropriate
                errorText = errorData.error || `Sunucu hatası: ${response.status}`;
            } catch (e) {
                errorText = `Sunucu hatası: ${response.status}`;
            }
            alert(errorText);
            clearAuthData(); // Clear any potentially stale auth data on failure
            return; // Stop execution
        }

        // --- SUCCESS ---
        const data = await response.json();

        if (data && data.token) { // Expecting a token from the backend!
            // Store the token securely
            localStorage.setItem('authToken', data.token); // Or sessionStorage

            // Store other non-sensitive info if needed (credits might be better fetched in main.js)
            localStorage.setItem('credits', data.user?.kredi || 0); // Get credits if provided
            localStorage.setItem('userIdentifier', data.user?.tel || phone); // Store phone as identifier if needed for display, NOT for auth

            // *** DO NOT STORE THE PASSWORD ***
            // localStorage.removeItem('password'); // Ensure it's removed if ever stored previously

            // Proceed to the main application
            window.location.href = 'main.html';
        } else {
            // Backend didn't return a token
            console.error('Login successful, but no token received from server.');
            alert('Giriş başarılı ancak oturum başlatılamadı. Lütfen tekrar deneyin.');
            clearAuthData();
        }

    } catch (err) {
        console.error('Login API error:', err);
        alert('Sunucuya ulaşılamadı veya bir ağ hatası oluştu: ' + err.message);
        clearAuthData();
    } finally {
         if(loginButton) {
             loginButton.disabled = false;
             loginButton.textContent = originalButtonText;
         }
    }
}

/**
 * Clears authentication-related data from storage.
 */
function clearAuthData() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('credits');
    localStorage.removeItem('userIdentifier');
    // Ensure old insecure items are removed
    localStorage.removeItem('user');
    localStorage.removeItem('password');
}
