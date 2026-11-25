/* =====================================================
   NEXORA — UI Interactions (Vanilla JS)
   ===================================================== */

document.addEventListener('DOMContentLoaded', function () {

  if (!AppAuth.requireProtectedPage()) return;

  // ผูกส่วนบัญชีผู้ใช้กับข้อมูลจาก session และปุ่มหน้าเว็บ
  const setupAccount = () => {
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
    const accountName = document.getElementById('accountName');
    const accountRole = document.getElementById('accountRole');
    const accountImage = document.getElementById('accountImage');
    const user = AppAuth.getCurrentUser();
    if (!user || !accountName || !accountRole || !accountImage) return;

    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'ผู้ใช้งาน';
    accountName.textContent = name;
    accountRole.textContent = roleLabels[user.role] || 'ดูโปรไฟล์';
    accountImage.src = user.avatar || 'https://i.pravatar.cc/64?img=12';
    accountImage.alt = `รูปโปรไฟล์ของ ${name}`;
  };

  document.documentElement.lang = 'th';
  if (!document.body.classList.contains('s-page') && !document.body.classList.contains('work-page')) {
    document.title = 'Rayong OA | ระบบจัดการงานและบริการ';
  }
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = 'Rayong OA and Service ระบบจัดการงานและบริการสำหรับองค์กร';

  const thaiTranslations = {
    'Get Started': 'เริ่มต้นใช้งาน', 'Home': 'หน้าแรก', 'About Us': 'เกี่ยวกับเรา',
    'About': 'เกี่ยวกับเรา', 'Services': 'บริการ', 'Portfolio': 'ผลงาน', 'Blog': 'บทความ',
    'Pricing': 'ราคา', 'Contact Us': 'ติดต่อเรา', 'Contact': 'ติดต่อเรา',
    'Learn more': 'เรียนรู้เพิ่มเติม', 'Start a Project': 'เริ่มโครงการ',
    'Explore Services': 'ดูบริการทั้งหมด', 'View all services': 'ดูบริการทั้งหมด',
    'More About Us': 'เกี่ยวกับเราเพิ่มเติม', 'Book a Call': 'นัดหมายการพูดคุย',
    'Send Message': 'ส่งข้อความ', 'Subscribe': 'สมัครรับข่าวสาร', 'Search': 'ค้นหา',
    'Product Strategy': 'กลยุทธ์ผลิตภัณฑ์', 'UI/UX Design': 'การออกแบบ UI/UX',
    'Web Development': 'การพัฒนาเว็บไซต์', 'Cloud & DevOps': 'คลาวด์และ DevOps',
    'Growth Marketing': 'การตลาดเพื่อการเติบโต', 'Design': 'ออกแบบ', 'Development': 'การพัฒนา',
    'Engineering': 'วิศวกรรม', 'Branding': 'การสร้างแบรนด์', 'Strategy': 'กลยุทธ์',
    'Growth': 'การเติบโต', 'Company': 'บริษัท', 'Careers': 'ร่วมงานกับเรา',
    'Trusted by 480+ growing companies': 'ได้รับความไว้วางใจจากบริษัทที่กำลังเติบโตกว่า 480 แห่ง',
    'What we do': 'สิ่งที่เราทำ', 'Why Nexora': 'ทำไมต้อง Nexora', 'How we work': 'วิธีการทำงานของเรา',
    'Our Services': 'บริการของเรา', 'Our Portfolio': 'ผลงานของเรา', 'Our story': 'เรื่องราวของเรา',
    'Leadership': 'ทีมผู้นำ', 'Client feedback': 'เสียงจากลูกค้า', 'Selected work': 'ผลงานที่คัดสรร',
    'View full portfolio': 'ดูผลงานทั้งหมด', 'Client Success Lead': 'หัวหน้าฝ่ายดูแลความสำเร็จลูกค้า',
    'Head of Design': 'หัวหน้าฝ่ายออกแบบ', 'Head of Engineering': 'หัวหน้าฝ่ายวิศวกรรม',
    'Get In Touch': 'ติดต่อเรา', 'Send a message': 'ส่งข้อความ', 'Tell us about your project': 'เล่าเกี่ยวกับโครงการของคุณ',
    'Full Name': 'ชื่อ-นามสกุล', 'Work Email': 'อีเมลสำหรับทำงาน', 'Estimated Budget': 'งบประมาณโดยประมาณ',
    'Select a range': 'เลือกช่วงงบประมาณ', 'Service Needed': 'บริการที่ต้องการ', 'Select a service': 'เลือกบริการ',
    'Something else': 'อื่น ๆ', 'Project Details': 'รายละเอียดโครงการ', 'Office Hours': 'เวลาทำการ',
    'Categories': 'หมวดหมู่', 'Popular Tags': 'แท็กยอดนิยม', 'Subscribe to our newsletter': 'สมัครรับจดหมายข่าว',
    'Stay in the loop': 'ติดตามข่าวสาร', 'Privacy Policy': 'นโยบายความเป็นส่วนตัว',
    'Terms of Service': 'ข้อกำหนดการให้บริการ', 'Previous': 'ก่อนหน้า', 'Next': 'ถัดไป',
    'Most Popular': 'ยอดนิยม', 'Monthly': 'รายเดือน', 'Yearly': 'รายปี', 'Save 15%': 'ประหยัด 15%',
    'Starter': 'เริ่มต้น', 'Enterprise': 'องค์กร', 'Compare plans': 'เปรียบเทียบแพ็กเกจ',
    'Feature': 'คุณสมบัติ', 'Frequently asked questions': 'คำถามที่พบบ่อย', 'Pricing FAQs': 'คำถามที่พบบ่อยเรื่องราคา',
    'The challenge': 'โจทย์ที่พบ', 'Our approach': 'แนวทางของเรา', 'The result': 'ผลลัพธ์',
    'Results at a glance': 'ผลลัพธ์โดยสรุป', 'Tech & Tools': 'เทคโนโลยีและเครื่องมือ',
    'Live': 'กำลังทำงาน', 'Conversions': 'อัตราเปลี่ยนเป็นลูกค้า', 'Active Users': 'ผู้ใช้งานที่ใช้งานอยู่',
    'Project Delivered': 'ส่งมอบโครงการแล้ว', 'On time, every time': 'ตรงเวลาทุกครั้ง',
    'Search articles...': 'ค้นหาบทความ...', 'Your email': 'อีเมลของคุณ', 'Sending...': 'กำลังส่ง...',
    'Message sent ✓': 'ส่งข้อความแล้ว ✓', 'Toggle navigation': 'เปิดหรือปิดเมนูนำทาง', 'Back to top': 'กลับไปด้านบน',
    'Company News': 'ข่าวบริษัท', 'min read': 'นาทีในการอ่าน', 'min': 'นาที'
  };

  const translationKeys = Object.keys(thaiTranslations).sort((a, b) => b.length - a.length);
  const translate = value => translationKeys.reduce((text, key) => text.split(key).join(thaiTranslations[key]), value);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(node => { node.nodeValue = translate(node.nodeValue); });
  document.querySelectorAll('[placeholder], [aria-label], [alt], [title]').forEach(element => {
    ['placeholder', 'aria-label', 'alt', 'title'].forEach(attribute => {
      if (element.hasAttribute(attribute)) element.setAttribute(attribute, translate(element.getAttribute(attribute)));
    });
  });

  /* แถบนำทางติดด้านบนเมื่อเลื่อนหน้า */
  const navbar = document.querySelector('.i-top');
  const handleScroll = () => {
    if (window.scrollY > 40) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll);
  handleScroll();

  /* เปิดและปิดเมนูบนหน้าจอมือถือ */
  const toggler = document.querySelector('.i-menu');
  const navCollapse = document.getElementById('mainNav');

  if (toggler && navCollapse) {
    navCollapse.addEventListener('show.bs.collapse', () => toggler.classList.add('active'));
    navCollapse.addEventListener('hide.bs.collapse', () => toggler.classList.remove('active'));

    // ปิดเมนูหลังจากเลือกเมนูบนมือถือ
    navCollapse.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (navCollapse.classList.contains('show')) {
          bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
        }
      });
    });
  }

  /* เลื่อนหน้าแบบนุ่มนวลเมื่อกดลิงก์ภายในหน้า */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId.length > 1) {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const offset = 90;
          const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });

  /* แสดงเนื้อหาเมื่อเลื่อนมาถึงส่วนที่กำหนด */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 0.08}s`;
      observer.observe(el);
    });
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ปุ่มเลื่อนกลับไปด้านบน */
  const backToTop = document.querySelector('.top-button');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('show', window.scrollY > 400);
    });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ตรวจสอบข้อมูลในฟอร์ม */
  document.querySelectorAll('.needs-validation').forEach(form => {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
          const original = btn.innerHTML;
          btn.innerHTML = 'กำลังส่ง...';
          btn.disabled = true;
          setTimeout(() => {
            btn.innerHTML = 'ส่งข้อความแล้ว ✓';
            setTimeout(() => {
              btn.innerHTML = original;
              btn.disabled = false;
              form.reset();
              form.classList.remove('was-validated');
            }, 2200);
          }, 1000);
        }
      }
      form.classList.add('was-validated');
    }, false);
  });

  /* ทำเครื่องหมายเมนูของหน้าปัจจุบัน */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.i-top .nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });

  /* จัดการข้อมูลงานผ่าน TaskStore */
  let tasksCache = [];
  // คืนรายการงานที่เก็บไว้ใน cache ของหน้า
  const getTasks = () => tasksCache;
  // โหลดงานใหม่จาก API แล้วแทนที่ค่า cache
  const refreshTasks = async () => {
    tasksCache = await TaskStore.getAll();
    return tasksCache;
  };

  // แสดงข้อผิดพลาดในตารางหรือกล่องข้อความของหน้า
  const showTaskError = error => {
    const taskList = document.getElementById('taskList');
    if (taskList) {
      taskList.innerHTML = `<tr><td colspan="11" class="text-danger">${escapeText(error.message || 'โหลดรายการงานไม่สำเร็จ')}</td></tr>`;
    } else {
      AppDialogs.alert(error.message || 'ดำเนินการกับรายการงานไม่สำเร็จ', {
        title: 'ดำเนินการไม่สำเร็จ',
        tone: 'danger'
      });
    }
  };

  // เข้ารหัสอักขระพิเศษก่อนใส่ข้อความลง HTML
  const escapeText = value => String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));

  const statusNames = {
    waiting: 'รอดำเนินการ',
    progress: 'กำลังดำเนินการ',
    done: 'เสร็จแล้ว'
  };

  const statusOrder = ['waiting', 'progress', 'done'];
  // สร้างตัวเลือกสถานะโดยจำกัดไม่ให้ย้อนสถานะ
  const statusOptions = currentStatus => Object.entries(statusNames)
    .filter(([value]) => statusOrder.indexOf(value) >= statusOrder.indexOf(currentStatus))
    .map(([value, label]) => `<option value="${value}" ${value === currentStatus ? 'selected' : ''}>${label}</option>`)
    .join('');

  // แปลงเวลาของการแจ้งเตือนให้อ่านง่ายตาม locale ไทย
  const notificationDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
  };

  let loadingNotifications = false;
  // โหลดการแจ้งเตือนจากงานและประกาศเว็บไซต์
  const loadNotifications = async () => {
    const list = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');
    if (!list || loadingNotifications) return;

    loadingNotifications = true;
    try {
      const [result, siteUpdateResult] = await Promise.all([
        TaskStore.getNotifications(),
        SiteUpdates.getAll()
      ]);
      if (badge) {
        const unreadCount = result.unreadCount + siteUpdateResult.unreadCount;
        badge.hidden = unreadCount === 0;
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
      }
      list.replaceChildren();
      const notifications = [
        ...result.notifications.map(notification => ({ ...notification, source: 'task' })),
        ...siteUpdateResult.updates.map(update => ({
          id: update.id,
          source: 'site-update',
          title: update.title,
          message: update.summary,
          changes: update.changes,
          isRead: update.isRead,
          createdAt: update.createdAt
        }))
      ].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
      if (notifications.length === 0) {
        const empty = document.createElement('p');
        empty.className = 's-notify-empty';
        empty.textContent = 'ยังไม่มีการแจ้งเตือน';
        list.append(empty);
        return;
      }

      notifications.forEach(notification => {
        const item = document.createElement('button');
        item.className = 's-notify-item';
        item.type = 'button';
        item.classList.toggle('unread', !notification.isRead);
        if (notification.source === 'site-update') {
          item.dataset.siteUpdateId = notification.id;
        } else {
          item.dataset.notificationId = notification.id;
        }
        const title = document.createElement('strong');
        title.textContent = notification.title;
        const message = document.createElement('span');
        message.textContent = notification.message;
        const createdAt = document.createElement('small');
        createdAt.textContent = notificationDate(notification.createdAt);
        item.append(title, message, createdAt);
        if (notification.source === 'site-update' && notification.changes.length > 0) {
          const actionLabels = { added: 'เพิ่ม', updated: 'ปรับปรุง', removed: 'นำออก' };
          const changes = document.createElement('span');
          changes.className = 's-notify-changes';
          changes.textContent = `ส่วนที่เปลี่ยน: ${notification.changes.map(change => {
            const action = actionLabels[change.action] || 'เปลี่ยนแปลง';
            const count = Number(change.count) > 1 ? ` ${change.count} ไฟล์` : '';
            return `${action} ${change.area}${count}`;
          }).join(' · ')}`;
          item.insertBefore(changes, createdAt);
        }
        list.append(item);
      });
    } catch (error) {
      const message = document.createElement('p');
      message.className = 's-notify-error';
      message.textContent = error.message || 'โหลดการแจ้งเตือนไม่สำเร็จ';
      list.replaceChildren(message);
    } finally {
      loadingNotifications = false;
    }
  };

  // คืนวันที่ใช้อ้างอิงเมื่องานไม่มีวันที่แจ้ง ให้ใช้ createdAt แทน
  const getTaskDate = task => task.date ? new Date(`${task.date}T00:00:00`) : new Date(task.createdAt || Date.now());

  // คำนวณวันจันทร์ที่เป็นจุดเริ่มต้นของสัปดาห์
  const getWeekStart = date => {
    const start = new Date(date);
    const day = start.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysFromMonday);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // นับจำนวนงานในสัปดาห์นี้และสัปดาห์ก่อน ตามสถานะที่เลือก
  const getWeeklyCount = (tasks, filter) => {
    const thisWeek = getWeekStart(new Date());
    const lastWeek = new Date(thisWeek);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const nextWeek = new Date(thisWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const count = (start, end) => tasks.filter(task => {
      const date = getTaskDate(task);
      return date >= start && date < end && (!filter || task.status === filter);
    }).length;
    return { current: count(thisWeek, nextWeek), previous: count(lastWeek, thisWeek) };
  };

  // อัปเดตเปอร์เซ็นต์การเปลี่ยนแปลงรายสัปดาห์บนหน้าสรุป
  const updateWeeklyChanges = tasks => {
    const changes = [null, 'waiting', 'progress', 'done'].map(filter => getWeeklyCount(tasks, filter));
    document.querySelectorAll('.s-change').forEach((element, index) => {
      const { current, previous } = changes[index];
      const percent = previous === 0 ? (current === 0 ? 0 : 100) : Math.round(((current - previous) / previous) * 100);
      element.textContent = `${percent > 0 ? '+' : ''}${percent}%`;
      element.classList.toggle('s-positive', percent >= 0);
      element.classList.toggle('s-negative', percent < 0);
    });
  };

  // สรุปจำนวนงานตามสถานะ แผนก และช่างผู้รับผิดชอบ
  const updateReport = tasks => {
    const countBy = key => Object.entries(tasks.reduce((result, task) => {
      const value = task[key] || 'ไม่ระบุ';
      result[value] = (result[value] || 0) + 1;
      return result;
    }, {})).sort((a, b) => b[1] - a[1]);
    const statusText = Object.entries(statusNames).map(([key, label]) => `${label} ${tasks.filter(task => task.status === key).length}`).join(' / ');
    const topDepartment = countBy('department')[0];
    const topTechnician = countBy('technician')[0];
    const reportValues = {
      reportStatus: statusText || 'ยังไม่มีข้อมูล',
      reportDepartment: topDepartment ? `${topDepartment[0]} (${topDepartment[1]} งาน)` : 'ยังไม่มีข้อมูล',
      reportTechnician: topTechnician ? `${topTechnician[0]} (${topTechnician[1]} งาน)` : 'ยังไม่มีข้อมูล'
    };
    Object.entries(reportValues).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  };

  let taskFilter = 'all';
  let taskSearchQuery = '';
  let sortOrder = 'newest';
  let taskPage = 1;
  const tasksPerPage = 10;
  let techniciansCache;
  let assistantsCache;
  let requestersCache;
  const selectedTaskIds = new Set();

  // โหลดและ cache รายชื่อช่างผู้รับผิดชอบ
  const getTechnicians = async () => {
    if (!techniciansCache) techniciansCache = await TaskStore.getTechnicians();
    return techniciansCache;
  };

  // โหลดและ cache รายชื่อช่างผู้ช่วย
  const getAssistants = async () => {
    if (!assistantsCache) assistantsCache = await TaskStore.getAssistants();
    return assistantsCache;
  };

  // รายชื่อผู้แจ้ง — ดึงจากบัญชีผู้ใช้เพื่อแสดงตามข้อมูลโปรไฟล์
  const getRequesters = async () => {
    if (!requestersCache) requestersCache = await TaskStore.getRequesters();
    return requestersCache;
  };

  // ผูกการเลือกงานหลายรายการ การแก้ไขแบบกลุ่ม และการลบ
  const setupBulkEdit = () => {
    const dialog = document.getElementById('bulkEditDialog');
    const form = document.getElementById('bulkEditForm');
    const rows = document.getElementById('bulkEditRows');
    const errorMessage = document.getElementById('bulkEditError');
    const selectionActions = document.getElementById('selectionActions');
    const openButton = document.getElementById('openBulkEdit');
    const deleteButton = document.getElementById('deleteSelectedTasks');
    const clearButton = document.getElementById('clearTaskSelection');
    const cancelButton = document.getElementById('cancelBulkEdit');
    const closeButton = document.getElementById('closeBulkEdit');
    const taskList = document.getElementById('taskList');
    if (!dialog || !form || !rows || !errorMessage || !selectionActions || !openButton
      || !deleteButton || !clearButton || !cancelButton || !closeButton || !taskList) return;

    // เพิ่ม/เอา ID งานออกจากชุดรายการที่เลือก
    const toggleTaskSelection = id => {
      if (selectedTaskIds.has(id)) {
        selectedTaskIds.delete(id);
      } else if (selectedTaskIds.size >= 100) {
        AppDialogs.alert('เลือกจัดการได้ครั้งละไม่เกิน 100 งาน', {
          title: 'เลือกงานครบจำนวนสูงสุดแล้ว',
          tone: 'warning'
        });
        return;
      } else {
        selectedTaskIds.add(id);
      }
      showTasks();
    };

    taskList.addEventListener('click', event => {
      const target = event.target;
      const selectionButton = target.closest('[data-select-task]');
      const row = target.closest('[data-task-row]');
      if (!row) return;
      if (!selectionButton && target.closest('button, input, select, textarea, a')) return;
      toggleTaskSelection(row.dataset.taskRow);
    });
    taskList.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key) || event.target !== event.currentTarget
        && !event.target.matches('[data-task-row]')) return;
      const row = event.target.closest('[data-task-row]');
      if (!row) return;
      event.preventDefault();
      toggleTaskSelection(row.dataset.taskRow);
    });

    // ปิดหน้าต่างแก้ไขกลุ่ม ล้างสถานะ และวาดรายการใหม่
    const closeDialog = () => {
      dialog.hidden = true;
      rows.replaceChildren();
      errorMessage.textContent = '';
      form.querySelector('[type="submit"]').disabled = false;
      showTasks();
    };

    // สร้างตัวเลือกช่างและรักษาชื่อเดิมที่ไม่มีบัญชีแล้ว
    const assignmentOptions = (users, currentName) => {
      const selected = users.find(user => user.name === currentName);
      const options = ['<option value="">ไม่ระบุ</option>'];
      if (currentName && !selected) {
        options.push(`<option value="legacy" selected>${escapeText(currentName)} (เดิม)</option>`);
      }
      options.push(...users.map(user => {
        const roleLabel = user.role === 'head_technician'
          ? ' (หัวหน้าช่าง)'
          : user.role === 'intern' ? ' (นักศึกษาฝึกงาน)' : '';
        return `<option value="${escapeText(user.id)}" ${selected?.id === user.id ? 'selected' : ''}>${escapeText(user.name)}${roleLabel}</option>`;
      }));
      return options.join('');
    };

    // สร้างตัวเลือกผู้แจ้งงานพร้อมรองรับข้อมูลเดิม
    const requesterOptions = (users, currentName) => {
      const options = ['<option value="">เลือกผู้ที่แจ้ง</option>'];
      const currentUser = users.find(user => user.name === currentName);
      if (currentName && !currentUser) {
        options.push(`<option value="${escapeText(currentName)}" selected>${escapeText(currentName)} (เดิม)</option>`);
      }
      options.push(...users.map(user =>
        `<option value="${escapeText(user.id)}" ${user.name === currentName ? 'selected' : ''}>${escapeText(user.name)}</option>`
      ));
      return options.join('');
    };

    // โหลดข้อมูลประกอบและแสดงงานที่เลือกในหน้าต่างแก้ไขกลุ่ม
    const openDialog = async () => {
      if (!selectedTaskIds.size) return;

      openButton.disabled = true;
      errorMessage.textContent = '';
      try {
        const [technicians, assistants, requesters] = await Promise.all([
          getTechnicians(),
          getAssistants(),
          getRequesters()
        ]);
        const selectedTasks = tasksCache.filter(task => selectedTaskIds.has(String(task.id)));
        if (selectedTasks.length !== selectedTaskIds.size) {
          throw new Error('โหลดข้อมูลงานที่เลือกไม่ครบ กรุณาลองใหม่');
        }
        rows.innerHTML = selectedTasks.map(task => {
          const currentDepartment = String(task.department || '');
          return `
            <tr data-bulk-task-id="${escapeText(task.id)}"
                data-current-technician="${escapeText(task.technician || '')}"
                data-current-assistant="${escapeText(task.installationAssistant || '')}"
                data-current-priority="${escapeText(task.priority || 'medium')}">
              <td>${escapeText(task.taskId || task.id)}</td>
              <td><input data-bulk-field="taskId" value="${escapeText(task.taskId || '')}" maxlength="100" required aria-label="เลขที่งาน ${escapeText(task.taskId || task.id)}"></td>
              <td><select data-bulk-field="department" required aria-label="ผู้ที่แจ้งงาน ${escapeText(task.taskId || task.id)}">
                ${requesterOptions(requesters, currentDepartment)}
              </select></td>
              <td><textarea data-bulk-field="detail" maxlength="65535" required aria-label="รายละเอียดงาน ${escapeText(task.taskId || task.id)}">${escapeText(task.detail || '')}</textarea></td>
              <td><input data-bulk-field="assetIdentifier" value="${escapeText(task.assetIdentifier || '')}" maxlength="255" aria-label="Serial Number ${escapeText(task.taskId || task.id)}"></td>
              <td><input data-bulk-field="date" type="date" value="${escapeText(task.date || '')}" required aria-label="วันที่แจ้งงาน ${escapeText(task.taskId || task.id)}"></td>
              <td><input data-bulk-field="dueAt" type="date" min="${escapeText(task.date || '')}" value="${escapeText(task.dueAt || '')}" aria-label="วันที่จัดส่งงาน ${escapeText(task.taskId || task.id)}"></td>
              <td><select data-bulk-field="technicianId" aria-label="ช่างผู้รับผิดชอบ ${escapeText(task.taskId || task.id)}">
                ${assignmentOptions(technicians, task.technician || '')}
              </select></td>
              <td><select data-bulk-field="assistantId" aria-label="ช่างช่วยเหลือ ${escapeText(task.taskId || task.id)}">
                ${assignmentOptions(assistants, task.installationAssistant || '')}
              </select></td>
              <td><select data-bulk-field="status" ${TaskStore.hasPermission('tasks.change_status') ? '' : 'disabled'} aria-label="สถานะงาน ${escapeText(task.taskId || task.id)}">
                ${statusOptions(task.status || 'waiting')}
              </select></td>
            </tr>
          `;
        }).join('');
        rows.querySelectorAll('[data-bulk-field="date"]').forEach(openedAtInput => {
          openedAtInput.addEventListener('change', () => {
            const dueAtInput = openedAtInput.closest('tr').querySelector('[data-bulk-field="dueAt"]');
            dueAtInput.min = openedAtInput.value;
          });
        });
        document.getElementById('bulkEditDescription').textContent =
          `เลือกไว้ ${selectedTasks.length} งาน แก้แต่ละแถวได้ แล้วบันทึกทั้งหมดพร้อมกัน`;
        dialog.hidden = false;
        rows.querySelector('[data-bulk-field="taskId"]')?.focus();
      } catch (error) {
        errorMessage.textContent = error.message || 'เปิดรายการแก้ไขไม่สำเร็จ';
        dialog.hidden = false;
      } finally {
        openButton.disabled = selectedTaskIds.size === 0;
      }
    };

    openButton.addEventListener('click', openDialog);
    deleteButton.addEventListener('click', async () => {
      const ids = [...selectedTaskIds];
      if (!ids.length) return;
      if (!await AppDialogs.confirm(`ยืนยันย้ายงานที่เลือก ${ids.length} รายการไปถังขยะหรือไม่? กู้คืนได้ภายใน 30 วัน`, {
        title: 'ย้ายงานไปถังขยะ',
        confirmText: `ย้าย ${ids.length} งาน`,
        tone: 'danger'
      })) return;

      deleteButton.disabled = true;
      try {
        await TaskStore.bulkDelete(ids);
        selectedTaskIds.clear();
        await showTasks();
        await loadNotifications();
      } catch (error) {
        await AppDialogs.alert(error.message || 'ลบงานที่เลือกไม่สำเร็จ', {
          title: 'ลบงานไม่สำเร็จ',
          tone: 'danger'
        });
      } finally {
        deleteButton.disabled = false;
      }
    });
    clearButton.addEventListener('click', () => {
      selectedTaskIds.clear();
      showTasks();
    });
    cancelButton.addEventListener('click', closeDialog);
    closeButton.addEventListener('click', closeDialog);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !dialog.hidden) closeDialog();
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      errorMessage.textContent = '';
      if (!form.reportValidity()) return;
      const updates = [...rows.querySelectorAll('[data-bulk-task-id]')].map(row => {
        const value = field => row.querySelector(`[data-bulk-field="${field}"]`).value;
        const requesterSelect = row.querySelector('[data-bulk-field="department"]');
        const requesterOption = requesterSelect?.options[requesterSelect.selectedIndex];
        const technicianId = value('technicianId');
        const assistantId = value('assistantId');
        return {
          id: row.dataset.bulkTaskId,
          taskId: value('taskId'),
          requesterUserId: value('department'),
          department: requesterOption?.textContent.replace(/ \(เดิม\)$/u, '') || '',
          detail: value('detail'),
          assetIdentifier: value('assetIdentifier'),
          date: value('date'),
          dueAt: value('dueAt'),
          technicianId: technicianId === 'legacy' ? '' : technicianId,
          technician: technicianId === 'legacy' ? row.dataset.currentTechnician : '',
          installationAssistantId: assistantId === 'legacy' ? '' : assistantId,
          installationAssistant: assistantId === 'legacy' ? row.dataset.currentAssistant : '',
          status: value('status'),
          priority: row.dataset.currentPriority || 'medium'
        };
      });
      if (!await AppDialogs.confirm(`ยืนยันบันทึกการแก้ไข ${updates.length} งานพร้อมกันหรือไม่? หากมีข้อมูลผิด ระบบจะไม่บันทึกงานใดเลย`, {
        title: 'ยืนยันแก้ไขหลายงาน',
        confirmText: 'บันทึกทั้งหมด'
      })) return;

      const submitButton = form.querySelector('[type="submit"]');
      submitButton.disabled = true;
      try {
        await TaskStore.bulkUpdate(updates);
        selectedTaskIds.clear();
        dialog.hidden = true;
        rows.replaceChildren();
        await showTasks();
        await loadNotifications();
      } catch (error) {
        errorMessage.textContent = error.message || 'บันทึกงานไม่สำเร็จ กรุณาตรวจสอบข้อมูล';
      } finally {
        submitButton.disabled = false;
      }
    });
  };

  // ผูกตัวค้นหา ตัวเรียง การแจ้งเตือน และปุ่มส่งออกรายงาน
  const setupInstallControls = () => {
    const alertButton = document.getElementById('alertButton');
    const alertPanel = document.getElementById('alertPanel');
    const exportButton = document.getElementById('exportReport');
    const markAllButton = document.getElementById('markAllNotificationsRead');
    const searchForm = document.getElementById('taskSearchForm');
    const searchInput = document.getElementById('taskSearchInput');
    searchForm?.addEventListener('submit', event => {
      event.preventDefault();
      taskSearchQuery = searchInput.value.trim().toLocaleLowerCase();
      taskPage = 1;
      showTasks();
    });
    document.getElementById('sortFilter')?.addEventListener('change', event => {
      sortOrder = event.target.value;
      taskPage = 1;
      showTasks();
    });
    alertButton?.addEventListener('click', () => {
      if (alertPanel) {
        alertPanel.hidden = !alertPanel.hidden;
        if (!alertPanel.hidden) loadNotifications();
      }
    });
    markAllButton?.addEventListener('click', async () => {
      markAllButton.disabled = true;
      try {
        await Promise.all([
          TaskStore.markNotificationsRead(),
          SiteUpdates.markAllRead()
        ]);
        await loadNotifications();
      } catch (error) {
        showTaskError(error);
      } finally {
        markAllButton.disabled = false;
      }
    });
    document.getElementById('notificationList')?.addEventListener('click', async event => {
      const item = event.target.closest('[data-notification-id], [data-site-update-id]');
      if (!item || item.classList.contains('unread') === false) return;
      item.disabled = true;
      try {
        if (item.dataset.siteUpdateId) {
          await SiteUpdates.markRead(item.dataset.siteUpdateId);
        } else {
          await TaskStore.markNotificationsRead(item.dataset.notificationId);
        }
        await loadNotifications();
      } catch (error) {
        showTaskError(error);
        item.disabled = false;
      }
    });
    exportButton?.addEventListener('click', exportReport);

  };

  // สร้างไฟล์รายงานงานติดตั้งและเริ่มดาวน์โหลดให้ผู้ใช้
  const exportReport = async () => {
    let tasks;
    try {
      tasks = await refreshTasks();
    } catch (error) {
      showTaskError(error);
      return;
    }
    const headers = ['เลขที่งาน', 'Serial Number', 'ผู้ที่แจ้ง', 'รายละเอียดงาน', 'วันที่แจ้ง', 'วันที่จัดส่ง', 'ช่างที่รับผิดชอบ', 'ช่างที่ช่วยเหลือ', 'สถานะ'];
    const rows = tasks.map(task => [
      task.taskId || task.id,
      task.assetIdentifier || '',
      task.department,
      task.detail,
      task.date,
      task.dueAt || '',
      task.technician || '',
      task.installationAssistant || '',
      statusNames[task.status] || ''
    ]);
    const reportHtml = `<!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Tahoma, Arial, sans-serif; color: #243247; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d5deeb; padding: 8px; vertical-align: top; mso-number-format: "\\@"; }
          .report-title { color: #ffffff; background: #174ea6; font-size: 16pt; font-weight: bold; text-align: left; }
          .report-meta { color: #52647a; background: #eef4fc; font-size: 10pt; }
          .column-header th { color: #ffffff; background: #2866b2; font-weight: bold; text-align: center; }
          .column-0 { width: 110px; white-space: nowrap; }
          .column-1 { width: 130px; }
          .column-2 { width: 150px; }
          .column-3 { width: 320px; white-space: normal; }
          .column-4, .column-5 { width: 110px; text-align: center; }
          .column-6, .column-7 { width: 160px; }
          .column-8 { width: 120px; text-align: center; }
          .data-row:nth-child(even) td { background: #f3f7fc; }
          .empty-report { color: #667085; font-style: italic; }
        </style>
      </head>
      <body>
        <table>
          <tr><th class="report-title" colspan="${headers.length}">รายงานสรุปงานติดตั้ง</th></tr>
          <tr><td class="report-meta" colspan="${headers.length}">ส่งออกเมื่อ ${escapeText(new Date().toLocaleString('th-TH'))} • ทั้งหมด ${tasks.length} งาน</td></tr>
          <tr class="column-header">${headers.map((header, index) => `<th class="column-${index}">${escapeText(header)}</th>`).join('')}</tr>
          ${rows.length
            ? rows.map((row, rowIndex) => `<tr class="data-row">${row.map((value, index) => `<td class="column-${index}" style="background-color: ${rowIndex % 2 ? '#f3f7fc' : '#ffffff'};">${escapeText(value ?? '')}</td>`).join('')}</tr>`).join('')
            : `<tr><td class="empty-report" colspan="${headers.length}">ยังไม่มีข้อมูลงาน</td></tr>`}
        </table>
      </body>
      </html>`;
    const blob = new Blob([`\uFEFF${reportHtml}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const reportUrl = URL.createObjectURL(blob);
    link.href = reportUrl;
    link.download = `install-report-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(reportUrl), 1000);
  };

  // สลับการแสดงผลระหว่างรายการงานและถังขยะ
  const setTaskView = showTrash => {
    const activeView = document.getElementById('activeTasksView');
    const trashView = document.getElementById('trashView');
    const searchForm = document.getElementById('taskSearchForm');
    const trashLink = document.getElementById('trashLink');
    if (activeView) activeView.hidden = showTrash;
    if (trashView) trashView.hidden = !showTrash;
    if (searchForm) searchForm.hidden = showTrash;
    if (trashLink) trashLink.classList.toggle('active', showTrash);
    document.querySelectorAll('[data-task-filter]').forEach(link => {
      link.classList.toggle('active', !showTrash && link.dataset.taskFilter === taskFilter);
    });
  };

  // จัดรูปแบบวันเวลาของงานที่อยู่ในถังขยะ
  const formatTrashDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '-'
      : date.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
  };

  // โหลดและแสดงงานในถังขยะพร้อมวันหมดอายุและปุ่มกู้คืน
  const loadTrash = async () => {
    const list = document.getElementById('trashTaskList');
    const summary = document.getElementById('trashSummary');
    const count = document.getElementById('trashCount');
    if (!list) return;

    try {
      const tasks = await TaskStore.getTrash();
      list.innerHTML = tasks.length
        ? tasks.map(task => `
            <tr>
              <td>${escapeText(task.taskId || task.id)}</td>
              <td>${escapeText(task.department || '-')}</td>
              <td>${escapeText(task.detail || '-')}</td>
              <td>${escapeText(formatTrashDate(task.deletedAt))}</td>
              <td>${escapeText(formatTrashDate(task.expiresAt))}</td>
              <td><button class="s-restore" type="button" data-restore-task="${escapeText(task.id)}"><i class="bi bi-arrow-counterclockwise"></i> กู้คืน</button></td>
            </tr>
          `).join('')
        : '<tr><td colspan="6" class="s-trash-empty">ไม่มีงานในถังขยะ</td></tr>';
      if (summary) summary.textContent = `มีงานในถังขยะ ${tasks.length} รายการ • ลบถาวรอัตโนมัติเมื่อครบ 30 วัน`;
      if (count) {
        count.textContent = String(tasks.length);
        count.hidden = tasks.length === 0;
      }
    } catch (error) {
      list.innerHTML = `<tr><td colspan="6" class="text-danger">${escapeText(error.message || 'โหลดถังขยะไม่สำเร็จ')}</td></tr>`;
      if (summary) summary.textContent = error.message || 'โหลดถังขยะไม่สำเร็จ';
    }
  };

  // ผูกลิงก์เปิดถังขยะ ปุ่มย้อนกลับ และปุ่มกู้คืนงาน
  const setupTrashView = () => {
    const trashLink = document.getElementById('trashLink');
    const backButton = document.getElementById('backToTasks');
    const trashList = document.getElementById('trashTaskList');
    if (!trashLink || !backButton || !trashList) return;

    trashLink.addEventListener('click', event => {
      event.preventDefault();
      selectedTaskIds.clear();
      history.replaceState(null, '', 'services.html#trash');
      setTaskView(true);
      loadTrash();
    });
    backButton.addEventListener('click', () => {
      history.replaceState(null, '', `services.html${taskFilter === 'all' ? '' : `#${taskFilter === 'waiting' ? 'today' : taskFilter === 'progress' ? 'in-progress' : 'done'}`}`);
      setTaskView(false);
      showTasks();
    });
    trashList.addEventListener('click', async event => {
      const button = event.target.closest('[data-restore-task]');
      if (!button) return;
      button.disabled = true;
      try {
        await TaskStore.restore(button.dataset.restoreTask);
        await Promise.all([loadTrash(), showTasks(), loadNotifications()]);
      } catch (error) {
        await AppDialogs.alert(error.message || 'กู้คืนงานไม่สำเร็จ', {
          title: 'กู้คืนงานไม่สำเร็จ',
          tone: 'danger'
        });
        button.disabled = false;
      }
    });
    if (window.location.hash === '#trash') {
      setTaskView(true);
      loadTrash();
    }
  };

  // ผูกตัวกรองตามสถานะและอ่านค่า filter จาก URL fragment
  const setupTaskMenu = () => {
    const menuLinks = document.querySelectorAll('[data-task-filter]');
    if (!menuLinks.length) return;

    const hashFilters = {
      '#today': 'waiting',
      '#in-progress': 'progress',
      '#done': 'done'
    };
    taskFilter = hashFilters[window.location.hash] || 'all';
    if (window.location.hash === '#trash') setTaskView(true);

    menuLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.taskFilter === taskFilter);
      link.addEventListener('click', event => {
        event.preventDefault();
        taskFilter = link.dataset.taskFilter;
        taskPage = 1;
        const hash = taskFilter === 'all' ? '' : `#${taskFilter === 'waiting' ? 'today' : taskFilter === 'progress' ? 'in-progress' : 'done'}`;
        history.replaceState(null, '', `services.html${hash}`);
        setTaskView(false);
        showTasks();
      });
    });
  };

  // โหลด กรอง และวาดรายการงาน สถิติ และตัวควบคุมในตาราง
  const showTasks = async () => {
    const taskList = document.getElementById('taskList');
    if (!taskList) return;

    let tasks;
    let technicians;
    let assistants;
    try {
      [tasks, technicians, assistants] = await Promise.all([refreshTasks(), getTechnicians(), getAssistants()]);
    } catch (error) {
      showTaskError(error);
      return;
    }
    const existingTaskIds = new Set(tasks.map(task => String(task.id)));
    const trashLink = document.getElementById('trashLink');
    if (trashLink) trashLink.hidden = !TaskStore.hasPermission('tasks.delete');
    selectedTaskIds.forEach(id => {
      if (!existingTaskIds.has(id)) selectedTaskIds.delete(id);
    });
    let visibleTasks = taskFilter === 'all' ? [...tasks] : tasks.filter(task => task.status === taskFilter);
    if (taskSearchQuery) {
      visibleTasks = visibleTasks.filter(task => [
        task.taskId,
        task.department,
        task.detail,
        task.assetIdentifier,
        task.technician,
        task.installationAssistant
      ].some(value => String(value || '').toLocaleLowerCase().includes(taskSearchQuery)));
    }
    const addTaskButton = document.querySelector('.s-tools .s-add');
    if (addTaskButton) addTaskButton.hidden = !TaskStore.hasPermission('tasks.create');
    if (sortOrder === 'week' || sortOrder === 'month') {
      const days = sortOrder === 'week' ? 7 : 30;
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - days);
      visibleTasks = visibleTasks.filter(task => getTaskDate(task) >= startDate);
    }

    visibleTasks.sort((first, second) => {
      if (sortOrder === 'all') return 0;
      const firstDate = getTaskDate(first).getTime();
      const secondDate = getTaskDate(second).getTime();
      return secondDate - firstDate;
    });
    const filteredTaskCount = visibleTasks.length;
    const pageCount = Math.max(1, Math.ceil(filteredTaskCount / tasksPerPage));
    taskPage = Math.min(taskPage, pageCount);
    const pageTasks = visibleTasks.slice((taskPage - 1) * tasksPerPage, taskPage * tasksPerPage);
    taskList.innerHTML = pageTasks.map(task => {
      const technicianAssigned = Boolean(String(task.technician || '').trim());
      const canChangeStatus = technicianAssigned && TaskStore.hasPermission('tasks.change_status');
      const isSelected = selectedTaskIds.has(String(task.id));
      return `
      <tr data-task-row="${escapeText(task.id)}" class="${isSelected ? 'is-selected' : ''}" tabindex="0" aria-selected="${isSelected}" aria-label="เลือกงาน ${escapeText(task.taskId || task.id)}">
        <td>${TaskStore.hasPermission('tasks.edit') || TaskStore.hasPermission('tasks.delete')
          ? `<button class="task-select-button" type="button" data-select-task="${escapeText(task.id)}" aria-label="${isSelected ? 'ยกเลิกเลือก' : 'เลือก'}งาน ${escapeText(task.taskId || task.id)}" aria-pressed="${isSelected}"><i class="bi ${isSelected ? 'bi-check2-circle' : 'bi-circle'}" aria-hidden="true"></i></button>`
          : ''}</td>
        <td>${escapeText(task.taskId || task.id)}</td>
        <td>${escapeText(task.department)}</td>
        <td>${escapeText(task.detail)}</td>
        <td>${escapeText(task.assetIdentifier || '-')}</td>
        <td>${escapeText(task.date)}</td>
        <td>${escapeText(task.dueAt || '-')}</td>
        <td>
          ${TaskStore.hasPermission('tasks.edit')
            ? `<select class="technician-select" data-technician-id="${escapeText(task.id)}" aria-label="เลือกช่างที่รับผิดชอบสำหรับงาน ${escapeText(task.taskId || task.id)}">
                <option value="">ยังไม่มอบหมาย</option>
                ${task.technician && !technicians.some(technician => technician.name === task.technician)
                  ? `<option value="legacy" selected>${escapeText(task.technician)} (เดิม)</option>`
                  : ''}
                ${technicians.map(technician => `<option value="${escapeText(technician.id)}" ${technician.name === task.technician ? 'selected' : ''}>${escapeText(technician.name)}${technician.role === 'head_technician' ? ' (หัวหน้าช่าง)' : ''}</option>`).join('')}
              </select>`
            : escapeText(task.technician || '-')}
        </td>
        <td>
          ${TaskStore.hasPermission('tasks.edit')
            ? `<select class="technician-select" data-assistant-id="${escapeText(task.id)}" aria-label="เลือกช่างที่ช่วยเหลือสำหรับงาน ${escapeText(task.taskId || task.id)}">
                <option value="">ไม่มีช่างช่วยเหลือ</option>
                ${task.installationAssistant && !assistants.some(assistant => assistant.name === task.installationAssistant)
                  ? `<option value="legacy" selected>${escapeText(task.installationAssistant)} (เดิม)</option>`
                  : ''}
                ${assistants.map(assistant => {
                  const roleLabel = assistant.role === 'head_technician'
                    ? ' (หัวหน้าช่าง)'
                    : assistant.role === 'intern' ? ' (นักศึกษาฝึกงาน)' : '';
                  return `<option value="${escapeText(assistant.id)}" ${assistant.name === task.installationAssistant ? 'selected' : ''}>${escapeText(assistant.name)}${roleLabel}</option>`;
                }).join('')}
              </select>`
            : escapeText(task.installationAssistant || '-')}
        </td>
        <td>
          <div class="status-control status-${escapeText(task.status || 'waiting')}">
            <span class="status-label" data-status-label translate="no">${escapeText(statusNames[task.status] || statusNames.waiting)}</span>
            <select class="status ${escapeText(task.status || 'waiting')}" data-status-id="${escapeText(task.id)}" aria-label="สถานะงาน ${escapeText(task.taskId || task.id)}" ${canChangeStatus ? '' : 'disabled'}>
              ${statusOptions(task.status)}
            </select>
          </div>
          ${technicianAssigned ? '' : '<small class="status-requirement">มอบหมายช่างก่อนเปลี่ยนสถานะ</small>'}
        </td>
        <td>${task.status === 'done'
          ? '<a class="s-report-link" href="https://forms.office.com/Pages/ResponsePage.aspx?id=2uUTEl7hvEuifzF4LivwD51sBwGMfQNOgirdMyiL2txUQ1FYSDBOSFA4VzY1SlU4TTM3TUhWQVZUTC4u&amp;origin=QRCode">Report <i class="bi bi-box-arrow-up-right"></i></a>'
          : '<span class="s-report-unavailable">-</span>'}</td>
      </tr>
    `;
    }).join('');
    const selectedTaskCount = document.getElementById('selectedTaskCount');
    if (selectedTaskCount) selectedTaskCount.textContent = String(selectedTaskIds.size);
    const selectionActions = document.getElementById('selectionActions');
    const openBulkEditButton = document.getElementById('openBulkEdit');
    const deleteSelectedButton = document.getElementById('deleteSelectedTasks');
    const canEditTasks = TaskStore.hasPermission('tasks.edit');
    const canDeleteTasks = TaskStore.hasPermission('tasks.delete');
    if (selectionActions) selectionActions.hidden = selectedTaskIds.size === 0 || (!canEditTasks && !canDeleteTasks);
    if (openBulkEditButton) openBulkEditButton.hidden = !canEditTasks;
    if (deleteSelectedButton) deleteSelectedButton.hidden = !canDeleteTasks;

    const total = tasks.length;
    const waiting = tasks.filter(task => task.status === 'waiting').length;
    const progress = tasks.filter(task => task.status === 'progress').length;
    const done = tasks.filter(task => task.status === 'done').length;
    const numbers = document.querySelectorAll('.s-stat strong');
    [total, waiting, progress, done].forEach((number, index) => {
      if (numbers[index]) numbers[index].textContent = number;
    });
    updateWeeklyChanges(tasks);
    updateReport(tasks);

    const counts = document.querySelectorAll('.s-menu .count');
    [total, waiting, progress, done].forEach((number, index) => {
      if (counts[index]) counts[index].textContent = number;
    });

    const summary = document.getElementById('taskSummary');
    if (summary) {
      const firstTask = filteredTaskCount ? (taskPage - 1) * tasksPerPage + 1 : 0;
      const lastTask = Math.min(taskPage * tasksPerPage, filteredTaskCount);
      summary.textContent = `แสดง ${firstTask}-${lastTask} จาก ${filteredTaskCount} รายการ`;
    }
    const pagination = document.getElementById('taskPagination');
    if (pagination) {
      pagination.hidden = pageCount <= 1;
      const firstPage = Math.max(1, Math.min(taskPage - 2, pageCount - 4));
      const lastPage = Math.min(pageCount, firstPage + 4);
      const pageButtons = [];
      pageButtons.push(`<button type="button" data-task-page="${taskPage - 1}" aria-label="หน้าก่อนหน้า" ${taskPage === 1 ? 'disabled' : ''}>‹</button>`);
      for (let page = firstPage; page <= lastPage; page++) {
        pageButtons.push(`<button type="button" data-task-page="${page}" ${page === taskPage ? 'class="active" aria-current="page"' : ''}>${page}</button>`);
      }
      pageButtons.push(`<button type="button" data-task-page="${taskPage + 1}" aria-label="หน้าถัดไป" ${taskPage === pageCount ? 'disabled' : ''}>›</button>`);
      pagination.innerHTML = pageButtons.join('');
      pagination.querySelectorAll('[data-task-page]').forEach(button => {
        button.addEventListener('click', () => {
          const requestedPage = Number(button.dataset.taskPage);
          if (requestedPage >= 1 && requestedPage <= pageCount && requestedPage !== taskPage) {
            taskPage = requestedPage;
            showTasks();
          }
        });
      });
    }
    const alertText = document.getElementById('alertText');
    if (alertText) alertText.textContent = waiting ? `มีงานรอดำเนินการ ${waiting} รายการ` : 'ยังไม่มีการแจ้งเตือนใหม่';

    taskList.querySelectorAll('[data-technician-id]').forEach(select => {
      select.addEventListener('change', async () => {
        const previousValue = technicians.find(technician => technician.name === select.dataset.currentTechnician)?.id
          || (select.dataset.currentTechnician ? 'legacy' : '');
        const selectedId = select.value;
        select.disabled = true;
        try {
          await TaskStore.assignTechnician(select.dataset.technicianId, selectedId === 'legacy' ? '' : selectedId);
          techniciansCache = null;
          await showTasks();
          await loadNotifications();
        } catch (error) {
          select.value = previousValue;
          select.disabled = false;
          const summary = document.getElementById('taskSummary');
          if (summary) summary.textContent = error.message || 'บันทึกช่างผู้รับผิดชอบไม่สำเร็จ';
        }
      });
      const task = tasks.find(item => String(item.id) === select.dataset.technicianId);
      select.dataset.currentTechnician = task?.technician || '';
    });

    taskList.querySelectorAll('[data-assistant-id]').forEach(select => {
      select.addEventListener('change', async () => {
        const task = tasks.find(item => String(item.id) === select.dataset.assistantId);
        const previousValue = assistants.find(assistant => assistant.name === task?.installationAssistant)?.id
          || (task?.installationAssistant ? 'legacy' : '');
        const selectedId = select.value;
        select.disabled = true;
        try {
          await TaskStore.assignAssistant(select.dataset.assistantId, selectedId === 'legacy' ? '' : selectedId);
          await showTasks();
          await loadNotifications();
        } catch (error) {
          select.value = previousValue;
          select.disabled = false;
          const summary = document.getElementById('taskSummary');
          if (summary) summary.textContent = error.message || 'บันทึกช่างที่ช่วยเหลือไม่สำเร็จ';
        }
      });
    });

    taskList.querySelectorAll('[data-status-id]').forEach(select => {
      const task = tasks.find(item => String(item.id) === select.dataset.statusId);
      select.value = task?.status || 'waiting';
      select.addEventListener('change', () => {
        const control = select.closest('.status-control');
        const label = control?.querySelector('[data-status-label]');
        const selectedStatus = statusNames[select.value] ? select.value : 'waiting';
        if (label) label.textContent = statusNames[selectedStatus];
        if (control) {
          control.classList.remove('status-waiting', 'status-progress', 'status-done');
          control.classList.add(`status-${selectedStatus}`);
        }
        const dialog = document.getElementById('statusDialog');
        const form = document.getElementById('statusForm');
        if (!dialog || !form) return;

        dialog.hidden = false;
        form.querySelector('[type="submit"]')?.focus();
        form.dataset.taskId = select.dataset.statusId;
        form.dataset.newStatus = select.value;
        form.dataset.oldStatus = task?.status || 'waiting';
      });
    });
  };

  // ผูกการยืนยัน/ยกเลิกการเปลี่ยนสถานะกับ Task API
  const prepareStatusForm = () => {
    const dialog = document.getElementById('statusDialog');
    const form = document.getElementById('statusForm');
    const cancelButton = document.getElementById('cancelStatus');
    const errorMessage = document.getElementById('statusError');
    if (!dialog || !form || !cancelButton || !errorMessage) return;

    // ปิดกล่องสถานะ ล้างค่า และโหลดรายการปัจจุบันอีกครั้ง
    const closeDialog = () => {
      dialog.hidden = true;
      form.reset();
      errorMessage.textContent = '';
      showTasks();
    };

    cancelButton.addEventListener('click', closeDialog);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      errorMessage.textContent = '';
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;

      try {
        await TaskStore.updateStatus(
          form.dataset.taskId,
          form.dataset.newStatus
        );
        closeDialog();
      } catch (error) {
        errorMessage.textContent = error.message || 'เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      } finally {
        submitButton.disabled = false;
      }
    });
  };

  // เตรียมฟอร์มงานโดยใช้ชื่อผู้แจ้งจากโปรไฟล์
  // เตรียมฟอร์มสร้าง/แก้ไขงาน เติมผู้แจ้งและตรวจสิทธิ์ก่อนบันทึก
  const prepareTaskForm = async () => {
    const form = document.getElementById('taskForm');
    if (!form) return;

    const editId = new URLSearchParams(window.location.search).get('edit');
    const submitButton = form.querySelector('[type="submit"]');
    const requesterName = document.getElementById('department');
    const currentUser = AppAuth.getCurrentUser();
    const profileName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim();

    if (requesterName) {
      requesterName.value = profileName;
      if (!profileName) {
        const message = document.getElementById('taskFormMessage');
        if (message) message.textContent = 'ไม่พบชื่อในโปรไฟล์ กรุณากรอกชื่อและนามสกุลในหน้าโปรไฟล์ก่อน';
        submitButton.disabled = true;
        return;
      }
    }

    try {
      const permissions = await TaskStore.getPermissions();
      const requiredPermission = editId ? 'tasks.edit' : 'tasks.create';
      if (!permissions[requiredPermission]) {
        submitButton.disabled = true;
        const message = document.getElementById('taskFormMessage');
        if (message) message.textContent = 'Role ของคุณไม่มีสิทธิ์บันทึกงานประเภทนี้';
        return;
      }
    } catch (error) {
      showTaskError(error);
      submitButton.disabled = true;
      return;
    }

    const dateInput = document.getElementById('date');
    const dueAtInput = document.getElementById('dueAt');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
    if (dateInput && dueAtInput) {
      dueAtInput.min = dateInput.value;
      dateInput.addEventListener('change', () => {
        dueAtInput.min = dateInput.value;
      });
    }

    let oldTask = null;
    if (editId) {
      submitButton.disabled = true;
      refreshTasks().then(tasks => {
        oldTask = tasks.find(task => String(task.id) === editId) || null;
        if (!oldTask) {
          showTaskError(new Error('ไม่พบรายการงานที่ต้องการแก้ไข'));
          return;
        }
        document.getElementById('formTitle').textContent = 'แก้ไขงาน';
        document.getElementById('saveButton').textContent = 'บันทึกการแก้ไข';
        document.getElementById('taskId').value = oldTask.taskId || oldTask.id;
        document.getElementById('assetIdentifiers').value = oldTask.assetIdentifier || '';
        if (requesterName) requesterName.value = oldTask.department || profileName;
        document.getElementById('date').value = oldTask.date || '';
        if (dueAtInput) {
          dueAtInput.value = oldTask.dueAt || '';
          dueAtInput.min = oldTask.date || '';
        }
        document.getElementById('detail').value = oldTask.detail || '';
        submitButton.disabled = false;
      }).catch(showTaskError);
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (editId && !oldTask) return;
      submitButton.disabled = true;
      const formData = new FormData(form);
      const assetIdentifiers = String(formData.get('assetIdentifiers') || '')
        .split(/\r?\n/)
        .map(identifier => identifier.trim())
        .filter(Boolean);
      if (editId && assetIdentifiers.length > 1) {
        const message = document.getElementById('taskFormMessage');
        if (message) message.textContent = 'การแก้ไขงานรองรับหมายเลขเครื่องได้ครั้งละ 1 รายการ';
        submitButton.disabled = false;
        return;
      }
      const task = {
        id: editId,
        taskId: formData.get('taskId'),
        assetIdentifier: assetIdentifiers[0] || '',
        department: formData.get('department'),
        detail: formData.get('detail'),
        date: formData.get('date'),
        dueAt: formData.get('dueAt'),
        owner: oldTask?.owner || oldTask?.assignee || '',
        installationAssistant: oldTask?.installationAssistant || '',
        priority: oldTask?.priority || 'medium',
        createdAt: oldTask?.createdAt || new Date().toISOString()
      };
      if (!editId) task.assetIdentifiers = assetIdentifiers;

      if (editId && !await AppDialogs.confirm('ยืนยันบันทึกการแก้ไขงานนี้หรือไม่?', {
        title: 'ยืนยันแก้ไขงาน',
        confirmText: 'บันทึกการแก้ไข'
      })) {
        submitButton.disabled = false;
        return;
      }

      try {
        if (editId) {
          await TaskStore.update(task);
        } else {
          await TaskStore.create(task);
        }
        window.location.href = 'services.html';
      } catch (error) {
        showTaskError(error);
        submitButton.disabled = false;
      }
    });
  };

  setupAccount();
  setupTaskMenu();
  setupTrashView();
  setupInstallControls();
  setupBulkEdit();
  showTasks();
  prepareTaskForm();
  prepareStatusForm();
  loadNotifications();
  window.setInterval(() => {
    if (!document.hidden) loadNotifications();
  }, 30000);

});
