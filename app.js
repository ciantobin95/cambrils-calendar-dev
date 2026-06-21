import { auth, FAMILY_PASSCODE } from './data.js';
import Modal from './modal.js';
import { initCalendar } from './calendar-init.js';
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Registers the cleanup service worker so any device still running the old
// offline worker receives the self-removing replacement automatically.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}

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
});
