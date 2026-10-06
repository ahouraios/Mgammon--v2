// M.GAMMON Workshop Background Alarm & Push Notification Handler
// This Service Worker script handles alarms, push notifications, and background ringing

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications (when app is completely closed)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: '🔔 زنگ کارگاه M.GAMMON',
        message: event.data.text()
      };
    }
  }

  const title = data.title || '🔔 زنگ و آلارم کارگاه M.GAMMON';
  const body = data.message || data.body || 'آلارم مقرر کارگاه به صدا درآمده است!';
  const ringtone = data.ringtone || 'BELL';
  const alarmId = data.alarmId || `alarm_${Date.now()}`;

  const options = {
    body: body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    sound: '/alarm-bell.wav',
    // Strong alarm vibration cadence: long-pause-long-pause-burst
    vibrate: [600, 200, 600, 200, 600, 200, 1000],
    tag: `workshop-alarm-${alarmId}`,
    renotify: true,
    requireInteraction: true, // Remains on lock screen until user interacts with it!
    silent: false,
    data: {
      url: '/?activeAlarmId=' + encodeURIComponent(alarmId) + '&ringtone=' + encodeURIComponent(ringtone),
      alarmId: alarmId,
      ringtone: ringtone,
      timestamp: Date.now()
    },
    actions: [
      { action: 'open_app', title: '🔔 مشاهده و قطع زنگ' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click: Open or focus the application window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const alarmData = event.notification.data || {};
  const targetUrl = alarmData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and tell it to play alarm sound
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'ALARM_NOTIFICATION_CLICKED',
            alarmId: alarmData.alarmId,
            ringtone: alarmData.ringtone
          });
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// In-memory scheduled alarm timeouts in Service Worker
const activeTimers = new Map();

// Listen to client messages
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, payload } = event.data;

  if (type === 'SCHEDULE_ALARM') {
    // payload: { id, title, timeStr, ringtone, message }
    if (!payload || !payload.id || !payload.timeStr) return;

    // Clear existing timer if any
    if (activeTimers.has(payload.id)) {
      clearTimeout(activeTimers.get(payload.id));
      activeTimers.delete(payload.id);
    }

    const [h, m] = payload.timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);

    let delayMs = target.getTime() - now.getTime();
    if (delayMs < 0) {
      // If time passed for today, schedule for tomorrow
      delayMs += 24 * 60 * 60 * 1000;
    }

    const timerId = setTimeout(() => {
      self.registration.showNotification(payload.title || '🔔 زنگ کارگاه M.GAMMON', {
        body: payload.message || `زمان مقرر فرا رسید: ساعت ${payload.timeStr}`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        sound: '/alarm-bell.wav',
        vibrate: [600, 200, 600, 200, 600, 200, 1000],
        tag: `workshop-alarm-${payload.id}`,
        renotify: true,
        requireInteraction: true,
        silent: false,
        data: {
          url: '/?activeAlarmId=' + encodeURIComponent(payload.id) + '&ringtone=' + encodeURIComponent(payload.ringtone || 'BELL'),
          alarmId: payload.id,
          ringtone: payload.ringtone || 'BELL'
        },
        actions: [
          { action: 'open_app', title: '🔔 مشاهده و قطع زنگ' }
        ]
      });
      activeTimers.delete(payload.id);
    }, delayMs);

    activeTimers.set(payload.id, timerId);
  }

  if (type === 'CANCEL_ALARM') {
    if (payload && payload.id && activeTimers.has(payload.id)) {
      clearTimeout(activeTimers.get(payload.id));
      activeTimers.delete(payload.id);
    }
  }

  if (type === 'TEST_ALARM_NOTIFICATION') {
    self.registration.showNotification('🔔 تست صدای آلارم کارگاه', {
      body: 'نوتیفیکیشن و ویبره آلارم کارگاه با موفقیت فعال شد.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      sound: '/alarm-bell.wav',
      vibrate: [400, 200, 400, 200, 800],
      tag: 'test-alarm',
      renotify: true,
      requireInteraction: true,
      data: { url: '/' }
    });
  }
});
