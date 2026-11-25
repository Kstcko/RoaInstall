// ตรวจ token ใน URL แล้วผูกฟอร์มตั้งรหัสผ่านใหม่
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('resetPasswordForm');
  const message = document.getElementById('resetPasswordMessage');
  const token = new URLSearchParams(window.location.search).get('token') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) {
    message.textContent = 'ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว';
    message.classList.add('show');
    form.querySelector('[type="submit"]').disabled = true;
    return;
  }

  // ตรวจรหัสผ่านสองช่องก่อนส่ง token และรหัสผ่านไปยัง API
  form.addEventListener('submit', async event => {
    event.preventDefault();
    message.textContent = '';
    message.classList.remove('show');
    const password = document.getElementById('newPassword').value;
    const confirmation = document.getElementById('confirmPassword').value;
    if (password !== confirmation) {
      message.textContent = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
      message.classList.add('show');
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const response = await fetch('api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetPassword', token, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ');
      window.location.replace(`Login.html?passwordReset=success`);
    } catch (error) {
      message.textContent = error.message || 'เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่';
      message.classList.add('show');
      submitButton.disabled = false;
    }
  });
});
