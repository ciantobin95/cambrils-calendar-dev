import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth }                  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey:            "AIzaSyCbnDtx47cXLFYmHtN_rG1McLWItIS_Vrk",
    authDomain:        "cambrils-calendar.firebaseapp.com",
    projectId:         "cambrils-calendar",
    storageBucket:     "cambrils-calendar.firebasestorage.app",
    messagingSenderId: "20334837629",
    appId:             "1:20334837629:web:08992865bfd9042d98d614",
    measurementId:     "G-QLMW5KEDPK"
};

const firebaseApp = initializeApp(firebaseConfig);

export const db          = getFirestore(firebaseApp);
export const auth        = getAuth(firebaseApp);
export const bookingsRef = collection(db, "bookings");

export const FAMILY_PASSCODE = "Becky";

// High-contrast, colour-blind-distinguishable hues, all dark enough to read
// with white text (each clears WCAG AA against white event text).
export const FAMILY_COLORS = {
    "Mum & Dad": "#2A6F3D", // green
    "Cian":      "#1056A6", // blue
    "Mark":      "#6D3BB5", // purple
    "Erica":     "#B23E86", // magenta
};

export function docToEvent(doc) {
    const data = doc.data();
    // Colour is driven by who the booking is for, so the calendar always
    // matches the on-screen legend (older bookings keep any stored colour
    // only if the name is not one we recognise).
    const color = FAMILY_COLORS[data.title] || data.color || '#0A5C8A';
    return {
        id:              doc.id,
        title:           data.title,
        start:           data.start,
        end:             data.end,
        allDay:          true,
        backgroundColor: color,
        borderColor:     'white',
        textColor:       'white'
    };
}
