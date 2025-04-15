// --- Configuration ---
// IMPORTANT: Replace this with build-time environment variables
const API_BASE_URL = 'http://31.223.108.44:8080'; // Use HTTPS and your actual domain
const TRY_ON_COST = 1; // Define cost clearly

// --- DOM Elements (Keep as is, ensure IDs match HTML) ---
const pageContent = document.getElementById('page-content');
// ... (other elements) ...
const headerTitle = document.getElementById('header-title');
const creditValue = document.getElementById('credit-value');
const availableCredits = document.getElementById('available-credits');
const fileInput1 = document.getElementById('fileInput1');
const fileInput2 = document.getElementById('fileInput2');
const modelPreview = document.getElementById('model-image-preview');
const clothingPreview = document.getElementById('clothing-image-preview');
const tryOnButton = document.getElementById('try-on-button');
const resultContainer = document.getElementById('result-container');
const resultImage = document.getElementById('result-image');
const saveResultButton = document.getElementById('save-result'); // Assumed ID if exists
const shareResultButton = document.getElementById('share-result'); // Assumed ID if exists
const clothingTypeElement = document.getElementById('clothing-type');
const paymentCodePanel = document.getElementById('payment-code-panel');
const paymentCodeElement = document.getElementById('payment-code');
const generateCodeButton = document.getElementById('generate-payment-code');
const copyCodeButton = document.getElementById('copy-code-btn');
// ... Add other necessary DOM element references ...

// --- App State ---
let appState = {
    modelImageFile: null,   // Store the File object directly
    clothingImageFile: null, // Store the File object directly
    credits: 0, // Will be fetched from server or localStorage cache
    currentResultImageUrl: null // Store the URL of the generated image
};

// --- Helper Functions ---

/**
 * Makes an authenticated fetch request.
 * Handles adding the Authorization header and basic error checking.
 * @param {string} url - The full API endpoint URL.
 * @param {object} options - Fetch options (method, body, etc.).
 * @returns {Promise<Response>} The fetch Response object.
 * @throws {Error} Throws error on network failure or if token is missing.
 */
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('authToken'); // Or sessionStorage

    if (!token) {
        // If no token, redirect to login immediately
        console.warn('No auth token found. Redirecting to login.');
        clearAuthData(); // Ensure local state is cleared
        window.location.href = 'index.html'; // Redirect to login
        throw new Error('Authentication token not found.'); // Prevent further execution
    }

    const headers = {
        ...(options.headers || {}), // Keep existing headers if any
        'Authorization': `Bearer ${token}`
    };

    // Don't set Content-Type for FormData, browser does it automatically
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }


    try {
        const response = await fetch(url, { ...options, headers });

        // If unauthorized (e.g., token expired), redirect to login
        if (response.status === 401 || response.status === 403) {
            console.warn(`Authentication error (${response.status}). Redirecting to login.`);
            clearAuthData();
            window.location.href = 'index.html';
            throw new Error(`Authentication failed (${response.status})`); // Stop processing
        }

        return response; // Return the raw response for further handling

    } catch (error) {
        console.error('Authenticated fetch failed:', error);
        // Don't automatically redirect on network errors, but handle specific auth errors above.
        throw error; // Re-throw network or other errors
    }
}

/**
 * Clears authentication-related data from storage.
 */
function clearAuthData() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('credits');
    localStorage.removeItem('userIdentifier');
    // Clear any legacy items if they might exist
    localStorage.removeItem('user');
    localStorage.removeItem('password');
    localStorage.removeItem('phoneNumber');
}

/**
 * Updates the credit display in the UI and optionally updates localStorage cache.
 * @param {number} newCredits - The new credit amount.
 */
function updateCreditDisplay(newCredits) {
    appState.credits = newCredits; // Update internal state
    const creditsStr = String(newCredits);
    if (creditValue) creditValue.textContent = creditsStr;
    if (availableCredits) availableCredits.textContent = creditsStr;
    localStorage.setItem('credits', creditsStr); // Update cache
}

/**
 * Fetches the current credit amount from the backend securely.
 */
async function fetchAndUpdateCredits() {
    try {
        // Use a dedicated endpoint like /api/me or /api/credits
        const response = await authenticatedFetch(`${API_BASE_URL}/api/kredi_amount`, { // Example endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tel : localStorage.getItem("userIdentifier")}) 
        });

        if (response.ok) {
            const data = await response.json();
            if (data && typeof data.kredi !== 'undefined') {
                updateCreditDisplay(data.kredi);
                console.log('Credits updated from server:', data.credits);
            } else {
                console.error("API response missing credits:", data);
                // Keep existing credits but maybe show a warning
            }
        } else {
            console.error('Failed to fetch credits:', response.status);
            // Handle error appropriately, maybe show cached value with warning
        }
    } catch (error) {
        console.error('Error fetching credits:', error);
        // Handle network or auth errors (auth errors handled in authenticatedFetch)
        // Maybe show cached value with a warning about potential inaccuracy
    }
}


// --- Event Handlers ---

function handleModelImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        appState.modelImageFile = file; // Store the File object
        const reader = new FileReader();
        reader.onload = function(e) {
            if (modelPreview) {
                modelPreview.src = e.target.result; // Show preview
                modelPreview.classList.remove('hidden');
            }
            // Hide placeholder icon (add ID if needed)
            const icon = document.querySelector('#model-upload-box .upload-icon');
            if (icon) icon.classList.add('hidden');
        };
        reader.readAsDataURL(file); // Read for preview
        checkTryOnButtonState();
    } else {
        appState.modelImageFile = null; // Clear if invalid file
        if (modelPreview) modelPreview.classList.add('hidden');
        const icon = document.querySelector('#model-upload-box .upload-icon');
            if (icon) icon.classList.remove('hidden');
        checkTryOnButtonState();
        if (file) alert('Lütfen geçerli bir resim dosyası seçin.');
    }
}

function handleClothingImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        appState.clothingImageFile = file; // Store the File object
        const reader = new FileReader();
        reader.onload = function(e) {
            if (clothingPreview) {
                clothingPreview.src = e.target.result;
                clothingPreview.classList.remove('hidden');
            }
             const icon = document.querySelector('#clothing-upload-box .upload-icon');
             if (icon) icon.classList.add('hidden');
        };
        reader.readAsDataURL(file);
        checkTryOnButtonState();
    } else {
         appState.clothingImageFile = null;
         if (clothingPreview) clothingPreview.classList.add('hidden');
          const icon = document.querySelector('#clothing-upload-box .upload-icon');
             if (icon) icon.classList.remove('hidden');
         checkTryOnButtonState();
         if (file) alert('Lütfen geçerli bir resim dosyası seçin.');
    }
}

function checkTryOnButtonState() {
    if (tryOnButton && clothingTypeElement) {
        // Enable only if both files are selected AND a category is chosen
        tryOnButton.disabled = !(appState.modelImageFile && appState.clothingImageFile && clothingTypeElement.value);
    }
}

async function handleTryOn() {
    if (!appState.modelImageFile || !appState.clothingImageFile || !clothingTypeElement || !clothingTypeElement.value) {
        alert('Lütfen model, kıyafet resmi ve kıyafet tipi seçin.');
        return;
    }

     // Double-check credits before sending the request
    if (appState.credits < TRY_ON_COST) {
        alert(`Yeterli kredi yok! Bu işlem için ${TRY_ON_COST} kredi gereklidir. Lütfen kredi satın alın.`);
        navigate('kredi'); // Redirect to credit page
        return;
    }

    if (tryOnButton) {
        tryOnButton.disabled = true;
        tryOnButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> İşleniyor...';
    }
    resultContainer.classList.add('hidden'); // Hide previous result

    const formData = new FormData();
    formData.append('model_image', appState.modelImageFile);
    formData.append('garment_image', appState.clothingImageFile);
    formData.append('category', clothingTypeElement.value);

    try {
        // IMPORTANT: Backend MUST verify user via token and deduct credit server-side
        // The API call itself triggers the process; credit deduction confirmation comes from server
        const response = await authenticatedFetch(`${API_BASE_URL}/api/tryon`, {
            method: 'POST',
            body: formData,
            // No Content-Type header needed for FormData
        });

        if (!response.ok) {
            let errorMsg = 'Deneme işlemi başarısız oldu.';
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorData.message || `Sunucu hatası: ${response.status}`;
            } catch (e) {
                 errorMsg = `Sunucu hatası: ${response.status}`;
            }
            alert(`Hata: ${errorMsg}`);
            // Do NOT deduct credits client-side on failure
        } else {
            const result = await response.json();
            if (result?.data?.resultImage) {
                appState.currentResultImageUrl = result.data.resultImage; // Store result URL
                if (resultImage) {
                   resultImage.src = appState.currentResultImageUrl;
                   resultContainer.classList.remove('hidden');
                }
                const response2 = await authenticatedFetch(`${API_BASE_URL}/api/kredi_guncelle`, { 
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tel : localStorage.getItem("userIdentifier")})
              });
                 alert('Deneme işlemi başarıyla tamamlandı!');
                 // Fetch updated credits from server AFTER successful operation
                 await fetchAndUpdateCredits();
            } else {
                console.error('API response format unexpected:', result);
                alert('Sunucudan geçerli bir sonuç alınamadı.');
            }
        }
    } catch (error) {
        // Handle network errors or auth errors from authenticatedFetch
        console.error('Try-on API error:', error);
        if (error.message.includes('Authentication failed')) {
            // Already handled by authenticatedFetch (redirect)
        } else {
             alert('Deneme sırasında bir hata oluştu: ' + error.message);
        }
        // Do NOT deduct credits client-side on error
    } finally {
        if (tryOnButton) {
            tryOnButton.disabled = false; // Re-enable after checking file state
            tryOnButton.innerHTML = '<i class="fas fa-magic"></i> Denemeyi Başlat';
            checkTryOnButtonState(); // Ensure button state is correct
        }
    }
}

function handleSaveResult() {
    if (!appState.currentResultImageUrl) {
        alert('Kaydedilecek bir sonuç görseli bulunamadı.');
        return;
    }
    const link = document.createElement('a');
    link.href = appState.currentResultImageUrl; // Use the stored URL
    link.download = `tryon_result_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Görsel cihazınıza kaydedildi!');
}

async function handleShareResult() {
     if (!appState.currentResultImageUrl) {
        alert('Paylaşılacak bir sonuç görseli bulunamadı.');
        return;
    }
    try {
        // Fetch the image data from the URL
        const response = await fetch(appState.currentResultImageUrl);
        if (!response.ok) throw new Error(`Görsel yüklenemedi: ${response.status}`);
        const blob = await response.blob();
        const file = new File([blob], `tryon_result_${Date.now()}.png`, { type: blob.type });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'Sanal Deneme Sonucu',
                text: 'Bu kıyafeti sanal olarak denedim!',
                files: [file],
            });
            // console.log('Paylaşım başarılı!'); // No need for alert if native UI shows
        } else {
            alert('Tarayıcınız dosya paylaşımını desteklemiyor. Görseli kaydedip manuel olarak paylaşabilirsiniz.');
        }
    } catch (err) {
        console.error('Paylaşım hatası:', err);
        if (err.name !== 'AbortError') {
            alert('Paylaşım sırasında bir hata oluştu.');
        }
    }
}

async function getPaymentCode() {
    if (!paymentCodePanel || !paymentCodeElement || !generateCodeButton) {
        console.error("Payment code elements not found.");
        return;
    }

    generateCodeButton.disabled = true;
    generateCodeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kod Alınıyor...';
    paymentCodePanel.classList.add('hidden'); // Hide previous code first

    let displayCode = 'Hata oluştu';

    try {
        // Backend MUST verify user via token
        // The request body might be empty if the endpoint gets user ID from token
        const response = await authenticatedFetch(`${API_BASE_URL}/api/odeme_kodu_al`, {
            method: 'POST', // Or GET if no body needed
            // body: JSON.stringify({}), // Send empty body if POST and needed by framework
        });

        if (response.ok) {
            const data = await response.json();
            if (data?.odeme_kodu) {
                displayCode = data.odeme_kodu;
                paymentCodePanel.classList.remove('hidden');
                paymentCodePanel.classList.add('panel-slide-in'); // Use existing animation class
            } else {
                console.error("API response missing payment code:", data);
                displayCode = 'Kod alınamadı';
                alert('Sunucudan ödeme kodu alınamadı.');
            }
        } else {
            let errorMsg = `Sunucu hatası: ${response.status}`;
            try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) {}
            console.error("API error fetching payment code:", errorMsg);
            displayCode = 'Kod alınamadı';
            alert(errorMsg);
        }
    } catch (error) {
        console.error('Network/Auth error fetching payment code:', error);
         if (!error.message.includes('Authentication failed')) { // Avoid double alert
             displayCode = 'Ağ/Kimlik Doğrulama Hatası';
             alert(`Ödeme kodu alınamadı: ${error.message}`);
         } else {
              displayCode = 'Oturum Hatası'; // Error already shown by authFetch
         }
    } finally {
        if (paymentCodeElement) paymentCodeElement.textContent = displayCode;
        if (generateCodeButton) {
            generateCodeButton.disabled = false;
            // Change text maybe?
            generateCodeButton.innerHTML = '<i class="fas fa-key"></i> Ödeme Kodu Al';
        }
    }
}

function copyPaymentCode() {
    if (!paymentCodeElement || !copyCodeButton) return;
    const code = paymentCodeElement.textContent;

    if (!code || code.includes('Hata') || code.includes('alınamadı') || code.includes('Hatası')) {
        alert('Kopyalanacak geçerli bir kod yok.');
        return;
    }

    navigator.clipboard.writeText(code).then(() => {
        const originalIconHTML = copyCodeButton.innerHTML;
        copyCodeButton.innerHTML = '<i class="fas fa-check"></i>'; // Just check is cleaner
        copyButton.disabled = true;
        setTimeout(() => {
            copyCodeButton.innerHTML = originalIconHTML;
            copyCodeButton.disabled = false;
        }, 1500);
    }).catch(err => {
        console.error('Kopyalama başarısız oldu: ', err);
        alert('Otomatik kopyalama başarısız oldu. Kodu manuel olarak seçip kopyalayabilirsiniz.');
    });
}

function navigate(section) {
    // Basic validation
    const validSections = ['anasayfa', 'kredi', 'profil', 'gecmis']; // Add other valid section IDs
    if (!validSections.includes(section)) {
        console.warn(`Invalid section navigation attempt: ${section}. Defaulting to anasayfa.`);
        section = 'anasayfa';
    }

    history.pushState({ page: section }, '', `?page=${section}`); // Add state object
    setActiveSection(section);
}

// Handle back/forward navigation
window.addEventListener('popstate', (event) => {
    const section = event.state?.page || 'anasayfa'; // Get section from state or default
    setActiveSection(section);
});


function setActiveSection(section) {
     let title = 'Anasayfa'; // Default title
    // Define titles in a map for easier management
     const titles = {
         'anasayfa': 'Anasayfa',
         'kredi': 'Kredi Satın Al',
         'profil': 'Profil',
         'gecmis': 'İşlem Geçmişi'
     };
     title = titles[section] || title; // Use mapped title or default

     if (headerTitle) {
         headerTitle.textContent = title;
     }

     // Hide all page sections first
     document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
     // Also hide the main try-on elements if navigating away from 'anasayfa'
     document.querySelectorAll('.upload-container, .clothing-type-container, #try-on-button, #result-container')
         .forEach(el => el.style.display = (section === 'anasayfa' ? '' : 'none'));


     const activeSection = document.getElementById(`${section}-section`);
     if (activeSection) {
         activeSection.classList.add('active');
     } else if (section !== 'anasayfa') {
         // If the target section doesn't exist (and it's not anasayfa), show anasayfa elements
          document.querySelectorAll('.upload-container, .clothing-type-container, #try-on-button, #result-container')
            .forEach(el => el.style.display = '');
          section = 'anasayfa'; // Update effective section
          if (headerTitle) headerTitle.textContent = titles.anasayfa;
          history.replaceState({ page: 'anasayfa' }, '', `?page=anasayfa`); // Correct history
     }


     // Update navigation highlight
     document.querySelectorAll('.navigationItem').forEach(item => item.classList.remove('active'));
     const activeNavItem = document.getElementById(`nav-${section}`); // Ensure nav item IDs match `nav-SECTION` pattern
     if (activeNavItem) {
         activeNavItem.classList.add('active');
     }

     window.scrollTo(0, 0); // Scroll to top on navigation
}


// --- Initialization ---

async function initializeApp() {
    console.log('Initializing app...');

    // 1. Check Authentication Token (handled by authenticatedFetch, but can pre-check)
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('No token, redirecting to login.');
        window.location.href = 'index.html';
        return; // Stop initialization
    }

    // 2. Fetch initial data (like credits) securely
    await fetchAndUpdateCredits(); // Initial credit fetch

    // 3. Setup Event Listeners
    if (fileInput1) fileInput1.addEventListener('change', handleModelImageUpload);
    if (fileInput2) fileInput2.addEventListener('change', handleClothingImageUpload);
    if (clothingTypeElement) clothingTypeElement.addEventListener('change', checkTryOnButtonState); // Check button when category changes
    if (tryOnButton) tryOnButton.addEventListener('click', handleTryOn);
    if (generateCodeButton) generateCodeButton.addEventListener('click', getPaymentCode);
    if (copyCodeButton) copyCodeButton.addEventListener('click', copyPaymentCode);
    // Add listeners for save/share if buttons exist
    if (saveResultButton) saveResultButton.addEventListener('click', handleSaveResult);
    if (shareResultButton) shareResultButton.addEventListener('click', handleShareResult);

    // Setup navigation listeners (removed inline onclick)
    document.querySelectorAll('.navigationItem[data-section]').forEach(item => {
         item.addEventListener('click', (e) => {
              e.preventDefault(); // Prevent default link behavior
              const section = item.getAttribute('data-section');
              navigate(section);
         });
    });

    // Add listeners for other buttons (logout, delete account, save profile, buy credits) here...
    // Example:
    // const logoutBtn = document.getElementById('logout-button'); // Assuming an ID
    // if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);


    // 4. Handle initial page load state (based on URL or default)
    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = urlParams.get('page') || 'anasayfa';
    setActiveSection(initialPage); // Set the initial active section and title

    // 5. Initial UI State
    checkTryOnButtonState(); // Set initial button state

    console.log('App initialized.');
}

// --- Run Initialization ---
document.addEventListener('DOMContentLoaded', initializeApp);

// --- Add other handlers like handleLogout, handleBuyCredits, etc. ---
// Remember to use authenticatedFetch for API calls within these handlers if they require user auth

function handleLogout() {
     if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
          alert('Başarıyla çıkış yapıldı.');
          clearAuthData();
          window.location.href = 'index.html'; // Redirect to login
     }
}

// Add placeholder functions if needed for profile save, delete, etc.
function handleSaveProfile() { alert('Profil kaydetme henüz uygulanmadı.'); }
function handleDeleteAccount() { alert('Hesap silme henüz uygulanmadı.'); }
function handleBuyCredits() { alert('Kredi satın alma henüz tam olarak uygulanmadı.'); navigate('kredi'); }


// Add CSS dynamically (as before, if needed)
const style = document.createElement('style');
style.textContent = `
  /* Keep existing dynamic styles for history/payment items if they are used */
  .history-item { /* ... */ }
  .history-image { /* ... */ }
  .history-date { /* ... */ }
  .payment-item { /* ... */ }
  .payment-details { /* ... */ }
  /* ... other dynamic styles ... */

  /* Animation for payment code panel */
  .panel-slide-in {
      max-height: 500px; /* Adjust as needed */
      opacity: 1;
      transition: max-height 0.5s ease-out, opacity 0.5s ease-out, margin-top 0.5s ease-out, visibility 0s linear 0s;
      overflow: hidden;
      margin-top: 16px;
      visibility: visible;
  }
  #payment-code-panel.hidden {
      max-height: 0;
      opacity: 0;
      margin-top: 0;
      overflow: hidden; /* Keep hidden */
      visibility: hidden;
      transition: max-height 0.5s ease-out, opacity 0.5s ease-out, margin-top 0.5s ease-out, visibility 0s linear 0.5s; /* Delay visibility change */
  }
`;
document.head.appendChild(style);