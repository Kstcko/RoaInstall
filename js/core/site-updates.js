const SiteUpdates = (() => {
  // ส่งคำขอไปยัง API ประกาศอัปเดตและแปลงข้อผิดพลาดเป็นข้อความอ่านง่าย
  async function request(action, data = {}) {
    let response;
    try {
      response = await fetch('api/site_updates.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });
    } catch (error) {
      throw new Error('เชื่อมต่อระบบประกาศอัปเดตไม่ได้ กรุณาตรวจสอบเซิร์ฟเวอร์');
    }

    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error('เซิร์ฟเวอร์ส่งข้อมูลประกาศไม่ถูกต้อง');
    }
    if (!response.ok) {
      const requestError = new Error(result.message || 'ดำเนินการเกี่ยวกับประกาศไม่สำเร็จ');
      requestError.status = response.status;
      throw requestError;
    }
    return result;
  }

  // โหลดรายการประกาศสำหรับผู้ใช้ปัจจุบัน
  async function getAll() {
    const result = await request('list');
    if (!Array.isArray(result.updates)
      || !Number.isInteger(result.unreadCount)
      || !result.updates.every(update => Array.isArray(update.changes))) {
      throw new Error('ข้อมูลประกาศอัปเดตจากเซิร์ฟเวอร์ไม่ถูกต้อง');
    }
    return result;
  }

  return {
    getAll,
    markRead: updateId => request('markRead', { updateId }),
    markAllRead: () => request('markAllRead'),
    getPendingChanges: () => request('pending'),
    publish: ({ title, summary }) => request('publish', { title, summary })
  };
})();
