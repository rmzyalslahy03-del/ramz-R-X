// ==================== common.js – Ramz‑X (النسخة النهائية الكاملة) ====================
// هذا الملف يُضمَّن في جميع صفحات HTML بعد تحميل مكتبة Supabase.
// يعرّف supabase كمتغير عام، ويحتوي على جميع الدوال المشتركة.

// 1. تعريف عميل Supabase مع الجلسات الدائمة
var supabase = supabase.createClient(
    "https://zlkpoghjbqtnhzhmmdbw.supabase.co",
    "sb_publishable_7evDsA5aEgPMsRBTFjntrg_XZQFmNLw",
    {
        auth: {
            storage: window.localStorage,    // استخدم localStorage بدلاً من الجلسة المؤقتة
            persistSession: true,            // ابق الجلسة حتى بعد إغلاق المتصفح
            autoRefreshToken: true,          // جدد الجلسة تلقائياً
            detectSessionInUrl: false        // لا تبحث عن رمز في الرابط
        }
    }
);

// ==================== 2. دوال العرض والتنسيق ====================

function showToast(msg, isError = false) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: var(--toast-bg, #000000dd); color: var(--toast-text, white);
            padding: 10px 24px; border-radius: 30px; z-index: 9999;
            font-family: 'Cairo', sans-serif; font-size: 14px; transition: opacity 0.3s;
            border: 1px solid var(--border, #2c2c2c); white-space: nowrap;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.borderColor = isError ? '#ff6b6b' : 'var(--border, #2c2c2c)';
    setTimeout(function () {
        toast.style.opacity = '0';
    }, 3000);
}

function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function timeAgo(date) {
    var diff = Math.floor((new Date() - new Date(date)) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return 'منذ ' + Math.floor(diff / 60) + ' د';
    if (diff < 86400) return 'منذ ' + Math.floor(diff / 3600) + ' س';
    return 'منذ ' + Math.floor(diff / 86400) + ' يوم';
}

function parseImages(imageField) {
    if (!imageField) return [];
    if (Array.isArray(imageField)) return imageField;
    try {
        var parsed = JSON.parse(imageField);
        if (Array.isArray(parsed)) return parsed;
        return [imageField];
    } catch (e) {
        return imageField.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
}

// ==================== 3. إدارة المستخدم والمحادثات ====================

async function addGuestToWelcomeChat(guestUserId) {
    try {
        var welcomeConvId = 'd1000000-0000-0000-0000-000000000001';
        var { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', welcomeConvId)
            .single();
        if (!conv) {
            await supabase.from('conversations').insert({ id: welcomeConvId });
            await supabase.from('conversation_participants').insert([
                { conversation_id: welcomeConvId, user_id: 'a1000000-0000-0000-0000-000000000005' }
            ]);
        }
        await supabase.from('conversation_participants')
            .upsert({ conversation_id: welcomeConvId, user_id: guestUserId });
        var { data: msgs } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', welcomeConvId)
            .eq('sender_id', 'a1000000-0000-0000-0000-000000000005')
            .limit(1);
        if (!msgs || msgs.length === 0) {
            await supabase.from('messages').insert({
                conversation_id: welcomeConvId,
                sender_id: 'a1000000-0000-0000-0000-000000000005',
                text: '👋 مرحباً بك في Ramz‑X! هذه محادثة ترحيبية. يمكنك التواصل مع الأصدقاء هنا.'
            });
        }
    } catch (err) {
        console.warn('تعذرت إضافة الزائر إلى المحادثة الترحيبية:', err);
    }
}

async function checkSession() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}
    if (user && user.id) {
        var { data: dbUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();
        if (dbUser) return user;
    }

    var guestId = crypto.randomUUID();
    var guestUser = {
        id: guestId,
        username: 'زائر_' + Math.floor(Math.random() * 10000),
        full_name: 'زائر',
        avatar: 'https://randomuser.me/api/portraits/lego/' + (Math.floor(Math.random() * 8) + 1) + '.jpg',
        is_guest: true,
        verified: false
    };

    await supabase.from('users').upsert(guestUser);
    localStorage.setItem('currentUser', JSON.stringify(guestUser));
    await addGuestToWelcomeChat(guestUser.id);
    return guestUser;
}

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('currentUser')); } catch (e) { return null; }
}

// ==================== 4. دوال المصادقة (لـ login.html) ====================

async function createGuestWithEmail(email, password, fullName) {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw new Error(authError.message);

    const userId = authData.user.id;
    const username = 'ضيف_' + Math.floor(Math.random() * 10000);

    const { error: insertError } = await supabase.from('users').upsert({
        id: userId,
        username: username,
        email: email,
        full_name: fullName || 'ضيف دائم',
        avatar: 'https://randomuser.me/api/portraits/lego/' + (Math.floor(Math.random() * 8) + 1) + '.jpg',
        is_guest: true,
        verified: false
    });
    if (insertError) throw new Error(insertError.message);

    const user = { id: userId, username: username, email: email, full_name: fullName, is_guest: true };
    localStorage.setItem('currentUser', JSON.stringify(user));
    await addGuestToWelcomeChat(userId);
    return user;
}

async function loginWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

    const user = {
        id: data.user.id,
        username: userData?.username || email.split('@')[0],
        email: email,
        full_name: userData?.full_name || '',
        avatar: userData?.avatar || '',
        is_guest: userData?.is_guest || false,
        verified: userData?.verified || false
    };

    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
}

async function loginGuest(email, password) {
    return await loginWithEmail(email, password);
}

async function registerWithEmail(email, username, password, fullName) {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw new Error(authError.message);

    const userId = authData.user.id;
    const finalUsername = username || email.split('@')[0];

    await supabase.from('users').upsert({
        id: userId,
        username: finalUsername,
        email: email,
        full_name: fullName || '',
        avatar: 'https://randomuser.me/api/portraits/lego/' + (Math.floor(Math.random() * 8) + 1) + '.jpg',
        is_guest: false,
        verified: false
    });

    const user = { id: userId, username: finalUsername, email: email, full_name: fullName, is_guest: false };
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
}

// ==================== 5. دوال RPC (تم تعطيلها لأن Triggers تقوم بالمهمة) ====================

async function incrementLikes(rowId) { /* تم التعطيل – Trigger يقوم بالمهمة */ }
async function decrementLikes(rowId) { /* تم التعطيل – Trigger يقوم بالمهمة */ }
async function incrementFavorites(rowId) { /* تم التعطيل – Trigger يقوم بالمهمة */ }
async function decrementFavorites(rowId) { /* تم التعطيل – Trigger يقوم بالمهمة */ }
async function incrementReposts(rowId) { /* تم التعطيل – Trigger يقوم بالمهمة */ }
async function decrementReposts(rowId) { /* تم التعطيل – Trigger يقوم بالمهمة */ }
async function incrementViews(rowId) { /* تم التعطيل – Trigger يقوم بالمهمة */ }
async function incrementCommentsCount(rowId) { /* تم التعطيل – Trigger يقوم بالمهمة */ }
async function decrementCommentsCount(rowId) { /* تم التعطيل – Trigger يقوم بالمهمة */ }

// ==================== 6. إدارة الثيم ====================

function initTheme() {
    var saved = localStorage.getItem('darkMode');
    if (saved === 'true') document.body.classList.remove('light');
    else document.body.classList.add('light');
}

function toggleTheme() {
    var isLight = document.body.classList.contains('light');
    if (isLight) {
        document.body.classList.remove('light');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.add('light');
        localStorage.setItem('darkMode', 'false');
    }
    return !isLight;
}

// ==================== 7. دوال الجلسة وتسجيل الخروج ====================

/**
 * تسجيل الخروج من المنصة
 * - يمسح الجلسة من Supabase
 * - يحذف بيانات المستخدم من localStorage
 * - يعيد التوجيه إلى صفحة تسجيل الدخول
 */
async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

/**
 * نافذة تأكيد تسجيل الخروج
 * - تظهر رسالة تأكيد للمستخدم
 * - تنفذ الخروج إذا وافق
 */
function confirmLogout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟\n\nسيتم إرجاعك إلى صفحة تسجيل الدخول.\nيمكنك العودة للرئيسية دون خروج بالضغط على "رجوع" في المتصفح.')) {
        logout();
    }
}

// ==================== 8. التهيئة التلقائية ====================

document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    var themeBtn = document.getElementById('darkModeToggle');
    if (themeBtn) {
        var icon = themeBtn.querySelector('i');
        if (icon) {
            var isDarkNow = !document.body.classList.contains('light');
            icon.className = isDarkNow ? 'fas fa-moon' : 'fas fa-sun';
        }
        themeBtn.addEventListener('click', function () {
            var isDark = toggleTheme();
            var ic = themeBtn.querySelector('i');
            if (ic) ic.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        });
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(function (reg) { console.log('✅ Service Worker مسجل:', reg.scope); })
            .catch(function (err) { console.warn('⚠️ فشل تسجيل Service Worker:', err); });
    }
});