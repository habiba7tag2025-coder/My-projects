// app.js - Responsive Multi-Role Synchronization Script

let currentUser = null;
let userRole = null; // customer أو courier
let activeOrder = null;

function switchPage(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active-page'));
    const target = document.getElementById(pageId);
    if(target) target.classList.add('active-page');

    document.querySelectorAll('#nav-links a').forEach(l => l.classList.remove('active'));
    if(pageId === 'home-view') document.getElementById('nav-home').classList.add('active');
    if(pageId === 'login-view') document.getElementById('nav-login').classList.add('active');
    if(pageId === 'dash-view') document.getElementById('nav-dash').classList.add('active');
}

// 
// 1. تسجيل الدخول الذكي وتوزيع الأدوار (نسخة معالجة الأخطاء)
async function handleLogin() {
    // أخذ القيمة وتحويلها لـ حروف صغيرة وإزالة أي مسافات زائدة بالخطأ
    const usernameInput = document.getElementById('username').value.trim().toLowerCase();
    
    if (!usernameInput) { 
        alert("يرجى إدخال الاسم أولاً."); 
        return; 
    }

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput }) // إرسال الاسم نظيف للسيرفر
        });
        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            userRole = data.role; // السيرفر هيرجع لي هنا إما customer أو courier
            
            document.getElementById('user-display').innerText = currentUser;
            document.getElementById('nav-dash-li').style.display = "block";

            // فحص الدور القادم من السيرفر وتوجيهه للوحة الصحيحة فوراً
            if (userRole === 'courier') {
                document.getElementById('role-text').innerText = "🛡️ صلاحية: كابتن الفحص والاستلام الميداني";
                document.getElementById('customer-panel-box').style.display = "none"; // إخفاء لوحة العميل
                document.getElementById('courier-panel-box').style.display = "block"; // إظهار لوحة المندوب
            } else {
                document.getElementById('role-text').innerText = "🏢 صلاحية: جهة / عميل طالب أمر الإتلاف والتطهير";
                document.getElementById('customer-panel-box').style.display = "block"; // إظهار لوحة العميل
                document.getElementById('courier-panel-box').style.display = "none"; // إخفاء لوحة المندوب
            }

            switchPage('dash-view');
            loadLedgerData();
        } else {
            alert("فشل تسجيل الدخول: " + data.message);
        }
    } catch (error) {
        alert("تأكدي من تشغيل أمر node server.js في الـ Terminal أولاً!");
    }
}

// 2. تقديم العميل لطلب جديد مع ميعاد محدد يدوياً
async function submitOrder() {
    const deviceType = document.getElementById('deviceType').value;
    const pickupDate = document.getElementById('pickupDateInput').value;

    if (!pickupDate) {
        alert("من فضلكِ حددي ميعاد وتاريخ وصول المندوب أولاً من خانة الوقت.");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/sanitize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device: deviceType, client: currentUser, pickupDate: pickupDate })
        });
        const data = await response.json();

        if (data.success) {
            activeOrder = data.order;
            document.getElementById('current-tracker-box').style.display = "block";
            
            updateTrackerUI(data.order);
            loadLedgerData();
            
            alert(`✅ تم تثبيت طلبكِ بنجاح!\nتمت جدولة المندوب للوصول في الميعاد المحدد: ${data.order.pickupDate}.\nيمكنك الآن إرسال اللينك للمندوب لمتابعة الطلب واستلامه.`);
        }
    } catch (error) {
        console.error(error);
    }
}

// 3. تحديث خط سير الأوامر في التتبع
function updateTrackerUI(order) {
    if (!order) return;
    document.getElementById('track-order-id').innerText = order.id;
    document.querySelectorAll('.step').forEach(s => s.className = 'step');

    const s1 = document.getElementById('step-1');
    const s2 = document.getElementById('step-2');
    const s3 = document.getElementById('step-3');
    const s4 = document.getElementById('step-4');
    const s5 = document.getElementById('step-5');

    if (order.status === 'pickup_scheduled') {
        s1.classList.add('success-step');
        s2.classList.add('current-step');
        document.getElementById('track-eta-text').innerHTML = `📅 المندوب في طريقه للعنوان. الميعاد المحجوز: <strong style="color:var(--primary-orange);">${order.pickupDate}</strong>`;
    } else if (order.status === 'in_lab') {
        s1.classList.add('success-step');
        s2.classList.add('success-step');
        s3.classList.add('success-step');
        s4.classList.add('current-step');
        document.getElementById('track-eta-text').innerHTML = `🔬 المندوب استلم والأجهزة بالمعمل. الوقت المقدر للمحو: <strong style="color:var(--primary-blue);">${order.timeRequired}</strong>`;
    } else if (order.status === 'completed') {
        s1.classList.add('success-step');
        s2.classList.add('success-step');
        s3.classList.add('success-step');
        s4.classList.add('success-step');
        s5.classList.add('success-step');
        document.getElementById('track-eta-text').innerHTML = `✅ اكتملت عملية الإتلاف الآمن، والشهادة الرقمية للبلوكشين صادرة وجاهزة للتحميل الآن.`;
    }
}

// 4. تحديث الأزرار المتاحة للمندوب لتغيير الحالة من هاتفه
function updateCourierActions(ledger) {
    const area = document.getElementById('courier-actions-area');
    if (!area) return;

    // البحث عن أي طلب لم يكتمل بعد ليعالجه المندوب
    const pendingOrder = ledger.find(o => o.status !== 'completed');

    if (!pendingOrder) {
        area.innerHTML = `<p style="font-size:13px; color:var(--text-muted); text-align:center;">🎉 ممتاز! تم إنهاء وتطهير كافة الطلبات الميدانية بنجاح.</p>`;
        return;
    }

    if (pendingOrder.status === 'pickup_scheduled') {
        area.innerHTML = `
            <div style="text-align:right; font-size:13px;">
                <p>📍 <strong>طلب معلق للعميل:</strong> ${pendingOrder.client}</p>
                <p>🛠️ <strong>العتاد المطلوب تجميعه:</strong> ${pendingOrder.device}</p>
                <p>⏰ <strong>الموعد المحدد:</strong> ${pendingOrder.pickupDate}</p>
                <button onclick="changeStatusByCourier('${pendingOrder.id}', 'in_lab')" class="btn-primary" style="background:var(--primary-blue); width:100%; justify-content:center; margin-top:10px;">اضغط هنا: تأكيد استلام القطعة ونقلها للمعمل <i class="fas fa-truck-loading"></i></button>
            </div>
        `;
    } else if (pendingOrder.status === 'in_lab') {
        area.innerHTML = `
            <div style="text-align:right; font-size:13px;">
                <p>🔬 <strong>الطلب رقم:</strong> ${pendingOrder.id} متواجد حالياً بالفحص</p>
                <p>🚨 بمجرد الانتهاء من خوارزمية المحو وكتابة الأصفار، اضغطي على الزر لإصدار شهادة البلوكشين وتحديث شاشة العميل فوراً.</p>
                <button onclick="changeStatusByCourier('${pendingOrder.id}', 'completed')" class="btn-primary" style="background:var(--primary-green); width:100%; justify-content:center; margin-top:10px;">اضغط هنا: إنهاء عملية الإتلاف وإصدار الشهادة <i class="fas fa-certificate"></i></button>
            </div>
        `;
    }
}

// دالة نداء الـ API الخاص بتحديث حالة المندوب
async function changeStatusByCourier(orderId, status) {
    try {
        const response = await fetch('http://localhost:3000/api/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderId, nextStatus: status })
        });
        const data = await response.json();
        if (data.success) {
            if (activeOrder && activeOrder.id === orderId) {
                activeOrder = data.order;
                updateTrackerUI(data.order);
            }
            loadLedgerData();
            alert(`👍 تم تحديث الحالة بنجاح إلى [${status === 'in_lab' ? 'بالإستلام والمعمل' : 'مكتمل ومؤمن'}] والعميل يرى التحديث الآن.`);
        }
    } catch (e) { console.error(e); }
}

// 5. جلب السجلات وتحديث الجداول
async function loadLedgerData() {
    try {
        const response = await fetch('http://localhost:3000/api/ledger');
        const data = await response.json();
        
        if (data.success) {
            updateCourierActions(data.ledger);
            
            // لو العميل فاتح وعنده طلب حالي، نحدث التتبع بتاعه لايف
            if (activeOrder) {
                const liveOrder = data.ledger.find(o => o.id === activeOrder.id);
                if (liveOrder) updateTrackerUI(liveOrder);
            }

            const tableBody = document.getElementById('ledger-rows');
            if (tableBody) {
                tableBody.innerHTML = '';
                data.ledger.forEach(item => {
                    let badge = '';
                    let action = `<span style="color:var(--text-muted); font-size:11px;">قيد التجهيز</span>`;
                    
                    if (item.status === 'pickup_scheduled') {
                        badge = `<span class="badge-status badge-scheduled">مجدول للمندوب</span>`;
                    } else if (item.status === 'in_lab') {
                        badge = `<span class="badge-status badge-lab">بالمعمل الفني</span>`;
                    } else if (item.status === 'completed') {
                        badge = `<span class="badge-status badge-done">مكتمل ومؤمن</span>`;
                        action = `<button onclick="downloadCert('${item.id}', '${item.device}', '${item.blockchainHash}')" class="btn-small" style="color:var(--primary-green); border-color:var(--primary-green);">الشهادة <i class="fas fa-file-pdf"></i></button>`;
                    }

                    tableBody.innerHTML += `
                        <tr>
                            <td style="font-weight:bold; color:var(--primary-blue);">${item.id}</td>
                            <td>${item.device}</td>
                            <td>${badge}</td>
                            <td>${action}</td>
                            <td class="hash-style">${item.blockchainHash}</td>
                        </tr>
                    `;
                });
            }
        }
    } catch (error) { console.error(error); }
}

function downloadCert(id, device, hash) {
    alert(`📜 تقرير تدمير الأصول الرقمية المعتمد من EnviroSecure\n\nالمعرف الفرعي للطلب: ${id}\nنوع العتاد: ${device}\nالمطابقة القياسية: NIST SP 800-88 R1 & DoD\nتوقيع البلوكشين المشفر: ${hash}\n\nحالة الجهاز الفيزيائية: خالي تماماً من البيانات، وتم تفكيكه لاستخراج المعادن الصديقة للبيئة بنجاح.`);
}

function logout() {
    currentUser = null; userRole = null; activeOrder = null;
    document.getElementById('nav-dash-li').style.display = "none";
    document.getElementById('current-tracker-box').style.display = "none";
    switchPage('home-view');
}