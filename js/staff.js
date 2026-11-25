// เตรียมหน้าพนักงาน ตรวจสิทธิ์ และผูกการจัดการบัญชี/Role
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
  const editableRoles = ['admin', 'accounting', 'sales', 'technician', 'head_technician', 'intern', 'executive'];
  const staffList = document.getElementById('staffList');
  const staffCount = document.getElementById('staffCount');
  const staffStatus = document.getElementById('staffStatus');
  const staffMessage = document.getElementById('staffMessage');
  const searchInput = document.getElementById('staffSearch');
  const roleFilter = document.getElementById('roleFilter');
  const permissionRole = document.getElementById('permissionRole');
  const permissionNote = document.getElementById('permissionNote');
  const savePermissionsButton = document.getElementById('savePermissionsButton');
  const addEmployeeButton = document.getElementById('openAddEmployee');
  const addEmployeeDialog = document.getElementById('addEmployeeDialog');
  const addEmployeeForm = document.getElementById('addEmployeeForm');
  const addEmployeeError = document.getElementById('addEmployeeError');
  const cancelAddEmployee = document.getElementById('cancelAddEmployee');
  const resetPasswordDialog = document.getElementById('resetEmployeePasswordDialog');
  const resetPasswordForm = document.getElementById('resetEmployeePasswordForm');
  const resetPasswordEmail = document.getElementById('resetEmployeePasswordEmail');
  const resetPasswordError = document.getElementById('resetEmployeePasswordError');
  const cancelResetPassword = document.getElementById('cancelResetEmployeePassword');
  const permissionPanel = document.getElementById('permissionPanel');
  const developerVisibilityPanel = document.getElementById('developerVisibilityPanel');
  const developerVisibilityToggle = document.getElementById('developerVisibilityToggle');
  const siteUpdatePanel = document.getElementById('siteUpdatePanel');
  const siteUpdateFileStatus = document.getElementById('siteUpdateFileStatus');
  const siteUpdateFileList = document.getElementById('siteUpdateFileList');
  const siteUpdateForm = document.getElementById('siteUpdateForm');
  const siteUpdateMessage = document.getElementById('siteUpdateMessage');
  const publishSiteUpdateButton = document.getElementById('publishSiteUpdate');
  const refreshSiteChangesButton = document.getElementById('refreshSiteChanges');
  savePermissionsButton.disabled = true;
  const permissionInputs = [...document.querySelectorAll('[data-permission]')];
  const currentUser = AppAuth.getCurrentUser();
  const canManageRoles = ['admin', 'developer'].includes(currentUser?.role);
  const canManageRoleAssignments = ['admin', 'developer', 'executive'].includes(currentUser?.role);
  const canManageEmployees = ['admin', 'developer', 'executive'].includes(currentUser?.role);
  let users = [];
  let permissionsByRole = {};
  addEmployeeButton.hidden = !canManageEmployees;
  permissionPanel.hidden = !canManageRoles;
  developerVisibilityPanel.hidden = currentUser?.role !== 'developer';
  siteUpdatePanel.hidden = currentUser?.role !== 'developer';
  document.querySelector('#permissionRole option[value="developer"]').hidden = currentUser?.role !== 'developer';
  if (currentUser?.role === 'executive') {
    [...addEmployeeForm.elements.role.options].forEach(option => {
      option.hidden = option.value !== 'admin';
    });
    addEmployeeForm.elements.role.value = 'admin';
  } else if (currentUser?.role === 'admin') {
    [...addEmployeeForm.elements.role.options].forEach(option => {
      option.hidden = !['accounting', 'sales', 'technician', 'head_technician', 'intern'].includes(option.value);
    });
    addEmployeeForm.elements.role.value = 'sales';
  }

  // ส่งคำขอไป Users API และแนบข้อมูลข้อผิดพลาดจาก server
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

  // แสดงวันที่สร้างบัญชีในรูปแบบภาษาไทย
  const formatDate = value => {
    if (!value) return 'ไม่ระบุ';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'ไม่ระบุ' : date.toLocaleDateString('th-TH');
  };

  // ตรวจไฟล์เว็บที่เปลี่ยนไปและแสดงสรุปก่อนประกาศอัปเดต
  const loadPendingSiteChanges = async () => {
    siteUpdateFileStatus.textContent = 'กำลังตรวจไฟล์เว็บไซต์...';
    siteUpdateFileList.replaceChildren();
    try {
      const result = await SiteUpdates.getPendingChanges();
      if (result.initialized) {
        siteUpdateFileStatus.textContent = result.message;
        return;
      }
      if (!Array.isArray(result.changes)) {
        throw new Error('ข้อมูลรายการไฟล์ที่เปลี่ยนแปลงไม่ถูกต้อง');
      }
      if (result.changes.length === 0) {
        siteUpdateFileStatus.textContent = 'ไม่พบไฟล์ที่เปลี่ยนแปลงจากประกาศครั้งล่าสุด';
        return;
      }

      siteUpdateFileStatus.textContent = `ตรวจพบการเปลี่ยนแปลง ${result.changes.length} ส่วน`;
      const actionLabels = { added: 'เพิ่ม', updated: 'ปรับปรุง', removed: 'นำออก' };
      result.changes.forEach(change => {
        const item = document.createElement('li');
        const action = actionLabels[change.action] || 'เปลี่ยนแปลง';
        const count = Number(change.count) > 1 ? ` (${change.count} ไฟล์)` : '';
        item.textContent = `${action}: ${change.area}${count}`;
        siteUpdateFileList.append(item);
      });
    } catch (error) {
      siteUpdateFileStatus.textContent = error.message || 'ตรวจไฟล์เว็บไซต์ไม่สำเร็จ';
      if (error.status === 401) {
        AppAuth.logout();
        window.location.replace(`Login.html?returnTo=${encodeURIComponent('Staff.html')}`);
      }
    }
  };

  // เพิ่มแถวข้อมูลรายละเอียดพนักงานลงใน container
  const addDetail = (container, label, value) => {
    const detail = document.createElement('div');
    detail.className = 'staff-detail';
    const heading = document.createElement('span');
    heading.textContent = label;
    detail.append(heading, document.createTextNode(value || 'ไม่ระบุ'));
    container.append(detail);
  };

  // สร้างตัวเลือก Role ตามสิทธิ์ของผู้ดูแลและผู้ใช้เป้าหมาย
  const createRoleControl = user => {
    const control = document.createElement('div');
    control.className = 'staff-role-control';
    const label = document.createElement('label');
    label.textContent = 'กำหนด Role';
    const select = document.createElement('select');
    select.setAttribute('aria-label', `กำหนด Role ของ ${user.email}`);

    const roles = user.isDeveloper
      ? ['developer']
      : currentUser.role === 'admin'
        ? ['accounting', 'sales', 'technician', 'head_technician', 'intern']
        : currentUser.role === 'executive'
          ? ['admin']
          : editableRoles;
    const isCurrentUser = user.userId === currentUser?.userId;
    roles.forEach(role => {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = roleLabels[role];
      select.append(option);
    });
    if (!roles.includes(user.role)) {
      const option = document.createElement('option');
      option.value = user.role;
      option.textContent = roleLabels[user.role] || 'ยังไม่ได้กำหนด';
      select.prepend(option);
    }
    select.value = user.role;
    select.disabled = user.isDeveloper || isCurrentUser;
    label.append(select);

    const saveButton = document.createElement('button');
    saveButton.className = 'btn btn-primary';
    saveButton.type = 'button';
    saveButton.textContent = 'บันทึก';
    saveButton.disabled = user.isDeveloper || isCurrentUser;

    const initialRole = user.role;
    select.addEventListener('change', () => {
      saveButton.disabled = user.isDeveloper || isCurrentUser || select.value === initialRole;
    });
    saveButton.addEventListener('click', async () => {
      if (select.value === initialRole) return;
      if (!await AppDialogs.confirm(`ยืนยันเปลี่ยน Role ของ ${user.email} เป็น ${roleLabels[select.value]} หรือไม่?`, {
        title: 'ยืนยันแก้ไข Role',
        confirmText: 'บันทึก Role'
      })) {
        select.value = initialRole;
        saveButton.disabled = true;
        return;
      }
      saveButton.disabled = true;
      staffMessage.textContent = `กำลังบันทึก Role ของ ${user.email}...`;
      try {
        const result = await request('updateRole', { userId: user.userId, role: select.value });
        staffMessage.textContent = result.message;
        await loadUsers();
      } catch (error) {
        staffMessage.textContent = error.message;
        saveButton.disabled = user.isDeveloper || isCurrentUser || select.value === initialRole;
        if (error.status === 401) {
          AppAuth.logout();
          window.location.replace(`Login.html?returnTo=${encodeURIComponent('Staff.html')}`);
        }
      }
    });

    control.append(label, saveButton);
    if (user.isDeveloper || isCurrentUser) {
      const note = document.createElement('p');
      note.className = 'staff-developer-note';
      note.textContent = user.isDeveloper
        ? 'Role Developer สงวนไว้ให้บัญชีผู้พัฒนาและไม่สามารถเปลี่ยนได้'
        : 'ไม่สามารถเปลี่ยน Role ของบัญชีตัวเองได้';
      control.append(note);
    }
    return control;
  };

  // วาดรายชื่อพนักงานตามคำค้นและตัวกรอง Role
  const renderUsers = () => {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const selectedRole = roleFilter.value;
    const filteredUsers = users.filter(user => {
      const searchable = [
        user.firstName,
        user.lastName,
        user.email,
        user.phone
      ].join(' ').toLocaleLowerCase();
      return (!query || searchable.includes(query)) && (!selectedRole || user.role === selectedRole);
    });

    staffList.replaceChildren();
    staffCount.textContent = String(filteredUsers.length);
    staffStatus.textContent = filteredUsers.length === users.length
      ? `จากทั้งหมด ${users.length} บัญชี`
      : `แสดงจากทั้งหมด ${users.length} บัญชี`;

    if (filteredUsers.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'staff-empty';
      empty.textContent = 'ไม่พบพนักงานตามเงื่อนไขที่เลือก';
      staffList.append(empty);
      return;
    }

    filteredUsers.forEach(user => {
      const card = document.createElement('article');
      card.className = 'staff-card';

      const header = document.createElement('div');
      header.className = 'staff-card-header';
      const identity = document.createElement('div');
      identity.className = 'staff-identity';
      const name = document.createElement('h2');
      name.textContent = `${user.firstName} ${user.lastName}`.trim() || 'ผู้ใช้งาน';
      const email = document.createElement('span');
      email.className = 'staff-email';
      email.textContent = user.email || 'ไม่ระบุอีเมล';
      identity.append(name, email);

      const badge = document.createElement('span');
      badge.className = 'staff-role-badge';
      badge.textContent = roleLabels[user.role] || 'ยังไม่ได้กำหนด';
      header.append(identity, badge);

      const details = document.createElement('div');
      details.className = 'staff-details';
      addDetail(details, 'เบอร์โทรศัพท์', user.phone);
      addDetail(details, 'วันที่สมัคร', formatDate(user.createdAt));

      card.append(header, details);
      if (canManageRoleAssignments && !user.isDeveloper && user.userId !== currentUser?.userId) {
        card.append(createRoleControl(user));
      }
      if ((canManageEmployees || canManageRoles) && !user.isDeveloper && user.userId !== currentUser?.userId) {
        const actions = document.createElement('div');
        actions.className = 'staff-card-actions';
        if (canManageRoles) {
          const resetButton = document.createElement('button');
          resetButton.className = 'staff-reset-password-button';
          resetButton.type = 'button';
          resetButton.setAttribute('aria-label', `ตั้งรหัสผ่านใหม่ให้ ${user.email}`);
          resetButton.innerHTML = '<i class="bi bi-key" aria-hidden="true"></i><span>ตั้งรหัสผ่านใหม่</span>';
          resetButton.addEventListener('click', () => {
            resetPasswordForm.reset();
            resetPasswordError.textContent = '';
            resetPasswordForm.dataset.userId = user.userId;
            resetPasswordEmail.textContent = user.email;
            resetPasswordDialog.hidden = false;
            resetPasswordForm.elements.password.focus();
          });
          actions.append(resetButton);
        }
        if (!canManageEmployees) {
          card.append(actions);
          staffList.append(card);
          return;
        }
        const deleteButton = document.createElement('button');
        deleteButton.className = 'staff-delete-button';
        deleteButton.type = 'button';
        deleteButton.setAttribute('aria-label', `ลบบัญชี ${user.email}`);
        deleteButton.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i><span>ลบพนักงาน</span>';
        deleteButton.addEventListener('click', async () => {
          if (!await AppDialogs.confirm(
            `ต้องการลบบัญชี ${user.firstName} ${user.lastName} (${user.email}) หรือไม่? ประวัติการเปลี่ยนสถานะจะยังคงอยู่ แต่การแจ้งเตือนของบัญชีนี้จะถูกลบ`,
            { title: 'ยืนยันลบบัญชีพนักงาน', tone: 'danger', confirmText: 'ลบบัญชี' }
          )) return;

          deleteButton.disabled = true;
          staffMessage.textContent = `กำลังลบบัญชี ${user.email}...`;
          try {
            const result = await request('deleteEmployee', { userId: user.userId });
            await loadUsers();
            staffMessage.textContent = result.message;
          } catch (error) {
            staffMessage.textContent = error.message;
            deleteButton.disabled = false;
            if (error.status === 401) {
              AppAuth.logout();
              window.location.replace(`Login.html?returnTo=${encodeURIComponent('Staff.html')}`);
            }
          }
        });
        actions.append(deleteButton);
        card.append(actions);
      }
      staffList.append(card);
    });
  };

  // แสดง checkbox สิทธิ์ของ Role ที่กำลังเลือก
  const renderPermissionEditor = () => {
    const role = permissionRole.value;
    const permissions = permissionsByRole[role];
    if (!permissions) return;

    const lockedRole = role === 'developer';
    permissionInputs.forEach(input => {
      input.checked = permissions[input.dataset.permission] === true;
      input.disabled = lockedRole || (role === 'admin' && input.dataset.permission === 'tasks.view');
    });
    savePermissionsButton.disabled = lockedRole;
    permissionNote.textContent = lockedRole
      ? 'Role Developer สงวนสิทธิ์ทั้งหมดไว้และไม่สามารถแก้ไขได้'
      : role === 'admin'
        ? 'สิทธิ์ดูรายการงานของ Admin จำเป็นต่อการจัดการระบบ'
        : '';
  };

  // โหลดรายการ Role และสิทธิ์จาก API
  const loadRolePermissions = async () => {
    permissionNote.textContent = 'กำลังโหลดสิทธิ์...';
    try {
      const result = await request('listRolePermissions');
      if (!result.permissions || typeof result.permissions !== 'object') {
        throw new Error('รูปแบบข้อมูลสิทธิ์ไม่ถูกต้อง');
      }
      permissionsByRole = result.permissions;
      renderPermissionEditor();
    } catch (error) {
      permissionNote.textContent = error.message;
      savePermissionsButton.disabled = true;
      if (error.status === 401) {
        AppAuth.logout();
        window.location.replace(`Login.html?returnTo=${encodeURIComponent('Staff.html')}`);
      }
    }
  };

  // บันทึกสิทธิ์ที่ผู้ดูแลแก้ไข
  const saveRolePermissions = async () => {
    const role = permissionRole.value;
    if (role === 'developer') return;

    const permissions = Object.fromEntries(permissionInputs.map(input => [
      input.dataset.permission,
      input.checked
    ]));
    if (!await AppDialogs.confirm(`ยืนยันบันทึกการเปลี่ยนแปลงสิทธิ์ของ Role ${roleLabels[role]} หรือไม่?`, {
      title: 'ยืนยันบันทึกสิทธิ์',
      confirmText: 'บันทึกสิทธิ์'
    })) {
      renderPermissionEditor();
      permissionNote.textContent = 'ยกเลิกการบันทึกสิทธิ์แล้ว';
      return;
    }
    savePermissionsButton.disabled = true;
    permissionNote.textContent = 'กำลังบันทึกสิทธิ์...';
    try {
      const result = await request('updateRolePermissions', { role, permissions });
      permissionsByRole[role] = permissions;
      permissionNote.textContent = result.message;
    } catch (error) {
      permissionNote.textContent = error.message;
      if (error.status === 401) {
        AppAuth.logout();
        window.location.replace(`Login.html?returnTo=${encodeURIComponent('Staff.html')}`);
      }
    } finally {
      savePermissionsButton.disabled = role === 'developer';
    }
  };

  // โหลดรายชื่อพนักงานใหม่และอัปเดตผลบนหน้า
  const loadUsers = async () => {
    staffMessage.textContent = 'กำลังโหลดข้อมูลพนักงาน...';
    staffList.setAttribute('aria-busy', 'true');
    try {
      const result = await request('listUsers');
      if (!Array.isArray(result.users)) {
        throw new Error('รูปแบบข้อมูลพนักงานไม่ถูกต้อง');
      }
      users = result.users;
      if (currentUser?.role === 'developer') {
        developerVisibilityToggle.checked = result.developerVisibleToAdmins === true;
      }
      document.querySelector('#roleFilter option[value="developer"]').hidden =
        currentUser?.role !== 'developer'
        && !(currentUser?.role === 'admin' && result.developerVisibleToAdmins === true);
      renderUsers();
      staffMessage.textContent = '';
    } catch (error) {
      staffList.replaceChildren();
      staffCount.textContent = '0';
      staffStatus.textContent = '';
      staffMessage.textContent = error.message;
      if (error.status === 401) {
        AppAuth.logout();
        window.location.replace(`Login.html?returnTo=${encodeURIComponent('Staff.html')}`);
      }
    } finally {
      staffList.removeAttribute('aria-busy');
    }
  };

  // ปิดฟอร์มสร้างพนักงานและคืนสถานะปุ่ม
  const closeAddEmployeeDialog = () => {
    addEmployeeDialog.hidden = true;
    addEmployeeForm.reset();
    addEmployeeError.textContent = '';
  };

  addEmployeeButton.addEventListener('click', () => {
    addEmployeeError.textContent = '';
    addEmployeeDialog.hidden = false;
    addEmployeeForm.elements.firstName.focus();
  });
  cancelAddEmployee.addEventListener('click', closeAddEmployeeDialog);
  addEmployeeDialog.addEventListener('click', event => {
    if (event.target === addEmployeeDialog) closeAddEmployeeDialog();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !addEmployeeDialog.hidden) closeAddEmployeeDialog();
  });
  // ปิดฟอร์มตั้งรหัสผ่านพนักงานและล้างข้อมูลชั่วคราว
  const closeResetPasswordDialog = () => {
    resetPasswordDialog.hidden = true;
    resetPasswordForm.reset();
    delete resetPasswordForm.dataset.userId;
    resetPasswordError.textContent = '';
  };
  cancelResetPassword.addEventListener('click', closeResetPasswordDialog);
  resetPasswordDialog.addEventListener('click', event => {
    if (event.target === resetPasswordDialog) closeResetPasswordDialog();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !resetPasswordDialog.hidden) closeResetPasswordDialog();
  });
  resetPasswordForm.addEventListener('submit', async event => {
    event.preventDefault();
    resetPasswordError.textContent = '';
    const data = new FormData(resetPasswordForm);
    const password = String(data.get('password') || '');
    if (password !== String(data.get('confirmPassword') || '')) {
      resetPasswordError.textContent = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
      return;
    }
    const submitButton = resetPasswordForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const result = await request('adminResetPassword', {
        userId: resetPasswordForm.dataset.userId,
        password
      });
      closeResetPasswordDialog();
      staffMessage.textContent = result.message;
    } catch (error) {
      resetPasswordError.textContent = error.message || 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ';
      if (error.status === 401) {
        AppAuth.logout();
        window.location.replace(`Login.html?returnTo=${encodeURIComponent('Staff.html')}`);
      }
    } finally {
      submitButton.disabled = false;
    }
  });
  addEmployeeForm.addEventListener('submit', async event => {
    event.preventDefault();
    addEmployeeError.textContent = '';
    const submitButton = addEmployeeForm.querySelector('[type="submit"]');
    const data = new FormData(addEmployeeForm);
    submitButton.disabled = true;
    try {
      const result = await request('createEmployee', {
        firstName: data.get('firstName'),
        lastName: data.get('lastName'),
        email: data.get('email'),
        phone: data.get('phone'),
        role: data.get('role'),
        password: data.get('password')
      });
      closeAddEmployeeDialog();
      staffMessage.textContent = result.message;
      await loadUsers();
    } catch (error) {
      addEmployeeError.textContent = error.message || 'เพิ่มพนักงานไม่สำเร็จ';
      if (error.status === 401) {
        AppAuth.logout();
        window.location.replace(`Login.html?returnTo=${encodeURIComponent('Staff.html')}`);
      }
    } finally {
      submitButton.disabled = false;
    }
  });

  searchInput.addEventListener('input', renderUsers);
  roleFilter.addEventListener('change', renderUsers);
  permissionRole.addEventListener('change', renderPermissionEditor);
  savePermissionsButton.addEventListener('click', saveRolePermissions);
  developerVisibilityToggle.addEventListener('change', async () => {
    const nextValue = developerVisibilityToggle.checked;
    developerVisibilityToggle.disabled = true;
    staffMessage.textContent = 'กำลังบันทึกการอนุญาต...';
    try {
      const result = await request('setDeveloperVisibility', { visible: nextValue });
      staffMessage.textContent = result.message;
      await loadUsers();
    } catch (error) {
      developerVisibilityToggle.checked = !nextValue;
      staffMessage.textContent = error.message || 'บันทึกการอนุญาตไม่สำเร็จ';
    } finally {
      developerVisibilityToggle.disabled = false;
    }
  });
  refreshSiteChangesButton.addEventListener('click', loadPendingSiteChanges);
  siteUpdateForm.addEventListener('submit', async event => {
    event.preventDefault();
    siteUpdateMessage.textContent = '';
    if (!await AppDialogs.confirm(
      'เมื่อเผยแพร่แล้ว ผู้ใช้งานจะเห็นประกาศนี้ในกระดิ่งแจ้งเตือน',
      { title: 'ยืนยันเผยแพร่ประกาศ', confirmText: 'เผยแพร่ประกาศ' }
    )) return;

    publishSiteUpdateButton.disabled = true;
    try {
      const data = new FormData(siteUpdateForm);
      const result = await SiteUpdates.publish({
        title: data.get('title'),
        summary: data.get('summary')
      });
      siteUpdateForm.reset();
      siteUpdateMessage.textContent = result.message;
      await loadPendingSiteChanges();
    } catch (error) {
      siteUpdateMessage.textContent = error.message || 'เผยแพร่ประกาศไม่สำเร็จ';
      if (error.status === 401) {
        AppAuth.logout();
        window.location.replace(`Login.html?returnTo=${encodeURIComponent('Staff.html')}`);
      }
    } finally {
      publishSiteUpdateButton.disabled = false;
    }
  });
  await Promise.all([
    loadUsers(),
    canManageRoles ? loadRolePermissions() : Promise.resolve(),
    currentUser?.role === 'developer' ? loadPendingSiteChanges() : Promise.resolve()
  ]);
});
