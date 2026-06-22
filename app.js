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

// --- Animated launch splash ---
// Runs a 3-second slow zoom over the beach photo, then dissolves to reveal
// the calendar. Resolves once the overlay is fully gone so the auth flow
// below can wait for it before popping the password / loading modal.
function runLaunchSplash() {
    const splash = document.getElementById('appSplash');
    if (!splash) {
        document.body.classList.remove('app-splash-active');
        return Promise.resolve();
    }

    return new Promise(resolve => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const ZOOM_MS = reduced ? 0 : 3000;
        const EXIT_MS = reduced ? 200 : 700;
        // Cap waiting for the image so a slow network can't strand the splash.
        const IMAGE_WAIT_MS = 1500;

        const finish = () => {
            if (splash.isConnected) splash.remove();
            document.body.classList.remove('app-splash-active', 'app-splash-leaving');
            resolve();
        };

        const beginExit = () => {
            document.body.classList.add('app-splash-leaving');
            splash.classList.add('is-leaving');
            // animationend can be missed if the element is removed early or in
            // edge browsers; the timeout is a belt-and-braces backstop.
            let done = false;
            const onEnd = () => {
                if (done) return;
                done = true;
                splash.removeEventListener('animationend', onEnd);
                finish();
            };
            splash.addEventListener('animationend', onEnd);
            setTimeout(onEnd, EXIT_MS + 100);
        };

        const startZoom = () => {
            splash.classList.add('is-zooming');
            setTimeout(beginExit, ZOOM_MS);
        };

        // Wait for the splash photo to fully decode before kicking off the zoom,
        // so the animation always starts on a painted frame. If the image takes
        // too long, start anyway — the OS splash is still visible underneath.
        const img = new Image();
        let started = false;
        const start = () => { if (!started) { started = true; startZoom(); } };
        img.addEventListener('load', start);
        img.addEventListener('error', start);
        img.src = 'splash-cambrils.jpg';
        setTimeout(start, IMAGE_WAIT_MS);
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    await runLaunchSplash();

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
