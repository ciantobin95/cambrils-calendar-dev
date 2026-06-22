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
// The banner needs to appear reliably whenever a change is merged into main,
// so the check is wired into every reasonable signal that a fresh deploy
// might be available: initial module load, returning to the tab, regaining
// focus, network coming back online, page restored from bfcache, and a
// periodic background poll for long-open sessions.
const LOADED_VERSION = document
    .querySelector('meta[name="app-version"]')?.content;
let updateBannerShown = false;
let lastUpdateCheck = 0;
// Short debounce so legitimate event-driven re-checks (e.g. quickly
// backgrounding and refocusing the app) aren't swallowed, while still
// preventing rapid-fire bursts if multiple events fire at once.
const UPDATE_CHECK_DEBOUNCE_MS = 10_000;
// While the app is open and visible, poll periodically so a deploy that
// lands mid-session doesn't go unnoticed until the user app-switches.
const UPDATE_CHECK_POLL_MS = 5 * 60 * 1000;

async function checkForUpdate() {
    // Skip during local dev: the workflow replaces this placeholder at deploy time.
    if (!LOADED_VERSION || LOADED_VERSION === '__APP_VERSION__') return;
    if (updateBannerShown) return;
    const now = Date.now();
    if (now - lastUpdateCheck < UPDATE_CHECK_DEBOUNCE_MS) return;
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

// Fire as early as possible — module scripts are deferred, so the DOM is
// already parsed and the banner element exists. This means the network
// request for version.json kicks off in parallel with the splash zoom and
// auth, instead of waiting for the calendar to finish initialising.
checkForUpdate();

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
});
// Some Android browsers fire focus instead of (or alongside) visibilitychange
// when the user returns to the PWA from the recents list. pageshow also
// covers the back/forward cache restoration path. online catches users who
// were offline when the deploy landed.
window.addEventListener('focus', () => checkForUpdate());
window.addEventListener('pageshow', () => checkForUpdate());
window.addEventListener('online', () => checkForUpdate());

setInterval(() => {
    if (document.visibilityState === 'visible') checkForUpdate();
}, UPDATE_CHECK_POLL_MS);

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
        // The ?v= query matches the cache-busted URL in the inline <style> in
        // index.html so this preload hits the same browser cache entry instead
        // of triggering a second network fetch.
        const img = new Image();
        let started = false;
        const start = () => { if (!started) { started = true; startZoom(); } };
        img.addEventListener('load', start);
        img.addEventListener('error', start);
        const versionedSplash = (LOADED_VERSION && LOADED_VERSION !== '__APP_VERSION__')
            ? `splash-cambrils.jpg?v=${LOADED_VERSION}`
            : 'splash-cambrils.jpg';
        img.src = versionedSplash;
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
});
