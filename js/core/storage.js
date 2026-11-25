/* ฟังก์ชันกลางสำหรับอ่านและเขียนข้อมูลใน Browser Storage */
const AppStorage = {
  // อ่าน JSON จาก localStorage พร้อมคืน fallback หากข้อมูลใช้ไม่ได้
  read(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  },

  // เขียนค่า JSON ลง localStorage สำหรับการจำค่าข้าม session
  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // ลบค่าออกจาก localStorage
  remove(key) {
    localStorage.removeItem(key);
  },

  // อ่าน JSON จาก sessionStorage ซึ่งหมดอายุเมื่อปิด session เบราว์เซอร์
  readSession(key, fallback = null) {
    try {
      const value = sessionStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  },

  // เขียนค่า JSON ลง sessionStorage
  writeSession(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  },

  // ลบค่าออกจาก sessionStorage
  removeSession(key) {
    sessionStorage.removeItem(key);
  }
};
