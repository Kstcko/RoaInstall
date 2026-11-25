(() => {
  // แสดงกล่องโต้ตอบมาตรฐานและคืนผลว่าผู้ใช้ยืนยันหรือยกเลิก
  const show = ({ title, message, confirmText, cancelText, tone, confirmOnly }) => new Promise(resolve => {
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = `app-dialog app-dialog--${tone}`;
    overlay.setAttribute('role', 'presentation');

    const panel = document.createElement('section');
    panel.className = 'app-dialog-card';
    panel.setAttribute('role', confirmOnly ? 'alertdialog' : 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'appDialogTitle');
    panel.setAttribute('aria-describedby', 'appDialogMessage');

    const icon = document.createElement('div');
    icon.className = 'app-dialog-icon';
    icon.setAttribute('aria-hidden', 'true');
    const iconElement = document.createElement('i');
    iconElement.className = ['danger', 'warning'].includes(tone) ? 'bi bi-exclamation-triangle' : 'bi bi-check2-circle';
    icon.append(iconElement);

    const heading = document.createElement('h2');
    heading.id = 'appDialogTitle';
    heading.textContent = title;
    const text = document.createElement('p');
    text.id = 'appDialogMessage';
    text.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'app-dialog-actions';
    // ปิดกล่อง คืน focus และส่งผลกลับให้ผู้เรียก
    const close = value => {
      document.removeEventListener('keydown', keydown);
      overlay.remove();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      resolve(value);
    };
    // รองรับปุ่ม Escape และการใช้งานกล่องโต้ตอบด้วยคีย์บอร์ด
    const keydown = event => {
      if (event.key === 'Escape') close(false);
      if (event.key === 'Tab') {
        const focusable = [...panel.querySelectorAll('button:not(:disabled)')];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    if (!confirmOnly) {
      const cancelButton = document.createElement('button');
      cancelButton.className = 'app-dialog-cancel';
      cancelButton.type = 'button';
      cancelButton.textContent = cancelText;
      cancelButton.addEventListener('click', () => close(false));
      actions.append(cancelButton);
    }

    const confirmButton = document.createElement('button');
    confirmButton.className = 'app-dialog-confirm';
    confirmButton.type = 'button';
    confirmButton.textContent = confirmText;
    confirmButton.addEventListener('click', () => close(true));
    actions.append(confirmButton);

    panel.append(icon, heading, text, actions);
    overlay.append(panel);
    overlay.addEventListener('click', event => {
      if (event.target === overlay && !confirmOnly) close(false);
    });
    document.addEventListener('keydown', keydown);
    document.body.append(overlay);
    confirmButton.focus();
  });

  window.AppDialogs = {
    confirm: (message, options = {}) => show({
      title: options.title || 'ยืนยันรายการ',
      message,
      confirmText: options.confirmText || 'ยืนยัน',
      cancelText: options.cancelText || 'ยกเลิก',
      tone: options.tone || 'primary',
      confirmOnly: false
    }),
    alert: (message, options = {}) => show({
      title: options.title || 'แจ้งให้ทราบ',
      message,
      confirmText: options.confirmText || 'รับทราบ',
      cancelText: '',
      tone: options.tone || 'primary',
      confirmOnly: true
    })
  };
})();
