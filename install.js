import Modal from './modal.js';

let deferredPrompt;

export function initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (
            localStorage.getItem("house_auth") === "true" &&
            localStorage.getItem("pwa_prompted") !== "true"
        ) {
            showInstallPrompt();
        }
    });
}

export async function showInstallPrompt() {
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) return;
    if (localStorage.getItem("pwa_prompted") === "true") return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
        await Modal.show(
            'confirm',
            'Install App 📱',
            'To add this calendar to your home screen:\n\n1. Tap the Share icon at the bottom of Safari.\n2. Tap "Add to Home Screen".',
            'Got it!'
        );
        localStorage.setItem("pwa_prompted", "true");
    } else if (deferredPrompt) {
        const wantInstall = await Modal.show(
            'confirm',
            'Install App 📱',
            'Would you like to install this calendar app?\n\n(Note: If it does not appear on your Home Screen automatically, check your App Drawer!)',
            'Yes, Install'
        );
        if (wantInstall) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
        }
        localStorage.setItem("pwa_prompted", "true");
    }
}
