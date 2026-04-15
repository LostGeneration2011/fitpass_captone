"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  attendanceAPI,
  classesAPI,
  enrollmentsAPI,
  reviewModerationAPI,
  sessionsAPI,
  transactionsAPI,
  usersAPI,
} from "@/lib/api";

type OverviewStats = {
  totalStudents: number;
  activeStudents90d: number;
  churnedStudents180d: number;
  underEnrolledClasses: number;
  avgClassAttendanceRate: number;
  totalRevenue: number;
  hiddenReviews: number;
  totalTeachers: number;
};

const initialStats: OverviewStats = {
  totalStudents: 0,
  activeStudents90d: 0,
  churnedStudents180d: 0,
  underEnrolledClasses: 0,
  avgClassAttendanceRate: 0,
  totalRevenue: 0,
  hiddenReviews: 0,
  totalTeachers: 0,
};

export default function ReportsOverviewPage() {
  const [stats, setStats] = useState<OverviewStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    setLoading(true);
    setError("");

    try {
      const [usersRes, classesRes, enrollmentsRes, sessionsRes, transactionsRes, reviewsRes] = await Promise.all([
        usersAPI.getAll(),
        classesAPI.getAll(),
        enrollmentsAPI.getAll(),
        sessionsAPI.getAll(),
        transactionsAPI.getAll(),
        reviewModerationAPI.list({ page: 1, limit: 1000, status: "all" }).catch(() => ({ data: [] })),
      ]);

      const users = Array.isArray(usersRes) ? usersRes : usersRes.users || [];
      const classes = Array.isArray(classesRes) ? classesRes : classesRes.classes || [];
      const enrollments = Array.isArray(enrollmentsRes)
        ? enrollmentsRes
        : enrollmentsRes.enrollments || [];
      const sessions = Array.isArray(sessionsRes) ? sessionsRes : sessionsRes.sessions || [];
      const transactionsData = transactionsRes?.data || transactionsRes;
      const transactions = Array.isArray(transactionsData) ? transactionsData : [];
      const reviews = Array.isArray(reviewsRes) ? reviewsRes : reviewsRes.data || [];

      const students = users.filter((user: any) => user.role === "STUDENT");
      const teachers = users.filter((user: any) => user.role === "TEACHER");

      const day90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const day180 = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

      const lastEnrollmentByStudent = new Map<string, Date>();
      enrollments.forEach((enrollment: any) => {
        const current = lastEnrollmentByStudent.get(enrollment.studentId);
        const enrollmentDate = new Date(enrollment.createdAt);
        if (!current || enrollmentDate > current) {
          lastEnrollmentByStudent.set(enrollment.studentId, enrollmentDate);
        }
      });

      const activeStudents90d = students.filter((student: any) => {
        const last = lastEnrollmentByStudent.get(student.id);
        return last && last >= day90;
      }).length;

      const churnedStudents180d = students.filter((student: any) => {
        const last = lastEnrollmentByStudent.get(student.id);
        return !last || last < day180;
      }).length;

      const enrollmentsByClass = new Map<string, number>();
      enrollments.forEach((enrollment: any) => {
        enrollmentsByClass.set(enrollment.classId, (enrollmentsByClass.get(enrollment.classId) || 0) + 1);
      });

      const underEnrolledClasses = classes.filter((classItem: any) => {
        const capacity = classItem.capacity || classItem.maxStudents || 20;
        const enrolled = enrollmentsByClass.get(classItem.id) || 0;
        const fillRate = capacity > 0 ? (enrolled / capacity) * 100 : 0;
        return fillRate < 60;
      }).length;

      const sessionClassMap = new Map<string, string>();
      sessions.forEach((session: any) => {
        sessionClassMap.set(session.id, session.classId);
      });

      const attendanceRes = await attendanceAPI.getBySessionIds(sessions.map((session: any) => session.id));
      const attendances = Array.isArray(attendanceRes) ? attendanceRes : attendanceRes.attendances || [];

      const presentLateByClass = new Map<string, number>();
      attendances.forEach((attendance: any) => {
        const status = attendance.status?.toUpperCase();
        if (status !== "PRESENT" && status !== "LATE") return;
        const classId = sessionClassMap.get(attendance.sessionId);
        if (!classId) return;
        presentLateByClass.set(classId, (presentLateByClass.get(classId) || 0) + 1);
      });

      const sessionsByClass = new Map<string, number>();
      sessions.forEach((session: any) => {
        sessionsByClass.set(session.classId, (sessionsByClass.get(session.classId) || 0) + 1);
      });

      const attendanceRates: number[] = [];
      classes.forEach((classItem: any) => {
        const sessionCount = sessionsByClass.get(classItem.id) || 0;
        const enrolled = enrollmentsByClass.get(classItem.id) || 0;
        const possible = sessionCount * enrolled;
        const attended = presentLateByClass.get(classItem.id) || 0;
        if (possible > 0) {
          attendanceRates.push(Math.round((attended / possible) * 100));
        }
      });

      const avgClassAttendanceRate = attendanceRates.length > 0
        ? Math.round(attendanceRates.reduce((sum, rate) => sum + rate, 0) / attendanceRates.length)
        : 0;

      const totalRevenue = transactions
        .filter((transaction: any) => transaction.status === "COMPLETED")
        .reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0);

      const hiddenReviews = reviews.filter((review: any) => !!review.isHidden).length;

      setStats({
        totalStudents: students.length,
        activeStudents90d,
        churnedStudents180d,
        underEnrolledClasses,
        avgClassAttendanceRate,
        totalRevenue,
        hiddenReviews,
        totalTeachers: teachers.length,
      });
    } catch (err: any) {
      console.error("Failed to load report overview:", err);
      setError(err?.response?.data?.message || "Không thể tải tổng quan báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(stats.totalRevenue),
    [stats.totalRevenue]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải tổng quan báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-950 min-h-screen space-y-8">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-3xl font-bold mb-2">📊 Tổng Quan Báo Cáo</h1>
        <p className="text-indigo-100">
          Một điểm vào duy nhất cho toàn bộ báo cáo vận hành: học viên, lớp học, giáo viên, doanh thu và kiểm duyệt.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border-l-4 border-blue-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Học viên đang hoạt động (90d)</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.activeStudents90d}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Trên tổng {stats.totalStudents} học viên</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border-l-4 border-rose-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Học viên churn (&gt;180d)</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.churnedStudents180d}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border-l-4 border-amber-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Lớp thiếu học viên</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.underEnrolledClasses}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border-l-4 border-emerald-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Doanh thu hoàn thành</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{currency}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Attendance rate TB lớp</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.avgClassAttendanceRate}%</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tổng giáo viên</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalTeachers}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Review đang ẩn</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.hiddenReviews}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Đi tới báo cáo chi tiết</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Link href="/reports/membership" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <p className="font-semibold text-gray-900 dark:text-white">Học viên 360</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Giữ chân, churn, phân khúc và hành vi ghi danh.</p>
          </Link>
          <Link href="/reports/class-analytics" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <p className="font-semibold text-gray-900 dark:text-white">Vận hành lớp học</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fill rate, cảnh báo thiếu học viên, rủi ro điểm danh.</p>
          </Link>
          <Link href="/reports/teacher-statistics" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <p className="font-semibold text-gray-900 dark:text-white">Thống kê giáo viên</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hiệu suất lớp dạy, repeat student và attendance theo giáo viên.</p>
          </Link>
          <Link href="/reports/revenue" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <p className="font-semibold text-gray-900 dark:text-white">Báo cáo doanh thu</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Doanh thu giao dịch, trạng thái thanh toán và xu hướng.</p>
          </Link>
          <Link href="/reports/reviews" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <p className="font-semibold text-gray-900 dark:text-white">Kiểm duyệt đánh giá</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Theo dõi và xử lý review vi phạm nội dung.</p>
          </Link>
          <Link href="/reports/student-insights" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <p className="font-semibold text-gray-900 dark:text-white">Phan tich hoc vien</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nhóm học viên theo mức độ gắn kết, rủi ro rời bỏ và hành vi đăng ký.</p>
          </Link>
          <Link href="/reports/attendance" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <p className="font-semibold text-gray-900 dark:text-white">Bao cao diem danh</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Theo dõi tỷ lệ điểm danh theo từng buổi học và cảnh báo rủi ro.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
