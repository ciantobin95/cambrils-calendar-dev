// ES modules are deferred, so the DOM is always parsed by the time this runs.
const Modal = {
    overlay:    document.getElementById('systemModal'),
    title:      document.getElementById('sysModalTitle'),
    message:    document.getElementById('sysModalMessage'),
    input:      document.getElementById('sysInput'),
    confirmBtn: document.getElementById('sysConfirmBtn'),
    cancelBtn:  document.getElementById('sysCancelBtn'),

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
    }
};

export default Modal;
