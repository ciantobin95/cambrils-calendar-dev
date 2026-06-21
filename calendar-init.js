import Modal from './modal.js';
import { db, bookingsRef, FAMILY_COLORS, docToEvent } from './data.js';
import {
    addDoc, deleteDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const MS_PER_DAY = 86400000;

function parseDateInput(value) {
    // value is "YYYY-MM-DD"; build a local-midnight Date.
    return new Date(value + 'T00:00:00');
}

function toDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatFriendly(date) {
    return date.toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short'
    });
}

export function initCalendar() {
    const calendarEl       = document.getElementById('calendar');
    const bookingModal     = document.getElementById('bookingModal');
    const nameOptions      = document.getElementById('nameOptions');
    const legend           = document.getElementById('legend');

    const step1            = document.getElementById('bookingStep1');
    const step2            = document.getElementById('bookingStep2');
    const step3            = document.getElementById('bookingStep3');

    const arrivalInput     = document.getElementById('arrivalDate');
    const departureInput   = document.getElementById('departureDate');
    const nightsSummary    = document.getElementById('nightsSummary');
    const reviewSummary    = document.getElementById('reviewSummary');

    const openBookingBtn   = document.getElementById('openBookingBtn');
    const bookingCancelBtn = document.getElementById('bookingCancelBtn');
    const datesBackBtn     = document.getElementById('datesBackBtn');
    const datesNextBtn     = document.getElementById('datesNextBtn');
    const reviewBackBtn    = document.getElementById('reviewBackBtn');
    const reviewConfirmBtn = document.getElementById('reviewConfirmBtn');

    const monthLabel       = document.getElementById('currentMonthLabel');
    const prevMonthBtn      = document.getElementById('prevMonthBtn');
    const nextMonthBtn      = document.getElementById('nextMonthBtn');
    const todayBtn          = document.getElementById('customTodayBtn');

    let pendingName = null;

    // --- Build the name picker and the legend from the same source ---
    Object.entries(FAMILY_COLORS).forEach(([name, color]) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'name-option';
        option.innerHTML = `<span class="legend-swatch" style="background:${color};"></span>${name}`;
        option.addEventListener('click', () => {
            pendingName = name;
            goToStep(2);
        });
        nameOptions.appendChild(option);

        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<span class="legend-swatch" style="background:${color};"></span>${name}`;
        legend.appendChild(item);
    });

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView:          'dayGridMonth',
        firstDay:             1,
        showNonCurrentDates:  false,
        fixedWeekCount:       false,
        height:               'auto',
        headerToolbar:        false,
        dayMaxEvents:         false,
        selectable:           true,
        editable:             false,
        selectLongPressDelay: 200,
        longPressDelay:       200,

        datesSet: function(info) {
            monthLabel.innerText = info.view.title;
        },

        // Drag-select is kept as a shortcut: it prefills the dates and
        // drops the user into the same guided flow.
        select: function(info) {
            openBookingFlow(info.start, info.end);
            calendar.unselect();
        },

        eventClick: function(info) {
            showBookingDetails(info.event);
        }
    });

    calendar.render();

    // --- Month navigation ---
    prevMonthBtn.addEventListener('click', () => calendar.prev());
    nextMonthBtn.addEventListener('click', () => calendar.next());
    if (todayBtn) todayBtn.addEventListener('click', () => calendar.today());

    // --- Booking flow control ---
    function goToStep(n) {
        step1.style.display = (n === 1) ? 'block' : 'none';
        step2.style.display = (n === 2) ? 'block' : 'none';
        step3.style.display = (n === 3) ? 'block' : 'none';
        if (n === 2) refreshDateSummary();
        if (n === 3) refreshReview();
    }

    function openBookingFlow(startDate, endDate) {
        pendingName = null;
        nameOptions.querySelectorAll('.name-option')
            .forEach(o => o.classList.remove('selected'));

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minStr = toDateInputValue(today);
        arrivalInput.min = minStr;
        departureInput.min = minStr;

        const start = startDate || today;
        const end   = endDate   || new Date(start.getTime() + MS_PER_DAY);
        arrivalInput.value   = toDateInputValue(start);
        departureInput.value = toDateInputValue(end);

        goToStep(1);
        bookingModal.style.display = 'flex';
    }

    function closeBookingFlow() {
        bookingModal.style.display = 'none';
        pendingName = null;
    }

    function findOverlap(start, end) {
        let overlap = null;
        calendar.getEvents().forEach(event => {
            if (start < event.end && end > event.start) {
                overlap = event.title;
            }
        });
        return overlap;
    }

    function refreshDateSummary() {
        const start = parseDateInput(arrivalInput.value);
        let end = parseDateInput(departureInput.value);

        // Departure must be at least one night after arrival.
        if (end <= start) {
            end = new Date(start.getTime() + MS_PER_DAY);
            departureInput.value = toDateInputValue(end);
        }

        const nights = Math.round((end - start) / MS_PER_DAY);
        const nightWord = nights === 1 ? 'night' : 'nights';
        const overlap = findOverlap(start, end);

        if (overlap) {
            nightsSummary.classList.add('warning');
            nightsSummary.innerText =
                `Heads up: these dates overlap with ${overlap}'s booking. ` +
                `You can still continue if you want to.`;
        } else {
            nightsSummary.classList.remove('warning');
            nightsSummary.innerText =
                `${nights} ${nightWord} — arriving ${formatFriendly(start)}, ` +
                `leaving ${formatFriendly(end)}.`;
        }
    }

    function refreshReview() {
        const start = parseDateInput(arrivalInput.value);
        const end   = parseDateInput(departureInput.value);
        const nights = Math.round((end - start) / MS_PER_DAY);
        const nightWord = nights === 1 ? 'night' : 'nights';
        const overlap = findOverlap(start, end);

        let text =
            `${pendingName}\n` +
            `Arriving ${formatFriendly(start)}\n` +
            `Leaving ${formatFriendly(end)}\n` +
            `${nights} ${nightWord}`;
        reviewSummary.classList.toggle('warning', !!overlap);
        if (overlap) {
            text += `\n\nNote: overlaps with ${overlap}'s booking.`;
        }
        reviewSummary.innerText = text;
    }

    openBookingBtn.addEventListener('click', () => openBookingFlow());
    bookingCancelBtn.addEventListener('click', closeBookingFlow);
    datesBackBtn.addEventListener('click', () => goToStep(1));
    datesNextBtn.addEventListener('click', () => goToStep(3));
    reviewBackBtn.addEventListener('click', () => goToStep(2));
    arrivalInput.addEventListener('change', refreshDateSummary);
    departureInput.addEventListener('change', refreshDateSummary);

    reviewConfirmBtn.addEventListener('click', async () => {
        const start = parseDateInput(arrivalInput.value);
        const end   = parseDateInput(departureInput.value);
        const name  = pendingName;
        const color = FAMILY_COLORS[name] || "#0A5C8A";

        closeBookingFlow();
        const hideLoading = Modal.showLoading('Saving your booking…', 'Just a moment.');

        try {
            await addDoc(bookingsRef, {
                title: name,
                start: toDateInputValue(start),
                end:   toDateInputValue(end),
                color: color
            });
            hideLoading();
            await Modal.show(
                'success',
                'All done!',
                `${name} is booked, arriving ${formatFriendly(start)} ` +
                `and leaving ${formatFriendly(end)}.`,
                'Great'
            );
        } catch (e) {
            console.error(e);
            hideLoading();
            const retry = await Modal.show(
                'confirm',
                'That didn’t save',
                'We could not save the booking. Please check your internet and try again.',
                'Try again'
            );
            if (retry) {
                openBookingFlow(start, end);
                pendingName = name;
                goToStep(3);
            }
        }
    });

    // --- Tapping a booking: friendly details card, then optional remove ---
    async function showBookingDetails(event) {
        const start = event.start;
        const end   = event.end || new Date(start.getTime() + MS_PER_DAY);
        const color = event.backgroundColor || FAMILY_COLORS[event.title] || '#0A5C8A';
        const datesText =
            `Arriving ${formatFriendly(start)}<br>Leaving ${formatFriendly(end)}`;

        const remove = await Modal.showBookingDetails(event.title, color, datesText);
        if (!remove) return;

        const sure = await Modal.show(
            'confirm',
            'Remove this booking?',
            `This will remove ${event.title}'s booking. This cannot be undone.`,
            'Yes, remove',
            true
        );
        if (!sure) return;

        const hideLoading = Modal.showLoading('Removing…', 'Just a moment.');
        try {
            await deleteDoc(doc(db, "bookings", event.id));
            hideLoading();
            await Modal.show('success', 'Removed', 'The booking has been removed.', 'OK');
        } catch (e) {
            console.error(e);
            hideLoading();
            await Modal.show(
                'alert',
                'That didn’t work',
                'We could not remove the booking. Please check your internet and try again.',
                'OK'
            );
        }
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
    }, (error) => {
        console.error("Live updates failed", error);
    });
}
