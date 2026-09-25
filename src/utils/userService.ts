import { accountApi } from './accountApi';

export interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Unable to read image file'));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export const userService = {
  async uploadAvatar(_userId: string, file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) throw new Error('File must be an image');
    if (file.size > 2 * 1024 * 1024) throw new Error('File size must be less than 2MB');
    const avatarUrl = await readFileAsDataUrl(file);
    const { profile } = await accountApi<{ profile: UserProfile }>('profile', {
      method: 'PATCH', body: { avatar_url: avatarUrl },
    });
    return profile.avatar_url;
  },

  async getProfile(_userId: string): Promise<UserProfile | null> {
    const { profile } = await accountApi<{ profile: UserProfile | null }>('profile');
    return profile;
  },

  async updateProfile(_userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const { profile } = await accountApi<{ profile: UserProfile | null }>('profile', {
      method: 'PATCH', body: updates,
    });
    return profile;
  },

  async deleteAvatar(_userId: string): Promise<void> {
    await accountApi('profile', { method: 'PATCH', body: { avatar_url: null } });
  },
};
