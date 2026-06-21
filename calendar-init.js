import Modal from './modal.js';
import { db, bookingsRef, FAMILY_COLORS, docToEvent } from './data.js';
import {
    addDoc, deleteDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function initCalendar() {
    const calendarEl   = document.getElementById('calendar');
    const nameModal    = document.getElementById('nameModal');
    const familySelect = document.getElementById('familySelect');
    const confirmBtn   = document.getElementById('confirmBtn');
    const cancelBtn    = document.getElementById('cancelBtn');

    let pendingSelection = null;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView:          'multiMonthYear',
        multiMonthMaxColumns: 1,
        showNonCurrentDates:  false,
        height:               'auto',
        headerToolbar:        false,
        dayMaxEvents:         false,
        selectable:           true,
        editable:             false,
        selectLongPressDelay: 200,
        longPressDelay:       200,

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
                end:   pendingSelection.endStr,
                color: color
            });
        } catch (e) {
            console.error(e);
        }
        pendingSelection = null;
        calendar.unselect();
    };

    cancelBtn.onclick = () => {
        nameModal.style.display = 'none';
        pendingSelection = null;
        calendar.unselect();
    };

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
}
