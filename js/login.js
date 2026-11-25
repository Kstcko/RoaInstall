// ผูกการเข้าสู่ระบบและการขอลิงก์ตั้งรหัสผ่านใหม่
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const forgotPasswordDialog = document.getElementById('forgotPasswordDialog');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const recoveryMessage = document.getElementById('recoveryMessage');
  const resetSuccess = document.getElementById('passwordResetSuccess');
  if (new URLSearchParams(window.location.search).get('passwordReset') === 'success') {
    resetSuccess.hidden = false;
  }

  // เปิดกล่องขอกู้คืนรหัสผ่านและเติมอีเมลจากฟอร์ม Login
  document.getElementById('forgotPasswordLink').addEventListener('click', event => {
    event.preventDefault();
    recoveryMessage.textContent = '';
    recoveryMessage.classList.remove('show', 'a-reset-msg');
    forgotPasswordDialog.hidden = false;
    document.getElementById('recoveryEmail').value = document.getElementById('email').value;
    document.getElementById('recoveryEmail').focus();
  });
  document.getElementById('cancelPasswordReset').addEventListener('click', () => {
    forgotPasswordDialog.hidden = true;
    forgotPasswordForm.reset();
  });
  forgotPasswordDialog.addEventListener('click', event => {
    if (event.target === forgotPasswordDialog) forgotPasswordDialog.hidden = true;
  });
  // ส่งคำขอลิงก์ตั้งรหัสผ่านใหม่โดยไม่เปิดเผยว่ามีบัญชีหรือไม่
  forgotPasswordForm.addEventListener('submit', async event => {
    event.preventDefault();
    recoveryMessage.textContent = '';
    recoveryMessage.classList.remove('show', 'a-reset-msg');
    const submitButton = forgotPasswordForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const response = await fetch('api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'requestPasswordReset',
          email: document.getElementById('recoveryEmail').value
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'ส่งคำขอกู้คืนรหัสผ่านไม่สำเร็จ');
      recoveryMessage.textContent = result.message;
      recoveryMessage.classList.add('show', 'a-reset-msg');
    } catch (error) {
      recoveryMessage.textContent = error.message || 'เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่';
      recoveryMessage.classList.add('show');
    } finally {
      submitButton.disabled = false;
    }
  });

  // ตรวจฟอร์มและส่งข้อมูลเข้าสู่ระบบไปยัง Users API
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginError.textContent = '';
    loginError.classList.remove('show');
    loginForm.classList.add('was-validated');

    if (!loginForm.checkValidity()) return;

    const formData = new FormData(loginForm);
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const response = await fetch('api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: formData.get('email'),
          password: formData.get('password'),
          remember: formData.get('remember') === 'on'
        })
      });
      const result = await response.json();

      if (!response.ok) {
        loginError.textContent = result.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        loginError.classList.add('show');
        return;
      }

      AppAuth.setCurrentUser(result.user, formData.get('remember') === 'on');
      window.location.href = AppAuth.getLoginDestination();
    } catch (error) {
      loginError.textContent = 'เชื่อมต่อระบบไม่ได้ กรุณาเปิดโปรเจกต์ผ่าน XAMPP';
      loginError.classList.add('show');
    } finally {
      submitButton.disabled = false;
    }
  });
});
