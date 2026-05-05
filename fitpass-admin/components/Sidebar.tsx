'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { forceLogout } from '@/lib/auth';
import {
  HomeIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  CubeIcon,
  UsersIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const menuItems = [
  { name: 'Bảng điều khiển', href: '/dashboard', icon: HomeIcon },
  { name: 'Lớp học', href: '/classes', icon: AcademicCapIcon },
  { name: 'Buổi học', href: '/sessions', icon: CalendarDaysIcon },
  { name: 'Phòng học', href: '/rooms', icon: BuildingOfficeIcon },
  { name: 'Ghi danh', href: '/enrollments', icon: UserGroupIcon },
  { name: 'Điểm danh', href: '/attendance', icon: ClipboardDocumentCheckIcon },
  { name: 'Người dùng', href: '/users', icon: UsersIcon },
  { name: 'Gói tập', href: '/packages', icon: CubeIcon },
  { name: 'Gói của người dùng', href: '/user-packages', icon: CreditCardIcon },
  { name: 'Giao dịch', href: '/transactions', icon: CreditCardIcon },
  { name: 'Lương giáo viên', href: '/teacher-salary', icon: BanknotesIcon },
  { name: 'Contact Chat', href: '/chat', icon: ClipboardDocumentCheckIcon },
  { name: 'Forum cộng đồng', href: '/forum', icon: ClipboardDocumentCheckIcon },
];

const reportItems = [
  { name: 'Tổng quan báo cáo', href: '/reports', icon: ChartBarIcon },
  { name: 'Báo cáo doanh thu', href: '/reports/revenue', icon: CreditCardIcon },
  { name: 'Học viên 360', href: '/reports/membership', icon: UserGroupIcon },
  { name: 'Vận hành lớp học', href: '/reports/class-analytics', icon: AcademicCapIcon },
  { name: 'Thống kê giáo viên', href: '/reports/teacher-statistics', icon: ChartBarIcon },
  { name: 'Kiểm duyệt đánh giá', href: '/reports/reviews', icon: ClipboardDocumentCheckIcon },
  { name: 'Báo cáo điểm danh', href: '/reports/attendance', icon: ClipboardDocumentCheckIcon },
  { name: 'Phân tích học viên', href: '/reports/student-insights', icon: UserGroupIcon },
];

interface SidebarProps {
  isOpen?: boolean;
  toggleSidebar?: () => void;
}

export default function Sidebar({ isOpen = false, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 z-30 flex h-screen w-72 flex-col overflow-y-auto
        bg-white dark:bg-gray-900 shadow-xl border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center justify-center py-6 px-6 bg-gradient-to-r from-purple-600 to-blue-600">
          <Link href="/dashboard">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-white/20">
                <span className="text-2xl font-bold text-white">F</span>
              </div>
              <div className="text-white">
                <div className="text-xl font-bold">FitPass</div>
                <div className="text-sm opacity-90">Bảng điều khiển Admin</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 py-6">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link 
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Reports Section */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              📊 Báo cáo
            </h3>
            <div className="space-y-2 mt-3">
              {reportItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link 
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Logout */}
          <div className="mt-8">
            <button 
              onClick={forceLogout}
              className="group flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}