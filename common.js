// ==================== common.js – Ramz‑X (النسخة النهائية الكاملة) ====================
// تم تطوير هذا الملف بمساعدة رمزي الصلاحي (Ramz-X)
// جميع الحقوق الفكرية محفوظة لمنصة Ramz-X © 2026
// تاريخ آخر تحديث: 2026-06-08
//
// يحتوي هذا الملف على:
// 1. تعريف عميل Supabase مع إعدادات الجلسة الدائمة
// 2. Polyfill لمتصفحات قديمة (crypto.randomUUID)
// 3. دوال العرض والتنسيق (toast, formatNumber, escapeHtml, timeAgo, parseImages)
// 4. إدارة المستخدم (جلسات الضيوف، المحادثة الترحيبية)
// 5. دوال المصادقة (تسجيل الدخول، إنشاء حساب، دخول كزائر)
// 6. دوال RPC للتفاعلات (إعجابات، حفظ، مشاركات، تعليقات، مشاهدات)
// 7. إدارة الثيم (داكن/فاتح)
// 8. دوال تسجيل الخروج
// 9. دوال الإشعارات العامة (عداد أيقونة صندوق الوارد، إشعار منبثق علوي)
// 10. تهيئة تلقائية عند تحميل الصفحة (ثيم، Service Worker)
// 11. معالجة أخطاء Service Worker و Notification
// 12. إشعارات علوية فورية عند تفاعل الآخرين مع محتواك (Realtime)

// ==================== 0. Polyfill للمتصفحات القديمة ====================
// crypto.randomUUID غير مدعوم في Safari 13 والإصدارات الأقدم
if (!crypto.randomUUID) {
    crypto.randomUUID = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
}

// ==================== 1. تعريف عميل Supabase مع جلسات دائمة ====================
var supabaseClient = window.supabase.createClient(
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
var supabase = supabaseClient;

// ==================== 2. دوال العرض والتنسيق ====================

/**
 * عرض رسالة منبثقة (Toast)
 * @param {string} msg - نص الرسالة
 * @param {boolean} isError - هل هي رسالة خطأ (تغير لون الحدود)
 */
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

/**
 * تنسيق الأرقام إلى صيغة مختصرة (K, M)
 * @param {number} num - الرقم المراد تنسيقه
 * @returns {string} الرقم المنسق
 */
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
}

/**
 * ترميز النص لحمايته من هجمات XSS
 * @param {string} str - النص المراد ترميزه
 * @returns {string} النص بعد الترميز
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

/**
 * تحويل التاريخ إلى صيغة "منذ X وقت"
 * @param {string|Date} date - التاريخ المراد تحويله
 * @returns {string} النص المعبر عن الوقت المنقضي
 */
function timeAgo(date) {
    var diff = Math.floor((new Date() - new Date(date)) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return 'منذ ' + Math.floor(diff / 60) + ' د';
    if (diff < 86400) return 'منذ ' + Math.floor(diff / 3600) + ' س';
    return 'منذ ' + Math.floor(diff / 86400) + ' يوم';
}

/**
 * تحويل حقل الصور (قد يكون نصاً أو JSON أو مصفوفة) إلى مصفوفة روابط
 * @param {string|Array} imageField - حقل الصور من قاعدة البيانات
 * @returns {Array} مصفوفة من روابط الصور
 */
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

/**
 * إضافة مستخدم ضيف إلى المحادثة الترحيبية (معرفها ثابت)
 * @param {string} guestUserId - معرف المستخدم الضيف
 */
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
            await supabase.from('conversation_participants').insert({
                conversation_id: welcomeConvId,
                user_id: 'a1000000-0000-0000-0000-000000000005'
            });
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
        console.error('فشل إضافة الزائر للمحادثة الترحيبية:', err);
    }
}

/**
 * التحقق من وجود جلسة نشطة للمستخدم، وإنشاء جلسة ضيف إذا لم توجد
 * @returns {Promise<Object>} كائن المستخدم الحالي
 */
async function checkSession() {
    var user = null;
    try {
        user = JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {}

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

/**
 * الحصول على المستخدم الحالي من localStorage
 * @returns {Object|null} كائن المستخدم أو null
 */
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {
        return null;
    }
}

// ==================== 4. دوال المصادقة (لـ login.html) ====================

/**
 * إنشاء حساب ضيف دائم (بريد إلكتروني وكلمة مرور)
 * @param {string} email - البريد الإلكتروني
 * @param {string} password - كلمة المرور
 * @param {string} fullName - الاسم الكامل (اختياري)
 * @returns {Promise<Object>} كائن المستخدم الجديد
 */
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

/**
 * تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
 * @param {string} email - البريد الإلكتروني
 * @param {string} password - كلمة المرور
 * @returns {Promise<Object>} كائن المستخدم
 */
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

/**
 * تسجيل الدخول كضيف باستخدام بريد وكلمة مرور (مرادف لـ loginWithEmail)
 * @param {string} email - البريد الإلكتروني
 * @param {string} password - كلمة المرور
 * @returns {Promise<Object>}
 */
async function loginGuest(email, password) {
    return await loginWithEmail(email, password);
}

/**
 * تسجيل مستخدم جديد (حساب عادي)
 * @param {string} email - البريد الإلكتروني
 * @param {string} username - اسم المستخدم
 * @param {string} password - كلمة المرور
 * @param {string} fullName - الاسم الكامل (اختياري)
 * @returns {Promise<Object>} كائن المستخدم الجديد
 */
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

// ==================== 5. دوال RPC للتفاعلات (محسّنة ومتوافقة) ====================

// الدوال الأصلية (قد تكون موجودة في Supabase كـ RPC)
// يتم استدعاؤها من بعض الصفحات (مثل home.html القديم)
async function incrementLikes(rowId) { await supabase.rpc('increment_likes', { row_id: rowId }); }
async function decrementLikes(rowId) { await supabase.rpc('decrement_likes', { row_id: rowId }); }
async function incrementFavorites(rowId) { await supabase.rpc('increment_favorites', { row_id: rowId }); }
async function decrementFavorites(rowId) { await supabase.rpc('decrement_favorites', { row_id: rowId }); }
async function incrementReposts(rowId) { await supabase.rpc('increment_reposts', { row_id: rowId }); }
async function decrementReposts(rowId) { await supabase.rpc('decrement_reposts', { row_id: rowId }); }
async function incrementCommentsCount(rowId) { await supabase.rpc('increment_comments_count', { row_id: rowId }); }
async function decrementCommentsCount(rowId) { await supabase.rpc('decrement_comments_count', { row_id: rowId }); }

/**
 * دالة زيادة المشاهدات (محسّنة للتوافق)
 * تحاول استدعاء RPC الأصلية أولاً، ثم البديلة increment_views_rpc
 * @param {string} rowId - معرف المنشور (post_id)
 */
async function incrementViews(rowId) {
    try {
        await supabase.rpc('increment_views', { row_id: rowId });
    } catch (err) {
        try {
            await supabase.rpc('increment_views_rpc', { post_id: rowId });
        } catch (e) {
            console.warn('تعذر زيادة المشاهدات – تأكد من وجود دوال RPC في Supabase');
        }
    }
}

/**
 * دالة بديلة لزيادة المشاهدات باستخدام اسم مختلف (تستخدم في الكود الجديد)
 * @param {string} postId - معرف المنشور
 */
async function incrementViewsRPC(postId) {
    try {
        await supabase.rpc('increment_views_rpc', { post_id: postId });
    } catch (err) {
        console.warn('RPC increment_views_rpc غير موجودة في قاعدة البيانات');
    }
}

// ==================== 6. إدارة الثيم (داكن / فاتح) ====================

/**
 * تهيئة الثيم بناءً على التفضيل المخزن في localStorage
 */
function initTheme() {
    var saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
        document.body.classList.remove('light');
    } else {
        document.body.classList.add('light');
    }
}

/**
 * تبديل الثيم بين الداكن والفاتح
 * @returns {boolean} true إذا أصبح داكن، false إذا أصبح فاتح
 */
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

// ==================== 8. دوال الإشعارات العامة ====================

/**
 * تحديث عداد الإشعارات في أيقونة صندوق الوارد بالشريط السفلي
 * يتم استدعاؤها عند تحميل أي صفحة وعند تغيير حالة الإشعارات
 */
async function updateInboxBadge() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', user.id)
            .eq('seen', false);
        
        if (error) throw error;
        
        // البحث عن أيقونة صندوق الوارد في الشريط السفلي (في جميع الصفحات)
        const inboxIcon = document.querySelector('.bottom-footer a[href="inbox.html"]');
        if (inboxIcon) {
            // إزالة أي عداد قديم
            const oldBadge = inboxIcon.querySelector('.notification-badge');
            if (oldBadge) oldBadge.remove();
            
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'notification-badge';
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: var(--accent, #ff0050);
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                    min-width: 18px;
                    height: 18px;
                    border-radius: 9px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                    direction: ltr;
                `;
                inboxIcon.style.position = 'relative';
                inboxIcon.appendChild(badge);
            }
        }
    } catch (err) {
        console.warn('فشل تحديث عداد الإشعارات:', err);
    }
}

/**
 * عرض إشعار منبثق من أعلى الشاشة (يختفي بعد 2 ثانية)
 * @param {string} message - نص الإشعار
 * @param {string} type - نوع الإشعار (info, success, warning)
 */
function showTopNotification(message, type = 'info') {
    // إزالة أي إشعار سابق
    const existingNotif = document.getElementById('topNotification');
    if (existingNotif) existingNotif.remove();
    
    const notif = document.createElement('div');
    notif.id = 'topNotification';
    const bgColor = type === 'success' ? '#4caf50' : (type === 'warning' ? '#ff9800' : 'var(--accent, #ff0050)');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${bgColor};
        color: white;
        padding: 12px 24px;
        border-radius: 30px;
        font-family: 'Cairo', sans-serif;
        font-size: 14px;
        z-index: 10001;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease;
        white-space: nowrap;
        max-width: 90%;
        overflow-x: auto;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    // إضافة حركات CSS إذا لم تكن موجودة
    if (!document.querySelector('#notificationAnimations')) {
        const style = document.createElement('style');
        style.id = 'notificationAnimations';
        style.textContent = `
            @keyframes slideDown {
                from { top: -50px; opacity: 0; }
                to { top: 20px; opacity: 1; }
            }
            @keyframes slideUp {
                from { top: 20px; opacity: 1; }
                to { top: -50px; opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // إخفاء بعد 2 ثانية
    setTimeout(() => {
        notif.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            if (notif.parentNode) notif.remove();
        }, 300);
    }, 2000);
}

/**
 * طلب إذن الإشعارات من المستخدم (لدعم الإشعارات الفورية)
 */
function requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('✅ إذن الإشعارات مُمنوح');
                }
            }).catch(err => console.warn('فشل طلب إذن الإشعارات:', err));
        }
    } else {
        console.warn('⚠️ Notification API غير مدعوم في هذا المتصفح');
    }
}

/**
 * عرض إشعار سطح المكتب (Push Notification)
 * @param {string} title - عنوان الإشعار
 * @param {string} body - نص الإشعار
 * @param {string} icon - رابط أيقونة الإشعار
 */
function showDesktopNotification(title, body, icon = '/icon/icon-192x192.png') {
    // التحقق من توفر Notification API
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('Notification API غير مدعوم');
        return;
    }
    
    if (Notification.permission === 'granted') {
        try {
            new Notification(title, { body: body, icon: icon });
        } catch (err) {
            console.warn('فشل عرض الإشعار:', err);
        }
    } else if (Notification.permission !== 'denied') {
        // طلب الإذن تلقائياً عند أول محاولة
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body: body, icon: icon });
            }
        }).catch(err => console.warn('خطأ في طلب الإذن:', err));
    }
}

// ==================== 9. تسجيل Service Worker مع معالجة الأخطاء ====================

/**
 * تسجيل Service Worker لتشغيل التطبيق كـ PWA مع معالجة الأخطاء
 */
function registerServiceWorker() {
    // التحقق من توفر Service Worker API
    if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Worker غير مدعوم في هذا المتصفح');
        return;
    }
    
    // تسجيل الـ SW مع معالجة الأخطاء
    navigator.serviceWorker.register('/sw.js')
        .then(function(registration) {
            console.log('✅ Service Worker registered successfully with scope:', registration.scope);
        })
        .catch(function(error) {
            // معالجة الخطأ TypeError {} بشكل مناسب
            console.warn('⚠️ فشل تسجيل Service Worker:', error);
            // يمكن عرض رسالة للمستخدم إذا أردت
            // showToast('تعذر تشغيل التطبيق دون اتصال', true);
        });
}

// ==================== 10. التهيئة التلقائية عند تحميل الصفحة ====================

document.addEventListener('DOMContentLoaded', function () {
    // تهيئة الثيم
    initTheme();
    
    // إعداد زر تبديل الثيم إذا كان موجوداً في الصفحة
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
            if (ic) {
                ic.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
            }
        });
    }
    
    // تحديث عداد الإشعارات في الشريط السفلي (إذا كانت الصفحة تحتوي على الشريط)
    updateInboxBadge();
    
    // طلب إذن الإشعارات (اختياري، لا يسبب خطأ)
    requestNotificationPermission();
    
    // تسجيل Service Worker مع معالجة الأخطاء
    registerServiceWorker();
});

// ==================== 11. الإشعارات العلوية الفورية عند تفاعل الآخرين (Realtime) ====================
let realtimeChannels = [];

/**
 * الاشتراك في الأحداث المباشرة للتفاعلات مع محتوى المستخدم
 */
function subscribeToRealtimeNotifications() {
    const user = getCurrentUser();
    if (!user) return;

    // إلغاء الاشتراكات السابقة لتجنب التكرار
    realtimeChannels.forEach(ch => {
        try { supabase.removeChannel(ch); } catch(e) {}
    });
    realtimeChannels = [];

    // 1. الاستماع للإعجابات الجديدة
    const likesChannel = supabase
        .channel('realtime-likes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, async (payload) => {
            const { post_id, user_id } = payload.new;
            if (user_id === user.id) return; // تجاهل إعجاب المستخدم بنفسه
            // التحقق مما إذا كان المنشور مملوكاً للمستخدم الحالي
            const { data: post } = await supabase
                .from('posts')
                .select('author_id')
                .eq('id', post_id)
                .single();
            if (post && post.author_id === user.id) {
                const { data: actor } = await supabase
                    .from('users')
                    .select('username')
                    .eq('id', user_id)
                    .single();
                if (actor) {
                    showTopNotification(`❤️ ${actor.username} أعجب بمنشورك`, 'info');
                }
            }
        })
        .subscribe();

    // 2. الاستماع للتعليقات الجديدة
    const commentsChannel = supabase
        .channel('realtime-comments')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
            const { post_id, user_id } = payload.new;
            if (user_id === user.id) return;
            const { data: post } = await supabase
                .from('posts')
                .select('author_id')
                .eq('id', post_id)
                .single();
            if (post && post.author_id === user.id) {
                const { data: actor } = await supabase
                    .from('users')
                    .select('username')
                    .eq('id', user_id)
                    .single();
                if (actor) {
                    showTopNotification(`💬 ${actor.username} علّق على منشورك`, 'info');
                }
            }
        })
        .subscribe();

    // 3. الاستماع للمتابعات الجديدة
    const followsChannel = supabase
        .channel('realtime-follows')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows' }, async (payload) => {
            const { follower_id, following_id } = payload.new;
            if (following_id === user.id && follower_id !== user.id) {
                const { data: actor } = await supabase
                    .from('users')
                    .select('username')
                    .eq('id', follower_id)
                    .single();
                if (actor) {
                    showTopNotification(`👤 ${actor.username} تابعك`, 'info');
                }
            }
        })
        .subscribe();

    // 4. الاستماع لإعادة النشر الجديدة
    const repostsChannel = supabase
        .channel('realtime-reposts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reposts' }, async (payload) => {
            const { post_id, user_id } = payload.new;
            if (user_id === user.id) return;
            const { data: post } = await supabase
                .from('posts')
                .select('author_id')
                .eq('id', post_id)
                .single();
            if (post && post.author_id === user.id) {
                const { data: actor } = await supabase
                    .from('users')
                    .select('username')
                    .eq('id', user_id)
                    .single();
                if (actor) {
                    showTopNotification(`🔄 ${actor.username} أعاد نشر منشورك`, 'info');
                }
            }
        })
        .subscribe();

    realtimeChannels.push(likesChannel, commentsChannel, followsChannel, repostsChannel);
    console.log('✅ تم تفعيل الإشعارات الفورية للتفاعلات');
}

// محاولة الاشتراك بعد تحميل الصفحة (مع تأخير بسيط لضمان وجود المستخدم)
setTimeout(() => {
    if (getCurrentUser()) {
        subscribeToRealtimeNotifications();
    } else {
        // إعادة المحاولة بعد ثانيتين إذا لم يكن المستخدم جاهزاً
        setTimeout(() => {
            if (getCurrentUser()) subscribeToRealtimeNotifications();
        }, 2000);
    }
}, 500);

// إعادة الاشتراك عند تغيير المستخدم (مثل تسجيل الدخول أو الخروج)
window.addEventListener('storage', (e) => {
    if (e.key === 'currentUser') {
        setTimeout(() => subscribeToRealtimeNotifications(), 500);
    }
});

// ==================== نهاية الملف ====================
