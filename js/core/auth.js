/* กติกาการเข้าสู่ระบบของแอป */
const currentUserKey = 'install_current_user';
const protectedPages = ['services.html', 'Work.html', 'Report.html'];

// อ่านข้อมูลผู้ใช้ที่แคชไว้ใน Browser Storage
function getCurrentUser() {
  const user = AppStorage.readSession(currentUserKey) || AppStorage.read(currentUserKey);
  return user && typeof user === 'object' && user.email ? user : null;
}

// บันทึกผู้ใช้ปัจจุบันและเลือกว่าจะจำข้อมูลข้าม session หรือไม่
function setCurrentUser(user, remember = AppStorage.read(`${currentUserKey}_remember`, false)) {
  AppStorage.removeSession(currentUserKey);
  if (remember) {
    AppStorage.write(currentUserKey, user);
    AppStorage.write(`${currentUserKey}_remember`, true);
    return;
  }

  AppStorage.remove(currentUserKey);
  AppStorage.remove(`${currentUserKey}_remember`);
  AppStorage.writeSession(currentUserKey, user);
}

// แจ้ง API ให้ออกจากระบบแล้วล้างข้อมูล session ฝั่งหน้าเว็บ
function logout() {
  AppStorage.removeSession(currentUserKey);
  AppStorage.remove(currentUserKey);
  AppStorage.remove(`${currentUserKey}_remember`);
}

// ส่งผู้ใช้ที่ยังไม่เข้าสู่ระบบกลับไปหน้า Login เมื่อเปิดหน้าที่ป้องกัน
function requireProtectedPage() {
  const page = window.location.pathname.split('/').pop() || 'services.html';
  if (!protectedPages.includes(page) || getCurrentUser()) return true;

  const returnTo = `${page}${window.location.search}${window.location.hash}`;
  window.location.replace(`Login.html?returnTo=${encodeURIComponent(returnTo)}`);
  return false;
}

// เลือกหน้าปลายทางหลังเข้าสู่ระบบจาก URL ที่ร้องขอไว้
function getLoginDestination() {
  const requestedPage = new URLSearchParams(window.location.search).get('returnTo');
  const page = requestedPage ? requestedPage.split(/[?#]/)[0] : '';
  return requestedPage && protectedPages.includes(page) ? requestedPage : 'Profile.html';
}

const AppAuth = {
  getCurrentUser,
  setCurrentUser,
  logout,
  requireProtectedPage,
  getLoginDestination
};
