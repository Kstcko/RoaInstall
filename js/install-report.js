// เตรียมหน้าส่งรายงานติดตั้งหลัง DOM พร้อมใช้งาน
document.addEventListener('DOMContentLoaded', async () => {
  if (!AppAuth.requireProtectedPage()) return;

  const form = document.getElementById('installReportForm');
  const taskSelect = document.getElementById('reportTask');
  const taskDetails = document.getElementById('reportTaskDetails');
  const technicianInput = document.getElementById('assignedTechnician');
  const photoInput = document.getElementById('reportPhotos');
  const photoPreview = document.getElementById('reportPhotoPreview');
  const message = document.getElementById('reportFormMessage');
  const submitButton = document.getElementById('submitReport');
  const successPanel = document.getElementById('reportSuccess');
  const successMessage = document.getElementById('reportSuccessMessage');
  const previewUrls = [];

  // ส่งคำขอไปยัง Install Report API และจัดการผลตอบกลับ
  const request = async (action, data = {}) => {
    let response;
    try {
      response = await fetch('api/install_reports.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });
    } catch (error) {
      throw new Error('เชื่อมต่อระบบ Report ไม่ได้ กรุณาตรวจสอบเซิร์ฟเวอร์และลองใหม่');
    }

    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error('เซิร์ฟเวอร์ส่งข้อมูล Report ไม่ถูกต้อง');
    }
    if (!response.ok) {
      throw new Error(result.message || 'ดำเนินการ Report ไม่สำเร็จ');
    }
    return result;
  };

  // แสดงรายละเอียดและช่างของงานที่ผู้ใช้เลือก
  const updateTaskDetails = tasks => {
    const task = tasks.find(item => String(item.id) === taskSelect.value);
    technicianInput.value = task?.technician || '';
    taskDetails.textContent = task
      ? `${task.department || 'ไม่ระบุผู้แจ้ง'} • ${task.assetIdentifier || 'ไม่มี Serial Number'} • ${task.detail}`
      : '';
  };

  // คืนหน่วยความจำ URL ของภาพตัวอย่างและล้างรายการแสดงผล
  const clearPreviews = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls.length = 0;
    photoPreview.replaceChildren();
  };

  // วาดภาพตัวอย่างไฟล์ที่เลือกก่อนส่งรายงาน
  const renderPreviews = files => {
    clearPreviews();
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      const caption = document.createElement('figcaption');
      image.src = url;
      image.alt = 'ตัวอย่างรูปภาพที่จะส่ง';
      caption.textContent = file.name;
      figure.append(image, caption);
      photoPreview.append(figure);
    });
  };

  // แปลง canvas เป็น JPEG ตามระดับคุณภาพที่กำหนด
  const canvasToBlob = (canvas, quality) => new Promise(resolve => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });

  // อ่าน Blob เป็น Data URL สำหรับส่ง JSON ไปยัง API
  const readAsDataUrl = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(new Error('อ่านรูปภาพไม่สำเร็จ')));
    reader.readAsDataURL(blob);
  });

  // ย่อภาพและบีบอัดให้ไม่เกินขนาดที่ API รับได้
  const compressPhoto = async file => {
    const imageUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = imageUrl;
      await image.decode();

      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('เตรียมรูปภาพไม่สำเร็จ');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      let blob = await canvasToBlob(canvas, .78);
      if (!blob) throw new Error('ประมวลผลรูปภาพไม่สำเร็จ');
      if (blob.size > 800000) {
        const reducedCanvas = document.createElement('canvas');
        const reducedScale = Math.min(1, 1100 / Math.max(canvas.width, canvas.height));
        reducedCanvas.width = Math.max(1, Math.round(canvas.width * reducedScale));
        reducedCanvas.height = Math.max(1, Math.round(canvas.height * reducedScale));
        const reducedContext = reducedCanvas.getContext('2d');
        if (!reducedContext) throw new Error('ปรับขนาดรูปภาพไม่สำเร็จ');
        reducedContext.drawImage(canvas, 0, 0, reducedCanvas.width, reducedCanvas.height);
        blob = await canvasToBlob(reducedCanvas, .62);
      }
      if (!blob || blob.size > 800000) {
        throw new Error('รูปภาพมีขนาดใหญ่เกินไปหลังปรับขนาด');
      }
      return readAsDataUrl(blob);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  photoInput.addEventListener('change', () => {
    message.textContent = '';
    const files = [...photoInput.files];
    if (files.length > 5) {
      photoInput.value = '';
      clearPreviews();
      message.textContent = 'แนบรูปภาพได้ไม่เกิน 5 รูป';
      return;
    }
    if (files.some(file => !file.type.startsWith('image/'))) {
      photoInput.value = '';
      clearPreviews();
      message.textContent = 'กรุณาเลือกไฟล์รูปภาพเท่านั้น';
      return;
    }
    renderPreviews(files);
  });

  taskSelect.addEventListener('change', () => updateTaskDetails(eligibleTasks));
  let eligibleTasks = [];

  form.addEventListener('submit', async event => {
    event.preventDefault();
    message.textContent = '';
    if (!form.reportValidity()) return;

    const files = [...photoInput.files];
    if (files.length < 1 || files.length > 5) {
      message.textContent = 'กรุณาแนบรูปภาพ 1 ถึง 5 รูป';
      return;
    }

    submitButton.disabled = true;
    message.textContent = 'กำลังปรับขนาดและบันทึกรูปภาพ...';
    try {
      const photos = await Promise.all(files.map(compressPhoto));
      const result = await request('submit', {
        taskId: taskSelect.value,
        specificationsChecked: document.getElementById('specificationsChecked').checked,
        neatnessChecked: document.getElementById('neatnessChecked').checked,
        warrantySealApplied: document.getElementById('warrantySealApplied').checked,
        computerType: document.getElementById('computerType').value.trim(),
        brand: document.getElementById('computerBrand').value.trim(),
        photos
      });
      form.hidden = true;
      successMessage.textContent = `งาน ${result.jobNumber} ถูกบันทึกพร้อมรูปภาพแล้ว`;
      successPanel.hidden = false;
    } catch (error) {
      message.textContent = error.message || 'บันทึก Report ไม่สำเร็จ กรุณาลองใหม่';
      submitButton.disabled = false;
    }
  });

  window.addEventListener('pagehide', clearPreviews, { once: true });

  form.hidden = false;
  submitButton.disabled = true;
  try {
    const result = await request('tasks');
    if (!Array.isArray(result.tasks)) throw new Error('ข้อมูลรายการงานสำหรับ Report ไม่ถูกต้อง');
    eligibleTasks = result.tasks;
    taskSelect.replaceChildren(new Option('เลือกงานที่ติดตั้งเสร็จแล้ว', ''));
    eligibleTasks.forEach(task => {
      const option = new Option(
        `${task.taskId} • ${task.assetIdentifier || 'ไม่มี Serial Number'} • ${task.department || 'ไม่ระบุผู้แจ้ง'}`,
        task.id
      );
      taskSelect.add(option);
    });

    const requestedTaskId = new URLSearchParams(window.location.search).get('taskId') || '';
    if (requestedTaskId && eligibleTasks.some(task => String(task.id) === requestedTaskId)) {
      taskSelect.value = requestedTaskId;
    } else if (requestedTaskId) {
      taskDetails.textContent = 'งานนี้อาจยังไม่เสร็จ ไม่มีช่างรับงาน หรือมี Report แล้ว กรุณาเลือกงานอื่น';
      message.textContent = 'ไม่สามารถส่ง Report สำหรับงานที่เลือกได้';
    }
    taskSelect.disabled = eligibleTasks.length === 0;
    submitButton.disabled = eligibleTasks.length === 0;
    if (eligibleTasks.length === 0) {
      message.textContent = 'ไม่มีงานที่เสร็จแล้วและยังไม่มี Report';
    }
    updateTaskDetails(eligibleTasks);
  } catch (error) {
    taskSelect.replaceChildren(new Option('โหลดรายการงานไม่สำเร็จ', ''));
    taskSelect.disabled = true;
    message.textContent = error.message || 'โหลดรายการงานสำหรับ Report ไม่สำเร็จ';
  }
});
