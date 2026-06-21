import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- 1. REGISTER SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.error('Service Worker Registration Failed', err));
    });
}

const firebaseConfig = {
  apiKey: "AIzaSyCbnDtx47cXLFYmHtN_rG1McLWItIS_Vrk",
  authDomain: "cambrils-calendar.firebaseapp.com",
  projectId: "cambrils-calendar",
  storageBucket: "cambrils-calendar.firebasestorage.app",
  messagingSenderId: "20334837629",
  appId: "1:20334837629:web:08992865bfd9042d98d614",
  measurementId: "G-QLMW5KEDPK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const bookingsRef = collection(db, "bookings");

const FAMILY_PASSCODE = "Becky"; 

const FAMILY_COLORS = {
    "Mum & Dad": "#FFD93D", 
    "Cian": "#6BCBFF",      
    "Mark": "#4D96FF",      
    "Erica": "#FF6B6B",     
};

// --- MODAL SYSTEM ---
const Modal = {
    overlay: document.getElementById('systemModal'),
    title: document.getElementById('sysModalTitle'),
    message: document.getElementById('sysModalMessage'),
    input: document.getElementById('sysInput'),
    confirmBtn: document.getElementById('sysConfirmBtn'),
    cancelBtn: document.getElementById('sysCancelBtn'),

    show(type, titleText, messageText, confirmText = "OK", isDanger = false) {
        return new Promise((resolve) => {
            this.title.innerText = titleText;
            this.message.innerText = messageText;
            this.confirmBtn.innerText = confirmText;
            
            if (type === 'password') {
                this.input.style.display = 'block';
                this.input.value = '';
                this.input.focus();
            } else {
                this.input.style.display = 'none';
            }

            if (isDanger) {
                this.confirmBtn.classList.add('btn-danger');
                this.confirmBtn.classList.remove('btn-confirm');
            } else {
                this.confirmBtn.classList.add('btn-confirm');
                this.confirmBtn.classList.remove('btn-danger');
            }

            const handleConfirm = () => {
                cleanup();
                if (type === 'password') resolve(this.input.value);
                else resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                this.overlay.style.display = 'none';
                this.confirmBtn.onclick = null;
                this.cancelBtn.onclick = null;
            };

            this.confirmBtn.onclick = handleConfirm;
            this.cancelBtn.onclick = handleCancel;
            this.overlay.style.display = 'flex';
        });
    }
};

// --- 2. PWA INSTALL LOGIC ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (localStorage.getItem("house_auth") === "true" && localStorage.getItem("pwa_prompted") !== "true") {
        showInstallPrompt();
    }
});

async function showInstallPrompt() {
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) return;
    if (localStorage.getItem("pwa_prompted") === "true") return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
        await Modal.show('confirm', 'Install App 📱', 'To add this calendar to your home screen:\n\n1. Tap the Share icon at the bottom of Safari.\n2. Tap "Add to Home Screen".', 'Got it!');
        localStorage.setItem("pwa_prompted", "true");
    } else if (deferredPrompt) {
        const wantInstall = await Modal.show('confirm', 'Install App 📱', 'Would you like to install this calendar app?\n\n(Note: If it does not appear on your Home Screen automatically, check your App Drawer!)', 'Yes, Install');
        if (wantInstall) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
        }
        localStorage.setItem("pwa_prompted", "true");
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    
    // GATEKEEPER
    let authenticated = localStorage.getItem("house_auth");
    
    if (authenticated !== "true") {
        const entry = await Modal.show('password', 'Welcome Home', 'Please enter the Family Passcode:', 'Unlock');
        
        if (entry === FAMILY_PASSCODE) { 
            localStorage.setItem("house_auth", "true"); 
            setTimeout(showInstallPrompt, 1500); 
        } else { 
            document.body.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f4f8; flex-direction:column;">
                    <h2 style="font-family:'Inter'; color:#c62828;">Access Denied</h2>
                    <button onclick="location.reload()" style="padding:10px 20px; margin-top:20px; border-radius:10px; border:none; background:#ccc; font-size:16px;">Try Again</button>
                </div>`; 
            return; 
        }
    } else {
        setTimeout(showInstallPrompt, 1500);
    }

    try {
        await signInAnonymously(auth);
    } catch (e) {
        console.error("Auth failed", e);
        await Modal.show('confirm', 'Connection Problem',
            'Could not connect to the booking service. Please check your internet and reload.', 'OK');
        return;
    }

    const calendarEl = document.getElementById('calendar');
    const nameModal = document.getElementById('nameModal'); 
    const familySelect = document.getElementById('familySelect');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    let pendingSelection = null;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'multiMonthYear',
        multiMonthMaxColumns: 1, 
        showNonCurrentDates: false,
        height: 'auto',         
        headerToolbar: false,   

        // --- THE BUG FIX ---
        dayMaxEvents: false, // Prevents "+1 more" and forces the UI to render the colored bar
        // -------------------

        selectable: true,
        editable: false, 
        selectLongPressDelay: 200, 
        longPressDelay: 200,
        
        select: async function(info) {
            const existingEvents = calendar.getEvents();
            let overlapFound = false;
            let overlappingName = "";
            existingEvents.forEach(event => {
                if (info.start < event.end && info.end > event.start) {
                    overlapFound = true;
                    overlappingName = event.title;
                }
            });

            if (overlapFound) {
                const proceed = await Modal.show(
                    'confirm', 
                    'Double Booking!', 
                    `This overlaps with ${overlappingName}. Do you want to proceed anyway?`, 
                    'Book Anyway', 
                    true
                );
                
                if (!proceed) {
                    calendar.unselect();
                    return;
                }
            }

            pendingSelection = info;
            nameModal.style.display = 'flex';
        },

        eventClick: async function(info) {
            const confirmDelete = await Modal.show(
                'confirm', 
                'Delete Booking?', 
                `Are you sure you want to delete the booking for "${info.event.title}"?`, 
                'Yes, Delete', 
                true
            );

            if (confirmDelete) {
                const eventRef = doc(db, "bookings", info.event.id);
                try {
                    await deleteDoc(eventRef);
                } catch (e) {
                    console.error("Error deleting:", e);
                }
            }
        }
    });

    calendar.render();

    const todayBtn = document.getElementById('customTodayBtn');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            const todayElement = document.querySelector('.fc-day-today');
            if (todayElement) {
                todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    confirmBtn.onclick = async () => {
        if (!pendingSelection) return;
        const selectedName = familySelect.value;
        const color = FAMILY_COLORS[selectedName] || "#2e7d32";
        nameModal.style.display = 'none';
        try {
            await addDoc(bookingsRef, {
                title: selectedName,
                start: pendingSelection.startStr,
                end: pendingSelection.endStr,
                color: color
            });
        } catch (e) { console.error(e); }
        pendingSelection = null;
        calendar.unselect();
    };

    cancelBtn.onclick = () => {
        nameModal.style.display = 'none';
        pendingSelection = null;
        calendar.unselect();
    };

    function docToEvent(doc) {
        const data = doc.data();
        return {
            id: doc.id,
            title: data.title,
            start: data.start,
            end: data.end,
            allDay: true,
            backgroundColor: data.color || '#2e7d32',
            borderColor: 'white',
            textColor: 'white'
        };
    }

    onSnapshot(bookingsRef, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                calendar.addEvent(docToEvent(change.doc));
            } else if (change.type === 'removed') {
                calendar.getEventById(change.doc.id)?.remove();
            } else if (change.type === 'modified') {
                calendar.getEventById(change.doc.id)?.remove();
                calendar.addEvent(docToEvent(change.doc));
            }
        });
    });
});