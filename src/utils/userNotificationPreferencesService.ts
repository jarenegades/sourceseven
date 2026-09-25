import { accountApi } from './accountApi';

export interface UserNotificationPreferences {
  order_updates: boolean;
  promotions: boolean;
  newsletter: boolean;
  sms_alerts: boolean;
}

export const userNotificationPreferencesService = {
  async get(): Promise<UserNotificationPreferences | null> {
    const { preferences } = await accountApi<{ preferences: UserNotificationPreferences | null }>('notifications');
    return preferences;
  },

  async save(preferences: UserNotificationPreferences): Promise<UserNotificationPreferences> {
    const { preferences: saved } = await accountApi<{ preferences: UserNotificationPreferences }>('notifications', {
      method: 'PUT', body: preferences,
    });
    return saved;
  },
};
