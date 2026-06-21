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

export const FAMILY_COLORS = {
    "Mum & Dad": "#FFD93D",
    "Cian":      "#6BCBFF",
    "Mark":      "#4D96FF",
    "Erica":     "#FF6B6B",
};

export function docToEvent(doc) {
    const data = doc.data();
    return {
        id:              doc.id,
        title:           data.title,
        start:           data.start,
        end:             data.end,
        allDay:          true,
        backgroundColor: data.color || '#2e7d32',
        borderColor:     'white',
        textColor:       'white'
    };
}
