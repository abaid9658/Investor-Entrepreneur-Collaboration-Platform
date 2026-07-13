import React, { useState } from 'react';
import { User, Lock, Bell, Globe, Palette, CreditCard, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'appearance' | 'billing';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Notifications State
  const [notifs, setNotifs] = useState({
    emailDeals: true,
    emailMessages: true,
    emailUpdates: false,
    pushChat: true,
    pushMeetings: true,
  });

  // Security 2FA State
  const [is2FA, setIs2FA] = useState(user?.isTwoFAEnabled || false);

  // Password Input State
  const [pwd, setPwd] = useState({ current: '', newPwd: '', confirm: '' });

  // Appearance State
  const [theme, setTheme] = useState<'light' | 'dark' | 'glass'>('dark');

  if (!user) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Profile preferences updated!');
    }, 800);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd.current || !pwd.newPwd || !pwd.confirm) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (pwd.newPwd !== pwd.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setPwd({ current: '', newPwd: '', confirm: '' });
      toast.success('Account password updated successfully!');
    }, 1000);
  };

  const toggle2FA = () => {
    setIs2FA(!is2FA);
    toast.success(!is2FA ? 'Two-Factor Authentication (2FA) enabled!' : '2FA disabled.');
  };

  const tabItems = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'security', label: 'Security', icon: <Lock size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'billing', label: 'Billing & Plan', icon: <CreditCard size={18} /> },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences, configurations, and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardBody className="p-2">
            <nav className="space-y-1">
              {tabItems.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                      : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-950'
                  }`}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </CardBody>
        </Card>

        {/* Main Settings Dynamic Panels */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-bold text-gray-900">Profile Settings</h2>
                <p className="text-xs text-gray-500 mt-0.5">Customize your personal profile credentials</p>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar src={user.avatarUrl} alt={user.name} size="xl" />
                    <div>
                      <Button type="button" variant="outline" size="sm">
                        Change Photo
                      </Button>
                      <p className="mt-2 text-xs text-gray-400">
                        JPG, GIF or PNG. Maximum size of 800KB
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Full Name" defaultValue={user.name} required />
                    <Input label="Email" type="email" defaultValue={user.email} required disabled />
                    <Input label="Role Type" value={user.role} disabled />
                    <Input label="Location" defaultValue="San Francisco, CA" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Bio Description
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-gray-200 shadow-sm p-4 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                      rows={4}
                      defaultValue={user.bio || ''}
                      placeholder="Write something about yourself or your focus..."
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                    <Button type="button" variant="outline">Reset</Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-bold text-gray-900">Security Credentials</h2>
                <p className="text-xs text-gray-500 mt-0.5">Configure authentication factors & update password</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Two-Factor Authentication (2FA)</h3>
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200/50 rounded-xl p-4">
                    <div>
                      <p className="text-sm text-gray-700">
                        Adds an extra verification layer using custom Gmail codes on login
                      </p>
                      <Badge variant={is2FA ? 'success' : 'error'} className="mt-2.5">
                        {is2FA ? 'MFA Enabled' : 'Not Configured'}
                      </Badge>
                    </div>
                    <Button variant={is2FA ? 'danger' : 'primary'} onClick={toggle2FA}>
                      {is2FA ? 'Disable' : 'Enable 2FA'}
                    </Button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Change Account Password</h3>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <Input
                      label="Current Password *"
                      type="password"
                      value={pwd.current}
                      onChange={e => setPwd(p => ({ ...p, current: e.target.value }))}
                      required
                    />
                    <Input
                      label="New Password *"
                      type="password"
                      value={pwd.newPwd}
                      onChange={e => setPwd(p => ({ ...p, newPwd: e.target.value }))}
                      required
                    />
                    <Input
                      label="Confirm New Password *"
                      type="password"
                      value={pwd.confirm}
                      onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                      required
                    />

                    <div className="flex justify-end border-t border-gray-100 pt-4 mt-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </form>
                </div>
              </CardBody>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-bold text-gray-900">Notification Alerts</h2>
                <p className="text-xs text-gray-500 mt-0.5">Control email notifications and direct socket alerts</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900">Email Notifications</h3>
                  {[
                    { key: 'emailDeals', title: 'New Deal Updates', desc: 'Notify me when collaboration requests are accepted' },
                    { key: 'emailMessages', title: 'Direct Messages', desc: 'Notify me when receiving chat messages offline' },
                    { key: 'emailUpdates', title: 'Platform Newsletters', desc: 'Occasional alerts on new investor entries' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={(notifs as any)[item.key]}
                        onChange={() => setNotifs(n => ({ ...n, [item.key]: !(n as any)[item.key] }))}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-gray-200 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900">Real-Time App Push (Socket.io)</h3>
                  {[
                    { key: 'pushChat', title: 'Real-Time Desktop Chat Alerts', desc: 'Display live toasts on inbound message packets' },
                    { key: 'pushMeetings', title: 'Calendar & WebRTC Calls', desc: 'Live alerts when user initiates a voice/video room' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={(notifs as any)[item.key]}
                        onChange={() => setNotifs(n => ({ ...n, [item.key]: !(n as any)[item.key] }))}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-bold text-gray-900">Interface Appearance</h2>
                <p className="text-xs text-gray-500 mt-0.5">Toggle themes and layout styling parameters</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Choose Dashboard Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'light', name: 'Light Mode', style: 'bg-white border-gray-200 text-gray-800' },
                      { id: 'dark', name: 'Dark Mode (Premium)', style: 'bg-slate-900 border-purple-950 text-white' },
                      { id: 'glass', name: 'Glassmorphism', style: 'bg-purple-900/10 backdrop-blur border-purple-300 text-purple-900' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { setTheme(t.id as any); toast.success(`Switched to ${t.name}`); }}
                        className={`p-5 rounded-2xl border-2 text-left transition-all ${
                          theme === t.id ? 'ring-2 ring-purple-500 scale-[1.02] border-purple-500' : 'border-gray-200'
                        } ${t.style}`}
                      >
                        <span className="text-sm font-bold block">{t.name}</span>
                        <span className="text-[10px] opacity-60 block mt-1">Responsive styling</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {activeTab === 'billing' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-bold text-gray-900">Billing & Pricing Tier</h2>
                <p className="text-xs text-gray-500 mt-0.5">Manage premium plan subscriptions and Stripe billing portals</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white flex flex-wrap justify-between items-center gap-4 border border-white/10">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="accent">PRO MEMBER</Badge>
                      <span className="text-xs text-white/60">Renews Oct 2026</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Nexus Gold Investor License</h3>
                    <p className="text-xs text-white/50">Unlimited collaboration requests, deals, and video rooms</p>
                  </div>
                  <Button variant="accent">Manage with Stripe</Button>
                </div>

                <div className="pt-2">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Subscription Details</h3>
                  <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 text-sm">
                    {[
                      { label: 'Monthly Cost', value: '$49.00 USD' },
                      { label: 'Primary Payment Method', value: 'Visa ending in 4242' },
                      { label: 'Billing Account ID', value: 'usr_cus_stripe_8f3d' },
                    ].map(x => (
                      <div key={x.label} className="flex justify-between p-4">
                        <span className="text-gray-500">{x.label}</span>
                        <span className="font-semibold text-gray-900">{x.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};