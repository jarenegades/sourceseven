import { authenticatedApi } from './accountApi';

export interface OrderNotificationSettings {
  id: string;
  notifications_enabled: boolean;
  admin_emails: string[];
  created_at: string;
  updated_at: string;
}

export interface SupplierNotificationRoute {
  id: string;
  email: string;
  category_id: string;
  subcategory_id: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

const path = '/api/admin/settings';

export const orderNotificationSettingsService = {
  async getSettings(): Promise<OrderNotificationSettings | null> {
    const { settings } = await authenticatedApi<{ settings: OrderNotificationSettings | null }>(
      path, { query: { section: 'order-notifications' } },
    );
    return settings;
  },

  async saveSettings(updates: {
    notifications_enabled: boolean;
    admin_emails: string[];
  }): Promise<OrderNotificationSettings> {
    const { settings } = await authenticatedApi<{ settings: OrderNotificationSettings }>(path, {
      method: 'PUT', query: { section: 'order-notifications' }, body: updates,
    });
    return settings;
  },

  async getSupplierRoutes(): Promise<SupplierNotificationRoute[]> {
    const { routes } = await authenticatedApi<{ routes: SupplierNotificationRoute[] }>(
      path, { query: { section: 'supplier-routes' } },
    );
    return routes;
  },

  async replaceSupplierRoutes(routes: Array<{
    email: string;
    category_id: string;
    subcategory_id?: string | null;
    is_enabled: boolean;
  }>): Promise<void> {
    await authenticatedApi(path, {
      method: 'PUT', query: { section: 'supplier-routes' }, body: { routes },
    });
  },
};
