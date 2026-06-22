import Modal from './modal.js';
import { db, bookingsRef, FAMILY_COLORS, docToEvent } from './data.js';
import {
    addDoc, deleteDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const MS_PER_DAY = 86400000;

function parseDateInput(value) {
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

    const pickerHint       = document.getElementById('pickerHint');
    const pickerMonthLabel = document.getElementById('pickerMonthLabel');
    const pickerPrevBtn    = document.getElementById('pickerPrevBtn');
    const pickerNextBtn    = document.getElementById('pickerNextBtn');
    const pickerEl         = document.getElementById('bookingPicker');

    const monthLabel       = document.getElementById('currentMonthLabel');
    const prevMonthBtn     = document.getElementById('prevMonthBtn');
    const nextMonthBtn     = document.getElementById('nextMonthBtn');
    const todayBtn         = document.getElementById('customTodayBtn');

    let pendingName = null;

    // ---- Range picker state ----
    let pickStart = null;   // Date | null
    let pickEnd   = null;   // Date | null
    let picker    = null;   // FullCalendar instance, lazily created

    // ---- Build name picker and legend from the same source ----
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

    // ---- Main month calendar ----
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

        datesSet(info) {
            monthLabel.innerText = info.view.title;
        },

        select(info) {
            openBookingFlow(info.start, info.end);
            calendar.unselect();
        },

        eventClick(info) {
            showBookingDetails(info.event);
        }
    });

    calendar.render();

    prevMonthBtn.addEventListener('click', () => calendar.prev());
    nextMonthBtn.addEventListener('click', () => calendar.next());
    if (todayBtn) todayBtn.addEventListener('click', () => calendar.today());

    // ---- Range picker: lazy init ----
    function ensurePicker() {
        if (picker) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        picker = new FullCalendar.Calendar(pickerEl, {
            initialView:     'dayGridMonth',
            firstDay:        1,
            showNonCurrentDates: false,
            fixedWeekCount:  false,
            height:          'auto',
            headerToolbar:   false,
            selectable:      false,   // we handle all clicks manually
            editable:        false,
            validRange:      { start: toDateInputValue(today) },

            datesSet(info) {
                pickerMonthLabel.innerText = info.view.title;
                applyPickerHighlight();
            },

            // Drag on the picker also sets the range
            dateClick(info) {
                const clicked = info.date;
                clicked.setHours(0, 0, 0, 0);
                const todayCheck = new Date();
                todayCheck.setHours(0, 0, 0, 0);
                if (clicked < todayCheck) return;   // past day, ignore

                if (!pickStart || pickEnd) {
                    // No selection yet, or starting fresh after a complete range
                    pickStart = clicked;
                    pickEnd   = null;
                } else if (clicked <= pickStart) {
                    // Tapped same or earlier day: shift start
                    pickStart = clicked;
                    pickEnd   = null;
                } else {
                    // Valid second tap: set the end
                    pickEnd = clicked;
                }
                commitPickerSelection();
            }
        });

        picker.render();
        pickerPrevBtn.addEventListener('click', () => picker.prev());
        pickerNextBtn.addEventListener('click', () => picker.next());
    }

    // ---- Apply range highlight to picker day cells ----
    function applyPickerHighlight() {
        // Clear previous classes
        pickerEl.querySelectorAll('[data-date]').forEach(cell => {
            cell.classList.remove('pick-start', 'pick-end', 'pick-in-range', 'pick-past');
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        pickerEl.querySelectorAll('[data-date]').forEach(cell => {
            const d = new Date(cell.dataset.date + 'T00:00:00');
            if (d < today) {
                cell.classList.add('pick-past');
                return;
            }
            if (pickStart && toDateInputValue(d) === toDateInputValue(pickStart)) {
                cell.classList.add('pick-start');
            }
            if (pickEnd && toDateInputValue(d) === toDateInputValue(pickEnd)) {
                cell.classList.add('pick-end');
            }
            if (pickStart && pickEnd && d > pickStart && d < pickEnd) {
                cell.classList.add('pick-in-range');
            }
        });
    }

    // ---- Write hidden inputs, update summary and hint, enable Continue ----
    function commitPickerSelection() {
        applyPickerHighlight();

        if (pickStart && pickEnd) {
            arrivalInput.value   = toDateInputValue(pickStart);
            departureInput.value = toDateInputValue(pickEnd);
            pickerHint.innerHTML = `<strong>Arriving</strong> ${formatFriendly(pickStart)} &rarr; <strong>Leaving</strong> ${formatFriendly(pickEnd)}. Tap any day to change.`;
            datesNextBtn.disabled = false;
            nightsSummary.style.display = 'block';
            refreshDateSummary();
        } else if (pickStart) {
            arrivalInput.value   = toDateInputValue(pickStart);
            departureInput.value = '';
            pickerHint.innerHTML = `Arriving <strong>${formatFriendly(pickStart)}</strong>. Now tap your <strong>leaving</strong> day.`;
            datesNextBtn.disabled = true;
            nightsSummary.style.display = 'none';
        } else {
            pickerHint.innerHTML = `Tap your <strong>arrival</strong> day to start.`;
            datesNextBtn.disabled = true;
            nightsSummary.style.display = 'none';
        }
    }

    // ---- Booking flow control ----
    function goToStep(n) {
        step1.style.display = (n === 1) ? 'block' : 'none';
        step2.style.display = (n === 2) ? 'block' : 'none';
        step3.style.display = (n === 3) ? 'block' : 'none';

        if (n === 2) {
            ensurePicker();
            // picker.updateSize() is needed the first time it renders inside
            // a previously hidden modal so it measures the width correctly.
            requestAnimationFrame(() => {
                picker.updateSize();
                applyPickerHighlight();
            });
        }
        if (n === 3) refreshReview();
    }

    function openBookingFlow(startDate, endDate) {
        pendingName = null;
        nameOptions.querySelectorAll('.name-option')
            .forEach(o => o.classList.remove('selected'));

        // Seed the picker from drag-select on the main calendar (or clear it)
        if (startDate) {
            pickStart = new Date(startDate);
            pickStart.setHours(0, 0, 0, 0);
            // endDate from FullCalendar drag is exclusive (midnight next day),
            // so the last day the user dragged across IS the departure.
            pickEnd = endDate ? new Date(endDate.getTime() - MS_PER_DAY) : null;
            if (pickEnd) pickEnd.setHours(0, 0, 0, 0);
            // Make sure end is truly after start
            if (pickEnd && pickEnd <= pickStart) pickEnd = null;
        } else {
            pickStart = null;
            pickEnd   = null;
        }

        goToStep(1);
        bookingModal.style.display = 'flex';

        // Navigate the picker to the arrival month after it is mounted
        if (pickStart) {
            requestAnimationFrame(() => {
                if (picker) {
                    picker.gotoDate(pickStart);
                    commitPickerSelection();
                }
            });
        }
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
        if (!arrivalInput.value || !departureInput.value) return;
        const start = parseDateInput(arrivalInput.value);
        let end = parseDateInput(departureInput.value);

        if (end <= start) {
            end = new Date(start.getTime() + MS_PER_DAY);
            departureInput.value = toDateInputValue(end);
            if (pickEnd && pickEnd <= pickStart) pickEnd = null;
        }

        const nights    = Math.round((end - start) / MS_PER_DAY);
        const nightWord = nights === 1 ? 'night' : 'nights';
        const overlap   = findOverlap(start, end);

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
        const nights    = Math.round((end - start) / MS_PER_DAY);
        const nightWord = nights === 1 ? 'night' : 'nights';
        const overlap   = findOverlap(start, end);

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
    datesNextBtn.addEventListener('click', () => { if (!datesNextBtn.disabled) goToStep(3); });
    reviewBackBtn.addEventListener('click', () => goToStep(2));

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
                'That didn\u2019t save',
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

    // ---- Tapping a booking: friendly details card, then optional remove ----
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
            `This will remove ${event.title}\u2019s booking. This cannot be undone.`,
            'Yes, remove',
            true
        );
        if (!sure) return;

        const hideLoading = Modal.showLoading('Removing\u2026', 'Just a moment.');
        try {
            await deleteDoc(doc(db, "bookings", event.id));
            hideLoading();
            await Modal.show('success', 'Removed', 'The booking has been removed.', 'OK');
        } catch (e) {
            console.error(e);
            hideLoading();
            await Modal.show(
                'alert',
                'That didn\u2019t work',
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
