// โหลดโปรไฟล์และผูกการแก้ไขข้อมูลเมื่อหน้าเว็บพร้อม
document.addEventListener('DOMContentLoaded', async () => {
  const roleLabels = {
    admin: 'Admin',
    accounting: 'แผนกบัญชี',
    sales: 'แผนกขาย',
    technician: 'ช่าง',
    head_technician: 'หัวหน้าช่าง',
    intern: 'นักศึกษาฝึกงาน',
    executive: 'ผู้บริหาร',
    developer: 'Developer'
  };
  const profileInfo = document.getElementById('profileInfo');
  const profileMessage = document.getElementById('profileMessage');
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  const profileForm = document.getElementById('profileForm');
  const editProfileButton = document.getElementById('editProfileButton');
  const profilePhotoControl = document.getElementById('profilePhotoControl');
  const imageInput = document.getElementById('profileImageInput');
  const staffManagementLink = document.getElementById('staffManagementLink');
  let currentUser = AppAuth.getCurrentUser();

  // ส่งคำขอเกี่ยวกับบัญชีผู้ใช้ไปยัง Users API
  const request = async (action, data = {}) => {
    const response = await fetch('api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.message || 'ดำเนินการไม่สำเร็จ');
      error.status = response.status;
      throw error;
    }
    return result;
  };

  // แสดงหน้าสถานะเมื่อไม่มี session ที่ใช้งานได้
  const showSignedOut = message => {
    profileMessage.textContent = message;
    profileMessage.classList.add('p-login');
    profileInfo.hidden = true;
    profilePhotoControl.hidden = true;
    imageInput.hidden = true;
    loginButton.hidden = false;
    logoutButton.hidden = true;
    staffManagementLink.hidden = true;
  };

  // ปรับรูปแบบกรอบภาพโปรไฟล์ตามค่าที่บันทึกไว้
  const updateAvatarStyle = style => {
    const photoControl = document.getElementById('profilePhotoControl');
    photoControl.classList.remove('p-round', 'p-frame');
    if (style === 'rounded') photoControl.classList.add('p-round');
    if (style === 'frame') photoControl.classList.add('p-frame');
  };

  // เติมข้อมูลผู้ใช้ลงหน้าและปรับปุ่มตาม Role
  const displayUser = user => {
    currentUser = user;
    AppAuth.setCurrentUser(user);

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'ผู้ใช้งาน';
    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileEmail').textContent = user.email || '-';
    document.getElementById('profilePhone').textContent = user.phone || '-';
    document.getElementById('profileRole').textContent = roleLabels[user.role] || 'ยังไม่ได้กำหนด';
    document.getElementById('profileImage').src = user.avatar || 'https://i.pravatar.cc/128?img=12';
    document.getElementById('profileImage').alt = `รูปโปรไฟล์ของ ${fullName}`;
    updateAvatarStyle(user.avatarStyle || 'circle');

    profileMessage.textContent = '';
    profileMessage.classList.remove('p-login');
    profileInfo.hidden = false;
    profilePhotoControl.hidden = false;
    imageInput.hidden = false;
    loginButton.hidden = true;
    logoutButton.hidden = false;
    editProfileButton.hidden = false;
    staffManagementLink.hidden = !['admin', 'developer', 'executive'].includes(user.role);
  };

  // เติมช่องแก้ไขด้วยชื่อปัจจุบันก่อนเปิดฟอร์ม
  const setProfileFormValues = () => {
    document.getElementById('firstNameInput').value = currentUser.firstName || '';
    document.getElementById('lastNameInput').value = currentUser.lastName || '';
  };

  if (!currentUser) {
    showSignedOut('กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์');
    return;
  }

  try {
    const result = await request('currentUser');
    displayUser(result.user);
  } catch (error) {
    if (error.message === 'กรุณาเข้าสู่ระบบใหม่') {
      AppAuth.logout();
      showSignedOut(error.message);
      return;
    }
    showSignedOut(error.message);
    return;
  }

  editProfileButton.addEventListener('click', () => {
    setProfileFormValues();
    profileForm.hidden = false;
    editProfileButton.hidden = true;
    document.getElementById('firstNameInput').focus();
  });

  document.getElementById('cancelProfileButton').addEventListener('click', () => {
    profileForm.hidden = true;
    editProfileButton.hidden = false;
  });

  profileForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!profileForm.reportValidity()) return;
    if (!await AppDialogs.confirm('ยืนยันบันทึกการเปลี่ยนแปลงชื่อและนามสกุลหรือไม่?', {
      title: 'บันทึกข้อมูลโปรไฟล์',
      confirmText: 'บันทึก'
    })) return;

    const submitButton = document.getElementById('saveProfileButton');
    submitButton.disabled = true;
    profileMessage.textContent = 'กำลังบันทึกชื่อ...';
    try {
      const result = await request('updateProfile', {
        firstName: document.getElementById('firstNameInput').value,
        lastName: document.getElementById('lastNameInput').value
      });
      displayUser(result.user);
      profileForm.hidden = true;
      profileMessage.textContent = result.message;
    } catch (error) {
      profileMessage.textContent = error.message;
    } finally {
      submitButton.disabled = false;
    }
  });

  // ส่งภาพ avatar ใหม่ไปบันทึกแล้วอัปเดตโปรไฟล์
  const saveAvatar = async avatar => {
    const avatarStyle = currentUser.avatarStyle || 'circle';
    const result = await request('updateAvatar', { avatar, avatarStyle });
    displayUser(result.user);
    profileMessage.textContent = result.message;
  };

  document.getElementById('profileImageInput').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      profileMessage.textContent = 'รองรับไฟล์ PNG, JPG, WEBP หรือ GIF';
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      profileMessage.textContent = 'รูปภาพต้องมีขนาดไม่เกิน 2 MB';
      event.target.value = '';
      return;
    }
    if (!await AppDialogs.confirm('ยืนยันเปลี่ยนรูปโปรไฟล์หรือไม่?', {
      title: 'เปลี่ยนรูปโปรไฟล์',
      confirmText: 'เปลี่ยนรูป'
    })) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('error', () => {
      profileMessage.textContent = 'อ่านไฟล์รูปภาพไม่สำเร็จ';
    });
    reader.addEventListener('load', async () => {
      profileMessage.textContent = 'กำลังบันทึกรูป...';
      try {
        await saveAvatar(String(reader.result));
      } catch (error) {
        profileMessage.textContent = error.message;
      }
    });
    reader.readAsDataURL(file);
    event.target.value = '';
  });

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      await request('logout');
      AppAuth.logout();
      window.location.reload();
    } catch (error) {
      profileMessage.textContent = error.message;
      logoutButton.disabled = false;
    }
  });
});
