import { User, Mail, Phone, MapPin, Shield, CreditCard, Bell, Package, LayoutDashboard, AlertCircle, Camera, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useState, useEffect } from 'react';
import { accountApi } from '../utils/accountApi';
import { authService } from '../utils/authService';
import { userService } from '../utils/userService';
import { userNotificationPreferencesService } from '../utils/userNotificationPreferencesService';
import { toast } from 'sonner';

interface AccountPageProps {
  onNavigateToOrders: () => void;
  onNavigateToWishlist: () => void;
  isAdmin?: boolean;
  onNavigateToAdmin?: () => void;
}

// Helper to get user initials for avatar fallback
const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return (first + last) || 'U';
};

export function AccountPage({ onNavigateToOrders, onNavigateToWishlist, isAdmin, onNavigateToAdmin }: AccountPageProps) {
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUpdating, setAvatarUpdating] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [accountInfo, setAccountInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  const [accountStats, setAccountStats] = useState({
    memberSince: '',
    totalOrders: 0,
    wishlistItems: 0,
  });

  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: true,
    newsletter: false,
    smsAlerts: true,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      
      if (!user?.id) {
        toast.error('User not authenticated');
        return;
      }

      setUserId(user.id);

      // Load user profile
      const profile = await userService.getProfile(user.id);

      if (profile) {
        setAccountInfo({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || user.email || '',
          phone: profile.phone || '',
        });

        // Set avatar URL
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }

        setAccountStats(prev => ({
          ...prev,
          memberSince: new Date(profile.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
          })
        }));
      }

      // Load default shipping address
      const { address } = await accountApi<{ address: {
        street: string; city: string; state: string; zip_code: string; country: string;
      } | null }>('addresses');
      if (address) {
        setShippingAddress({
          street: address.street || '',
          city: address.city || '',
          state: address.state || '',
          zipCode: address.zip_code || '',
          country: address.country || 'United States',
        });
      }

      // Load order stats
      const { stats } = await accountApi<{ stats: { total: number } }>('orders', { query: { stats: '1' } });
      setAccountStats(prev => ({
        ...prev,
        totalOrders: stats.total
      }));

      // Load wishlist count
      const { items: wishlistItems } = await accountApi<{ items: unknown[] }>('wishlist');
      setAccountStats(prev => ({
        ...prev,
        wishlistItems: wishlistItems.length
      }));

      const notificationPreferences = await userNotificationPreferencesService.get();
      if (notificationPreferences) {
        setNotifications({
          orderUpdates: notificationPreferences.order_updates,
          promotions: notificationPreferences.promotions,
          newsletter: notificationPreferences.newsletter,
          smsAlerts: notificationPreferences.sms_alerts,
        });
      }

      console.log('✅ User data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      toast.error('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      setAvatarUpdating(true);
      const publicUrl = await userService.uploadAvatar(userId, file);
      setAvatarUrl(publicUrl);
      toast.success('Profile picture updated successfully!');
      console.log('✅ Avatar uploaded:', publicUrl);
    } catch (error) {
      console.error('❌ Error uploading avatar:', error);
      toast.error('Failed to update profile picture');
    } finally {
      setAvatarUpdating(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!userId) return;

    try {
      setAvatarUpdating(true);
      await userService.deleteAvatar(userId);
      setAvatarUrl(null);
      toast.success('Profile picture deleted');
      console.log('✅ Avatar deleted');
    } catch (error) {
      console.error('❌ Error deleting avatar:', error);
      toast.error('Failed to delete profile picture');
    } finally {
      setAvatarUpdating(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
        if (!userId) throw new Error('User not authenticated');
        await userService.updateProfile(userId, {
            first_name: accountInfo.firstName,
            last_name: accountInfo.lastName,
            phone: accountInfo.phone,
        });

      toast.success('Profile updated successfully!');
      console.log('✅ Profile updated');
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
        await accountApi('addresses', {
          method: 'PUT',
          body: {
              street: shippingAddress.street,
              city: shippingAddress.city,
              state: shippingAddress.state,
              zip_code: shippingAddress.zipCode,
              country: shippingAddress.country,
          },
        });

      toast.success('Address updated successfully!');
      console.log('✅ Address updated');
    } catch (error) {
      console.error('❌ Error updating address:', error);
      toast.error('Failed to update address');
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await userNotificationPreferencesService.save({
        order_updates: notifications.orderUpdates,
        promotions: notifications.promotions,
        newsletter: notifications.newsletter,
        sms_alerts: notifications.smsAlerts,
      });
      toast.success('Notification preferences updated successfully!');
    } catch (error) {
      console.error('❌ Error updating notification preferences:', error);
      toast.error('Failed to update notification preferences');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-[#003366] mb-2">Your Account</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
          <p className="text-gray-600 mt-4">Loading account data...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-4 gap-6">
          {/* Quick Actions Sidebar */}
          <div className="md:col-span-1">
            <Card className="p-4">
              <h3 className="text-[#003366] mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  onClick={onNavigateToOrders}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Your Orders
                </Button>
                <Button
                  onClick={onNavigateToWishlist}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Wishlist
                </Button>
                {isAdmin && (
                  <Button
                    onClick={onNavigateToAdmin}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </Button>
                )}
              </div>
            </Card>

            {/* Account Summary */}
            <Card className="p-4 mt-4">
              <h3 className="text-[#003366] mb-4">Account Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Member Since</span>
                  <span className="text-gray-900">{accountStats.memberSince || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Orders</span>
                  <span className="text-gray-900">{accountStats.totalOrders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Wishlist Items</span>
                  <span className="text-gray-900">{accountStats.wishlistItems}</span>
                </div>
              </div>
            </Card>
          </div>

        {/* Main Content */}
        <div className="md:col-span-3">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="address">Address</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card className="p-6">
                <div className="mb-8">
                  <h2 className="text-[#003366] text-2xl font-bold">Personal Information</h2>
                  <p className="text-sm text-gray-600 mt-1">Update your account details and profile photo</p>
                </div>

                {/* Avatar Section - Simple and Clean */}
                <div className="mb-12 py-8 border-b border-gray-200">
                  <div className="flex flex-col items-center justify-center gap-6 w-full">
                    <Avatar className="h-40 w-40 border-4 border-[#003366] shadow-lg flex-shrink-0">
                      <AvatarImage src={avatarUrl || undefined} alt={`${accountInfo.firstName} ${accountInfo.lastName}`} />
                      <AvatarFallback className="w-full h-full bg-gradient-to-br from-[#003366] to-[#0055AA] text-white text-6xl font-bold flex items-center justify-center">
                        {getInitials(accountInfo.firstName, accountInfo.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex gap-3 justify-center">
                      <label className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={avatarUpdating}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            input?.click();
                          }}
                          disabled={avatarUpdating}
                          className="bg-[#003366] hover:bg-[#001f47] text-white font-semibold shadow-md px-6"
                        >
                          <Camera className="h-6 w-6 mr-2" />
                          {avatarUpdating ? 'Uploading...' : 'Upload Photo'}
                        </Button>
                      </label>
                      {avatarUrl && (
                        <Button
                          type="button"
                          onClick={handleDeleteAvatar}
                          disabled={avatarUpdating}
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 font-semibold border-2 px-6"
                        >
                          <Trash2 className="h-6 w-6 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                    {avatarUrl && <p className="text-sm text-green-600 font-medium text-center">✅ Photo appears on your reviews</p>}
                  </div>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="font-semibold">First Name</Label>
                      <Input
                        id="firstName"
                        value={accountInfo.firstName}
                        onChange={(e) => setAccountInfo({ ...accountInfo, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="font-semibold">Last Name</Label>
                      <Input
                        id="lastName"
                        value={accountInfo.lastName}
                        onChange={(e) => setAccountInfo({ ...accountInfo, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold">Email Address</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={accountInfo.email}
                        disabled
                        className="flex-1 bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="font-semibold">Phone Number</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={accountInfo.phone}
                        onChange={(e) => setAccountInfo({ ...accountInfo, phone: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      className="bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 font-semibold px-8"
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Card>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-[#003366] w-12 h-12 rounded-full flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-[#003366]">Shipping Address</h2>
                    <p className="text-sm text-gray-600">Manage your default shipping address</p>
                  </div>
                </div>

                <form onSubmit={handleSaveAddress} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={shippingAddress.street}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={shippingAddress.zipCode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, zipCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      className="bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900"
                    >
                      Save Address
                    </Button>
                  </div>
                </form>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-[#003366] w-12 h-12 rounded-full flex items-center justify-center">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-[#003366]">Security Settings</h2>
                    <p className="text-sm text-gray-600">Manage your password and security options</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h3 className="text-gray-900 mb-2">Change Password</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      It's a good idea to use a strong password that you're not using elsewhere
                    </p>
                    <Button variant="outline">Update Password</Button>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="text-gray-900 mb-2">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Add an extra layer of security to your account
                    </p>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="text-gray-900 mb-2">Payment Methods</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Manage your saved payment methods
                    </p>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg mb-3">
                      <CreditCard className="h-6 w-6 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm">Visa ending in 4242</p>
                        <p className="text-xs text-gray-500">Expires 12/2026</p>
                      </div>
                      <Button variant="ghost" size="sm">Remove</Button>
                    </div>
                    <Button variant="outline">Add Payment Method</Button>
                  </div>

                  <div>
                    <h3 className="text-gray-900 mb-2">Active Sessions</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Manage devices where you're currently signed in
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-900">Chrome on Windows</p>
                          <p className="text-xs text-gray-500">New York, USA • Active now</p>
                        </div>
                        <span className="text-xs text-green-600">Current</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-[#003366] w-12 h-12 rounded-full flex items-center justify-center">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-[#003366]">Notification Preferences</h2>
                    <p className="text-sm text-gray-600">Choose how you want to hear from us</p>
                  </div>
                </div>

                <form onSubmit={handleSaveNotifications} className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex-1">
                      <h3 className="text-gray-900 mb-1">Order Updates</h3>
                      <p className="text-sm text-gray-600">
                        Get notifications about your order status and delivery
                      </p>
                    </div>
                    <Switch
                      checked={notifications.orderUpdates}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, orderUpdates: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex-1">
                      <h3 className="text-gray-900 mb-1">Promotions & Offers</h3>
                      <p className="text-sm text-gray-600">
                        Receive emails about special deals and promotions
                      </p>
                    </div>
                    <Switch
                      checked={notifications.promotions}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, promotions: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex-1">
                      <h3 className="text-gray-900 mb-1">Newsletter</h3>
                      <p className="text-sm text-gray-600">
                        Get our weekly newsletter with tips and product updates
                      </p>
                    </div>
                    <Switch
                      checked={notifications.newsletter}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, newsletter: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="flex-1">
                      <h3 className="text-gray-900 mb-1">SMS Alerts</h3>
                      <p className="text-sm text-gray-600">
                        Receive text messages for important account updates
                      </p>
                    </div>
                    <Switch
                      checked={notifications.smsAlerts}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, smsAlerts: checked })
                      }
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      className="bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900"
                    >
                      Save Preferences
                    </Button>
                  </div>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        </div>
      )}
    </div>
  );
}
