// ES modules are deferred, so the DOM is always parsed by the time this runs.
const CHECK_SVG = `
<div class="success-icon">
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <path class="checkmark" d="M25 52 L43 70 L76 32" />
  </svg>
</div>`;

const SPINNER = `<div class="loading-spinner" aria-hidden="true"></div>`;

const Modal = {
    overlay:    document.getElementById('systemModal'),
    visual:     document.getElementById('sysVisual'),
    title:      document.getElementById('sysModalTitle'),
    message:    document.getElementById('sysModalMessage'),
    input:      document.getElementById('sysInput'),
    actions:    document.getElementById('sysActions'),
    confirmBtn: document.getElementById('sysConfirmBtn'),
    cancelBtn:  document.getElementById('sysCancelBtn'),

    reset() {
        this.visual.innerHTML = '';
        this.input.style.display = 'none';
        this.actions.style.display = 'flex';
        this.cancelBtn.style.display = '';
        this.confirmBtn.style.display = '';
        this.confirmBtn.classList.add('btn-confirm');
        this.confirmBtn.classList.remove('btn-danger');
        this.confirmBtn.onclick = null;
        this.cancelBtn.onclick = null;
    },

    /*
     * type:
     *   'confirm'  -> message + Cancel/Confirm, resolves true/false
     *   'password' -> input + Cancel/Confirm, resolves entered value or false
     *   'alert'    -> message + single confirm button, resolves true
     *   'success'  -> big green tick + single confirm button, resolves true
     */
    show(type, titleText, messageText, confirmText = "OK", isDanger = false) {
        return new Promise((resolve) => {
            this.reset();
            this.title.innerText = titleText;
            this.message.innerText = messageText;
            this.confirmBtn.innerText = confirmText;

            if (type === 'password') {
                this.input.style.display = 'block';
                this.input.value = '';
                setTimeout(() => this.input.focus(), 50);
            }

            if (type === 'success') {
                this.visual.innerHTML = CHECK_SVG;
            }

            if (type === 'alert' || type === 'success') {
                this.cancelBtn.style.display = 'none';
            }

            if (isDanger) {
                this.confirmBtn.classList.add('btn-danger');
                this.confirmBtn.classList.remove('btn-confirm');
            }

            const cleanup = () => {
                this.overlay.style.display = 'none';
                this.confirmBtn.onclick = null;
                this.cancelBtn.onclick = null;
            };

            this.confirmBtn.onclick = () => {
                cleanup();
                resolve(type === 'password' ? this.input.value : true);
            };
            this.cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };

            this.overlay.style.display = 'flex';
        });
    },

    // A blocking, button-less spinner. Returns a function that hides it.
    showLoading(titleText, messageText = '') {
        this.reset();
        this.visual.innerHTML = SPINNER;
        this.title.innerText = titleText;
        this.message.innerText = messageText;
        this.actions.style.display = 'none';
        this.overlay.style.display = 'flex';
        return () => { this.overlay.style.display = 'none'; };
    },

    hide() {
        this.overlay.style.display = 'none';
    },

    /*
     * Friendly booking-details card: shows who + dates with a clear
     * "Remove this booking" button and a "Close" button.
     * Resolves true if the user chooses to remove, false otherwise.
     */
    showBookingDetails(name, swatchColor, datesText) {
        return new Promise((resolve) => {
            this.reset();
            this.title.innerText = 'This booking';
            this.visual.innerHTML = `
                <div class="details-row">
                    <span class="legend-swatch" style="background:${swatchColor};"></span>
                    <span>${name}</span>
                </div>`;
            this.message.innerHTML = `<span class="details-dates">${datesText}</span>`;

            this.cancelBtn.innerText = 'Close';
            this.confirmBtn.innerText = 'Remove this booking';
            this.confirmBtn.classList.add('btn-danger');
            this.confirmBtn.classList.remove('btn-confirm');

            const cleanup = () => {
                this.overlay.style.display = 'none';
                this.confirmBtn.onclick = null;
                this.cancelBtn.onclick = null;
            };

            this.confirmBtn.onclick = () => { cleanup(); resolve(true); };
            this.cancelBtn.onclick = () => { cleanup(); resolve(false); };

            this.overlay.style.display = 'flex';
        });
    }
};

export default Modal;
