import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home, Building2, CircleDollarSign, Users, MessageCircle,
  Bell, FileText, Settings, HelpCircle, Calendar,
  CreditCard, Video, ChevronLeft, ChevronRight, Handshake
} from 'lucide-react';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  collapsed?: boolean;
  badge?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, text, collapsed, badge }) => {
  return (
    <NavLink
      to={to}
      title={collapsed ? text : undefined}
      className={({ isActive }) =>
        `flex items-center rounded-xl transition-all duration-200 group relative ${
          collapsed ? 'p-3 justify-center' : 'py-2.5 px-3'
        } ${
          isActive
            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="ml-3 text-sm font-medium">{text}</span>}
      {badge !== undefined && badge > 0 && (
        <span className={`${collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {/* Tooltip for collapsed state */}
      {collapsed && (
        <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          {text}
        </span>
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const entrepreneurItems = [
    { to: '/dashboard/entrepreneur', icon: <Home size={20} />, text: 'Dashboard' },
    { to: '/profile/entrepreneur/' + user.id, icon: <Building2 size={20} />, text: 'My Startup' },
    { to: '/investors', icon: <CircleDollarSign size={20} />, text: 'Find Investors' },
    { to: '/meetings', icon: <Calendar size={20} />, text: 'Meetings' },
    { to: '/documents', icon: <FileText size={20} />, text: 'Document Vault' },
    { to: '/payments', icon: <CreditCard size={20} />, text: 'Payments' },
    { to: '/chat', icon: <MessageCircle size={20} />, text: 'Messages' },
    { to: '/notifications', icon: <Bell size={20} />, text: 'Notifications' },
  ];

  const investorItems = [
    { to: '/dashboard/investor', icon: <Home size={20} />, text: 'Dashboard' },
    { to: '/profile/investor/' + user.id, icon: <CircleDollarSign size={20} />, text: 'My Portfolio' },
    { to: '/entrepreneurs', icon: <Users size={20} />, text: 'Find Startups' },
    { to: '/meetings', icon: <Calendar size={20} />, text: 'Meetings' },
    { to: '/deals', icon: <Handshake size={20} />, text: 'Deals' },
    { to: '/payments', icon: <CreditCard size={20} />, text: 'Payments' },
    { to: '/documents', icon: <FileText size={20} />, text: 'Document Vault' },
    { to: '/chat', icon: <MessageCircle size={20} />, text: 'Messages' },
    { to: '/notifications', icon: <Bell size={20} />, text: 'Notifications' },
  ];

  const adminItems = [
    { to: '/dashboard/admin', icon: <Home size={20} />, text: 'Admin Portal' },
    { to: '/entrepreneurs', icon: <Users size={20} />, text: 'Moderation Feed' },
    { to: '/meetings', icon: <Calendar size={20} />, text: 'Meetings Log' },
    { to: '/payments', icon: <CreditCard size={20} />, text: 'Ledger Audit' },
    { to: '/chat', icon: <MessageCircle size={20} />, text: 'Messages' },
    { to: '/notifications', icon: <Bell size={20} />, text: 'Broadcasts' },
  ];

  const sidebarItems = 
    user.role === 'admin' 
      ? adminItems 
      : user.role === 'entrepreneur' 
      ? entrepreneurItems 
      : investorItems;

  const commonItems = [
    { to: '/settings', icon: <Settings size={20} />, text: 'Settings' },
    { to: '/help', icon: <HelpCircle size={20} />, text: 'Help & Support' },
  ];

  return (
    <div
      className={`bg-white h-full border-r border-gray-100 hidden md:flex flex-col transition-all duration-300 shadow-sm ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Collapse Toggle */}
      <div className="flex justify-end px-3 pt-4 pb-2">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Branding (when expanded) */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Nexus</p>
              <p className="text-gray-400 text-xs capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {sidebarItems.map((item, index) => (
          <SidebarItem
            key={index}
            to={item.to}
            icon={item.icon}
            text={item.text}
            collapsed={collapsed}
          />
        ))}

        <div className={`${collapsed ? 'py-2' : 'my-3 border-t border-gray-100'}`} />

        {!collapsed && (
          <p className="px-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Account
          </p>
        )}
        {commonItems.map((item, index) => (
          <SidebarItem
            key={index}
            to={item.to}
            icon={item.icon}
            text={item.text}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* User Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <span className="text-purple-600 font-bold text-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};