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
            document.body.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f4f8; flex-direction:column;">
                    <h2 style="font-family:'Inter'; color:#c62828;">Access Denied</h2>
                    <button onclick="location.reload()" style="padding:10px 20px; margin-top:20px; border-radius:10px; border:none; background:#ccc; font-size:16px;">Try Again</button>
                </div>`;
            return;
        }
    }

    try {
        await signInAnonymously(auth);
    } catch (e) {
        console.error("Auth failed", e);
        await Modal.show('confirm', 'Connection Problem',
            'Could not connect to the booking service. Please check your internet and reload.', 'OK');
        return;
    }

    initCalendar();
});
