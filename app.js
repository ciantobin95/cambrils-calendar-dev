import { auth, FAMILY_PASSCODE } from './data.js';
import Modal from './modal.js';
import { initCalendar } from './calendar-init.js';
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Registers the cleanup service worker so any device still running the old
// offline worker receives the self-removing replacement automatically.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// --- Update available: surface a banner when a new deploy is live ---
const LOADED_VERSION = document
    .querySelector('meta[name="app-version"]')?.content;
let updateBannerShown = false;
let lastUpdateCheck = 0;

async function checkForUpdate() {
    // Skip during local dev: the workflow replaces this placeholder at deploy time.
    if (!LOADED_VERSION || LOADED_VERSION === '__APP_VERSION__') return;
    if (updateBannerShown) return;
    const now = Date.now();
    if (now - lastUpdateCheck < 60000) return;   // debounce: once a minute max
    lastUpdateCheck = now;
    try {
        const res = await fetch('version.json?_=' + now, { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json();
        if (version && version !== LOADED_VERSION) showUpdateBanner();
    } catch { /* offline or transient error - try again next time */ }
}

function showUpdateBanner() {
    const banner = document.getElementById('updateBanner');
    if (!banner) return;
    banner.hidden = false;
    updateBannerShown = true;
}

const updateBtn = document.getElementById('updateBannerBtn');
if (updateBtn) {
    updateBtn.addEventListener('click', () => {
        // Cache-bust the HTML; new HTML then references the latest assets.
        location.replace(location.pathname + '?u=' + Date.now());
    });
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
});

document.addEventListener('DOMContentLoaded', async function() {
    const authenticated = localStorage.getItem("house_auth");

    if (authenticated !== "true") {
        const entry = await Modal.show('password', 'Welcome Home', 'Please enter the Family Passcode:', 'Unlock');

        if (entry === FAMILY_PASSCODE) {
            localStorage.setItem("house_auth", "true");
        } else {
            await Modal.show('alert', 'That passcode wasn’t right',
                'Please try again with the family passcode.', 'Try again');
            location.reload();
            return;
        }
    }

    const hideLoading = Modal.showLoading('Connecting…', 'Loading the family calendar.');
    try {
        await signInAnonymously(auth);
    } catch (e) {
        console.error("Auth failed", e);
        hideLoading();
        await Modal.show('alert', 'No connection',
            'We could not connect to the booking service. Please check your internet and reload the page.', 'OK');
        return;
    }

    hideLoading();
    initCalendar();
    checkForUpdate();
});
