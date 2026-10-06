import { WorkshopAlarm } from '../types';
import { playAlarmSound } from './soundAlerts';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// PWA Background Alarm and Notification Service
export class PWAAlarmService {
  // Check if notification is supported and permission is granted
  static isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  static getPermissionState(): NotificationPermission | 'unsupported' {
    if (!this.isNotificationSupported()) return 'unsupported';
    return Notification.permission;
  }

  // Request user permission for background notifications & alarms
  static async requestPermission(employeeId?: string): Promise<boolean> {
    if (!this.isNotificationSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Also subscribe to server-side Web Push for closed-app remote ringing
        await this.subscribeToPush(employeeId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Subscribe to real server-side Web Push notifications
  static async subscribeToPush(employeeId?: string): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      // Get public VAPID key
      const keyRes = await fetch('/api/push/public-key');
      if (!keyRes.ok) return false;
      const { publicKey } = await keyRes.json();
      if (!publicKey) return false;

      const convertedKey = urlBase64ToUint8Array(publicKey);
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub,
          employeeId
        })
      });

      return true;
    } catch (err) {
      console.warn('Push subscription notice:', err);
      return false;
    }
  }

  // Send an alarm to the Service Worker to schedule in the background
  static scheduleAlarm(alarm: WorkshopAlarm): void {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return;
    }

    const alarmTime = alarm.scheduledTime || (alarm as any).time || '12:00';

    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_ALARM',
      payload: {
        id: alarm.id,
        title: `🔔 ${alarm.title || 'زنگ کارگاه M.GAMMON'}`,
        timeStr: alarmTime,
        ringtone: alarm.ringtone || 'BELL',
        message: alarm.message || `آلارم ساعت ${alarmTime} کارگاه`
      }
    });
  }

  // Cancel an alarm in the Service Worker
  static cancelAlarm(alarmId: string): void {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'CANCEL_ALARM',
      payload: { id: alarmId }
    });
  }

  // Sync all active alarms to the Service Worker
  static syncAlarms(alarms: WorkshopAlarm[]): void {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return;
    }

    alarms.forEach((alarm) => {
      if (alarm.isActive) {
        this.scheduleAlarm(alarm);
      } else {
        this.cancelAlarm(alarm.id);
      }
    });
  }

  // Test background alarm notification
  static async triggerTestNotification(employeeId?: string): Promise<boolean> {
    const granted = await this.requestPermission(employeeId);
    if (!granted) return false;

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TEST_ALARM_NOTIFICATION'
      });
      return true;
    }

    // Fallback if Service Worker not ready
    new Notification('🔔 تست صدای آلارم کارگاه M.GAMMON', {
      body: 'نوتیفیکیشن و زنگ پس‌زمینه با موفقیت فعال شد.',
      icon: '/pwa-192x192.png',
      tag: 'test-alarm'
    } as any);
    return true;
  }

  // Register listener for messages from Service Worker (e.g. user clicked notification)
  static initMessageListener(onAlarmTriggered?: (alarmId: string, ringtone?: string) => void): () => void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return () => {};
    }

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'ALARM_NOTIFICATION_CLICKED') {
        const { alarmId, ringtone } = event.data;
        playAlarmSound((ringtone as any) || 'BELL', true);
        if (onAlarmTriggered && alarmId) {
          onAlarmTriggered(alarmId, ringtone);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);

    // Also check URL parameters if launched directly from notification click
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const activeAlarmId = urlParams.get('activeAlarmId');
      const ringtone = urlParams.get('ringtone');
      if (activeAlarmId) {
        playAlarmSound((ringtone as any) || 'BELL', true);
        if (onAlarmTriggered) {
          onAlarmTriggered(activeAlarmId, ringtone || undefined);
        }
        // Clean URL parameter without reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    } catch {}

    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
    };
  }
}
