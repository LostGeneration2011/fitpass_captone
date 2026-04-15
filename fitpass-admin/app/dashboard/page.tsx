'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { classesAPI, sessionsAPI, usersAPI, transactionsAPI } from '@/lib/api';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  ChartBarIcon,
  CreditCardIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalClasses: number;
  totalSessions: number;
  totalStudents: number;
  todayAttendance: number;
}

interface PerformanceMetrics {
  studentSatisfaction: number;
  attendanceRate: number;
  avgSessionsPerWeek: number;
}

interface RevenueMetrics {
  totalRevenue: number;
  completedTransactions: number;
  pendingTransactions: number;
}

interface ChartData {
  revenueTrend: Array<{ date: string; revenue: number; transactions: number }>;
  classPopularity: Array<{ name: string; students: number; sessions: number }>;
  attendanceTrend: Array<{ date: string; attendance: number; rate: number }>;
}

interface MetricDelta {
  change: string;
  changeColor: string;
  changeLabel: string;
  trend: 'up' | 'down' | 'neutral';
}

const neutralDelta: MetricDelta = {
  change: '0%',
  changeColor: 'text-slate-600 dark:text-slate-400',
  changeLabel: 'tháng này so với tháng trước',
  trend: 'neutral',
};

function getMonthOverMonthDelta(currentValue: number, previousValue: number): MetricDelta {
  if (currentValue === 0 && previousValue === 0) {
    return neutralDelta;
  }

  if (previousValue === 0) {
    return {
      change: currentValue > 0 ? '+100%' : '0%',
      changeColor: 'text-emerald-600 dark:text-emerald-400',
      changeLabel: 'tháng này so với tháng trước',
      trend: currentValue > 0 ? 'up' : 'neutral',
    };
  }

  const deltaPercent = Math.round(((currentValue - previousValue) / previousValue) * 100);

  if (deltaPercent === 0) {
    return neutralDelta;
  }

  return {
    change: `${deltaPercent > 0 ? '+' : ''}${deltaPercent}%`,
    changeColor: deltaPercent > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400',
    changeLabel: 'tháng này so với tháng trước',
    trend: deltaPercent > 0 ? 'up' : 'down',
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClasses: 0,
    totalSessions: 0,
    totalStudents: 0,
    todayAttendance: 0,
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    studentSatisfaction: 0,
    attendanceRate: 0,
    avgSessionsPerWeek: 0,
  });
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics>({
    totalRevenue: 0,
    completedTransactions: 0,
    pendingTransactions: 0,
  });
  const [chartData, setChartData] = useState<ChartData>({
    revenueTrend: [],
    classPopularity: [],
    attendanceTrend: [],
  });
  const [metricDeltas, setMetricDeltas] = useState<Record<string, MetricDelta>>({
    classes: neutralDelta,
    sessions: neutralDelta,
    students: neutralDelta,
    attendance: neutralDelta,
    revenue: neutralDelta,
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🚀 Dashboard: Starting fetchDashboardData...');
      
      // Fetch all data in parallel with better error handling
      const [classesRes, sessionsRes, usersRes, transactionsRes] = await Promise.allSettled([
        classesAPI.getAll(),
        sessionsAPI.getAll(),
        usersAPI.getAll(),
        transactionsAPI.getAll(),
      ]);
      
      console.log('📊 Dashboard API Results:', {
        classes: classesRes.status,
        sessions: sessionsRes.status,
        users: usersRes.status,
        transactions: transactionsRes.status
      });
      
      // Handle results with fallbacks
      const classes = classesRes.status === 'fulfilled' 
        ? (classesRes.value?.classes || classesRes.value || [])
        : [];
      const sessions = sessionsRes.status === 'fulfilled'
        ? (sessionsRes.value?.sessions || sessionsRes.value || [])
        : [];
      const users = usersRes.status === 'fulfilled'
        ? (usersRes.value?.users || usersRes.value || [])
        : [];
      const transactions = transactionsRes.status === 'fulfilled'
        ? (transactionsRes.value?.data || transactionsRes.value || [])
        : [];
        
      console.log('📈 Dashboard Data:', { 
        classesCount: classes.length,
        sessionsCount: sessions.length,
        usersCount: users.length 
      });

      const students = users.filter((u: any) => u.role === 'STUDENT');
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const isInCurrentMonth = (dateInput?: string) => {
        if (!dateInput) return false;
        const date = new Date(dateInput);
        return date >= currentMonthStart;
      };

      const isInPreviousMonth = (dateInput?: string) => {
        if (!dateInput) return false;
        const date = new Date(dateInput);
        return date >= previousMonthStart && date < currentMonthStart;
      };

      // Calculate today's attendance
      const today = new Date().toDateString();
      const todaySessions = sessions.filter((s: any) => {
        const sessionDate = new Date(s.startTime || s.createdAt).toDateString();
        return sessionDate === today;
      });

      let todayAttendanceCount = 0;
      todaySessions.forEach((session: any) => {
        if (session._count?.attendances) {
          todayAttendanceCount += session._count.attendances;
        }
      });

      // Calculate Performance Metrics
      const completedSessions = sessions.filter((s: any) => s.status === 'DONE' || s.status === 'COMPLETED');
      const totalPossibleAttendees = completedSessions.length * students.length;
      
      // Calculate attendance rate from actual data
      let totalAttendances = 0;
      sessions.forEach((session: any) => {
        if (session._count?.attendances) {
          totalAttendances += session._count.attendances;
        }
      });
      
      const attendanceRate = totalPossibleAttendees > 0 
        ? Math.round((totalAttendances / totalPossibleAttendees) * 100) 
        : 0;

      // Calculate average sessions per week
      const currentDate = new Date();
      const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisWeekSessions = sessions.filter((s: any) => {
        const sessionDate = new Date(s.startTime || s.createdAt);
        return sessionDate >= oneWeekAgo && sessionDate <= currentDate;
      });
      
      // Student satisfaction - calculated based on attendance consistency
      // High attendance rate = high satisfaction (simplified metric)
      const studentSatisfaction = Math.min(95, Math.max(60, attendanceRate + 10));

      // Calculate Revenue Metrics
      const completedTransactions = transactions.filter((t: any) => t.status === 'COMPLETED');
      const totalRevenue = completedTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const pendingCount = transactions.filter((t: any) => t.status === 'PENDING').length;
      
      // Get recent 5 transactions sorted by date
      const sortedTransactions = [...transactions].sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setRecentTransactions(sortedTransactions.slice(0, 5));

      setStats({
        totalClasses: classes.length,
        totalSessions: sessions.length,
        totalStudents: students.length,
        todayAttendance: todayAttendanceCount,
      });

      setPerformanceMetrics({
        studentSatisfaction: Math.round(studentSatisfaction),
        attendanceRate: attendanceRate,
        avgSessionsPerWeek: thisWeekSessions.length,
      });

      setRevenueMetrics({
        totalRevenue,
        completedTransactions: completedTransactions.length,
        pendingTransactions: pendingCount,
      });

      const currentMonthAttendance = sessions.reduce((sum: number, session: any) => {
        const sessionDate = session.startTime || session.createdAt;
        return isInCurrentMonth(sessionDate)
          ? sum + (session._count?.attendances || 0)
          : sum;
      }, 0);

      const previousMonthAttendance = sessions.reduce((sum: number, session: any) => {
        const sessionDate = session.startTime || session.createdAt;
        return isInPreviousMonth(sessionDate)
          ? sum + (session._count?.attendances || 0)
          : sum;
      }, 0);

      const currentMonthRevenue = completedTransactions.reduce((sum: number, transaction: any) => {
        return isInCurrentMonth(transaction.createdAt) ? sum + (transaction.amount || 0) : sum;
      }, 0);

      const previousMonthRevenue = completedTransactions.reduce((sum: number, transaction: any) => {
        return isInPreviousMonth(transaction.createdAt) ? sum + (transaction.amount || 0) : sum;
      }, 0);

      setMetricDeltas({
        classes: getMonthOverMonthDelta(
          classes.filter((item: any) => isInCurrentMonth(item.createdAt)).length,
          classes.filter((item: any) => isInPreviousMonth(item.createdAt)).length,
        ),
        sessions: getMonthOverMonthDelta(
          sessions.filter((item: any) => isInCurrentMonth(item.startTime || item.createdAt)).length,
          sessions.filter((item: any) => isInPreviousMonth(item.startTime || item.createdAt)).length,
        ),
        students: getMonthOverMonthDelta(
          students.filter((item: any) => isInCurrentMonth(item.createdAt)).length,
          students.filter((item: any) => isInPreviousMonth(item.createdAt)).length,
        ),
        attendance: getMonthOverMonthDelta(currentMonthAttendance, previousMonthAttendance),
        revenue: getMonthOverMonthDelta(currentMonthRevenue, previousMonthRevenue),
      });

      // Calculate Chart Data
      // 1. Revenue Trend (last 7 days)
      const revenueTrendData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
        
        const dayTransactions = completedTransactions.filter((t: any) => {
          const tDate = new Date(t.createdAt);
          return tDate.toDateString() === date.toDateString();
        });
        
        const dayRevenue = dayTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        
        revenueTrendData.push({
          date: dateStr,
          revenue: Math.round(dayRevenue / 1000), // Convert to thousands
          transactions: dayTransactions.length,
        });
      }

      // 2. Class Popularity (top 5 classes by enrollments)
      const classPopularityMap = new Map();
      classes.forEach((cls: any) => {
        const enrollmentCount = cls._count?.enrollments || 0;
        const sessionCount = cls._count?.sessions || 0;
        classPopularityMap.set(cls.id, {
          name: cls.name || 'Unnamed Class',
          students: enrollmentCount,
          sessions: sessionCount,
        });
      });
      
      const classPopularityData = Array.from(classPopularityMap.values())
        .sort((a, b) => b.students - a.students)
        .slice(0, 5);

      // 3. Attendance Trend (last 7 days)
      const attendanceTrendData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
        
        const daySessions = sessions.filter((s: any) => {
          const sDate = new Date(s.startTime || s.createdAt);
          return sDate.toDateString() === date.toDateString();
        });
        
        let dayAttendance = 0;
        daySessions.forEach((session: any) => {
          if (session._count?.attendances) {
            dayAttendance += session._count.attendances;
          }
        });
        
        const possibleAttendees = daySessions.length * Math.max(students.length, 1);
        const rate = possibleAttendees > 0 ? Math.round((dayAttendance / possibleAttendees) * 100) : 0;
        
        attendanceTrendData.push({
          date: dateStr,
          attendance: dayAttendance,
          rate: rate,
        });
      }

      setChartData({
        revenueTrend: revenueTrendData,
        classPopularity: classPopularityData,
        attendanceTrend: attendanceTrendData,
      });
    } catch (error) {
      console.error('❌ Dashboard API Error:', error);
      // Set fallback values on error
      setStats({
        totalClasses: 0,
        totalSessions: 0,
        totalStudents: 0,
        todayAttendance: 0,
      });
      setPerformanceMetrics({
        studentSatisfaction: 0,
        attendanceRate: 0,
        avgSessionsPerWeek: 0,
      });
      setRevenueMetrics({
        totalRevenue: 0,
        completedTransactions: 0,
        pendingTransactions: 0,
      });
      setMetricDeltas({
        classes: neutralDelta,
        sessions: neutralDelta,
        students: neutralDelta,
        attendance: neutralDelta,
        revenue: neutralDelta,
      });
    } finally {
      console.log('✅ Dashboard: setLoading(false)');
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Tổng số lớp',
      value: stats.totalClasses,
      icon: AcademicCapIcon,
      gradient: 'from-violet-500 to-purple-600',
      bgColor: 'from-violet-50 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30',
      iconBg: 'bg-gradient-to-r from-violet-500 to-purple-600',
      change: metricDeltas.classes.change,
      changeColor: metricDeltas.classes.changeColor,
      changeLabel: metricDeltas.classes.changeLabel,
      trend: metricDeltas.classes.trend,
    },
    {
      title: 'Tổng số buổi',
      value: stats.totalSessions,
      icon: CalendarDaysIcon,
      gradient: 'from-blue-500 to-cyan-600',
      bgColor: 'from-blue-50 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30',
      iconBg: 'bg-gradient-to-r from-blue-500 to-cyan-600',
      change: metricDeltas.sessions.change,
      changeColor: metricDeltas.sessions.changeColor,
      changeLabel: metricDeltas.sessions.changeLabel,
      trend: metricDeltas.sessions.trend,
    },
    {
      title: 'Tổng số học viên',
      value: stats.totalStudents,
      icon: UserGroupIcon,
      gradient: 'from-emerald-500 to-teal-600',
      bgColor: 'from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30',
      iconBg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
      change: metricDeltas.students.change,
      changeColor: metricDeltas.students.changeColor,
      changeLabel: metricDeltas.students.changeLabel,
      trend: metricDeltas.students.trend,
    },
    {
      title: 'Điểm danh hôm nay',
      value: stats.todayAttendance,
      icon: ClipboardDocumentCheckIcon,
      gradient: 'from-amber-500 to-orange-600',
      bgColor: 'from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30',
      iconBg: 'bg-gradient-to-r from-amber-500 to-orange-600',
      change: metricDeltas.attendance.change,
      changeColor: metricDeltas.attendance.changeColor,
      changeLabel: metricDeltas.attendance.changeLabel,
      trend: metricDeltas.attendance.trend,
    },
    {
      title: 'Tổng doanh thu',
      value: `${(revenueMetrics.totalRevenue / 1000000).toFixed(1)}M ₫`,
      icon: CreditCardIcon,
      gradient: 'from-rose-500 to-pink-600',
      bgColor: 'from-rose-50 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30',
      iconBg: 'bg-gradient-to-r from-rose-500 to-pink-600',
      change: metricDeltas.revenue.change,
      changeColor: metricDeltas.revenue.changeColor,
      changeLabel: metricDeltas.revenue.changeLabel,
      trend: metricDeltas.revenue.trend,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
          <div className="mt-4 text-center text-gray-600 dark:text-gray-400">Đang tải bảng điều khiển...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Enhanced Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
                <SparklesIcon className="h-8 w-8 text-yellow-300" />
                Chào mừng quay lại, {user?.fullName || 'Admin'}!
              </h1>
              <p className="text-purple-100 text-lg">Quản lý trung tâm của bạn tại đây. Hôm nay có vẻ đầy hứa hẹn! 🚀</p>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <ChartBarIcon className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-yellow-300/20 rounded-full blur-lg"></div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {(Array.isArray(statsCards) ? statsCards : []).map((card, index) => {
          const Icon = card.icon;
          const TrendIcon = card.trend === 'down'
            ? ArrowTrendingDownIcon
            : card.trend === 'up'
            ? ArrowTrendingUpIcon
            : ChartBarIcon;
          return (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.bgColor} p-6 shadow-lg border border-white/20 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                    {card.value}
                  </p>
                  <div className="flex items-center">
                    <span className={`text-sm font-semibold ${card.changeColor} flex items-center gap-1`}>
                      <TrendIcon className="h-4 w-4" />
                      {card.change}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-300 ml-2">{card.changeLabel}</span>
                  </div>
                </div>
                <div className={`${card.iconBg} p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Layout - Quick Actions & System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enhanced Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-2xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-2 rounded-xl">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Thao tác nhanh</h3>
          </div>
          <div className="space-y-4">
            <a 
              href="/classes" 
              className="group flex items-center p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 transition-all duration-300 border border-purple-200/50"
            >
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform shadow-lg">
                <AcademicCapIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-purple-700 dark:text-purple-300 font-semibold text-lg">Quản lý lớp học</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Tạo và sắp xếp lớp luyện tập</p>
              </div>
            </a>
            <a 
              href="/sessions" 
              className="group flex items-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30 transition-all duration-300 border border-blue-200/50"
            >
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform shadow-lg">
                <CalendarDaysIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300 font-semibold text-lg">Xem lịch buổi học</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Lên lịch và theo dõi buổi học</p>
              </div>
            </a>
            <a 
              href="/enrollments" 
              className="group flex items-center p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 transition-all duration-300 border border-emerald-200/50"
            >
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform shadow-lg">
                <UserGroupIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold text-lg">Quản lý ghi danh</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Đăng ký học viên</p>
              </div>
            </a>
            <a 
              href="/attendance" 
              className="group flex items-center p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 transition-all duration-300 border border-amber-200/50"
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform shadow-lg">
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-amber-700 dark:text-amber-300 font-semibold text-lg">Xem điểm danh</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">Theo dõi sự tham gia của học viên</p>
              </div>
            </a>
          </div>
        </div>

        {/* Enhanced System Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-2xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-2 rounded-xl">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tổng quan hệ thống</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500 p-2 rounded-lg">
                  <AcademicCapIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">Lớp đang hoạt động</span>
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">{stats.totalClasses}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <CalendarDaysIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-blue-700 dark:text-blue-300 font-medium">Buổi đã lên lịch</span>
              </div>
              <span className="font-bold text-xl text-blue-900 dark:text-blue-100">{stats.totalSessions}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-lg">
                  <UserGroupIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">Học viên đã ghi danh</span>
              </div>
              <span className="font-bold text-xl text-emerald-900 dark:text-emerald-100">{stats.totalStudents}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl border border-amber-200/50 dark:border-amber-700/50">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 p-2 rounded-lg">
                  <ClipboardDocumentCheckIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-amber-700 dark:text-amber-300 font-medium">Điểm danh hôm nay</span>
              </div>
              <span className="font-bold text-xl text-amber-900 dark:text-amber-100">{stats.todayAttendance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights Section */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
          <SparklesIcon className="h-6 w-6 text-purple-600" />
          Hiệu suất tổng quan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <div className="text-2xl font-bold text-purple-600">
              {loading ? '...' : `${performanceMetrics.studentSatisfaction}%`}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">Mức độ hài lòng học viên</div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {loading ? '' : performanceMetrics.studentSatisfaction === 0 ? 'Chưa có dữ liệu' : 'Dựa trên xu hướng điểm danh'}
            </div>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? '...' : `${performanceMetrics.attendanceRate}%`}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">Tỷ lệ điểm danh</div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {loading ? '' : performanceMetrics.attendanceRate === 0 ? 'Chưa có buổi nào' : 'Từ dữ liệu thực tế'}
            </div>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '...' : performanceMetrics.avgSessionsPerWeek}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">Số buổi/tuần trung bình</div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {loading ? '' : performanceMetrics.avgSessionsPerWeek === 0 ? 'Chưa có buổi gần đây' : 'Dữ liệu tuần này'}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
              Xu hướng doanh thu (7 ngày)
            </h3>
            <span className="text-sm text-gray-600 dark:text-gray-300">đơn vị: nghìn ₫</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
                name="Doanh thu (nghìn ₫)"
              />
              <Line 
                type="monotone" 
                dataKey="transactions" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                name="Giao dịch"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Class Popularity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6 text-purple-600" />
            Lớp dẫn đầu theo lượt ghi danh
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.classPopularity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '11px' }} angle={-15} textAnchor="end" height={80} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="students" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Học viên" />
              <Bar dataKey="sessions" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Buổi học" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCardIcon className="h-6 w-6 text-rose-600" />
            Giao dịch gần đây
          </h3>
          <a href="/transactions" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">
            Xem tất cả →
          </a>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CreditCardIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Chưa có giao dịch</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(Array.isArray(recentTransactions) ? recentTransactions : []).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {tx.user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{tx.user?.fullName || 'Chưa rõ người dùng'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString('vi-VN', { 
                        day: '2-digit', 
                        month: 'short', 
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    {(tx.amount || 0).toLocaleString('vi-VN')}₫
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    tx.status === 'COMPLETED' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : tx.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Trend Chart - Full Width */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-600" />
            Xu hướng điểm danh (7 ngày)
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Lượt điểm danh</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Tỷ lệ (%)</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData.attendanceTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="left" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px'
              }}
            />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="attendance" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 5 }}
              activeDot={{ r: 7 }}
              name="Lượt điểm danh"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="rate" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              name="Tỷ lệ (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}