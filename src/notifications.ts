import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { PlanItem } from './api/client';

const REMINDER_LEAD_MS = 30 * 60 * 1000; // 30 minutes before the item starts

function onNative(): boolean {
  return Platform.OS !== 'web';
}

/**
 * Asks the OS for notification permission. The system prompt IS the user's
 * approval — nothing is scheduled until they say yes here.
 */
export async function requestPermission(): Promise<boolean> {
  try {
    if (!onNative()) return false;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schedules one local notification per future plan item, 30 minutes before
 * its startsAt. Cancels any previously scheduled reminders first.
 * Returns the ids of the items that got a reminder.
 */
export async function schedulePlanReminders(items: PlanItem[]): Promise<string[]> {
  const scheduled: string[] = [];
  try {
    if (!onNative()) return scheduled;
    await cancelAllReminders();
    const now = Date.now();
    for (const item of items) {
      const starts = new Date(item.startsAt).getTime();
      if (isNaN(starts)) continue;
      const fireAt = starts - REMINDER_LEAD_MS;
      if (!(fireAt > now)) continue; // only future reminders
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Up next in your day',
          body: `${item.title} — ${item.details}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireAt),
        },
      });
      scheduled.push(item.id);
    }
  } catch {
    // Notifications are best-effort; the plan itself never depends on them.
  }
  return scheduled;
}

export async function cancelAllReminders(): Promise<void> {
  try {
    if (!onNative()) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* noop */
  }
}
