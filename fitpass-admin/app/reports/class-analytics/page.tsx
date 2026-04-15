"use client";

import { useEffect, useState } from "react";
import { classesAPI, sessionsAPI, enrollmentsAPI, attendanceAPI } from "@/lib/api";

type ClassOperationsStat = {
  classId: string;
  className: string;
  capacity: number;
  totalEnrolled: number;
  fillRate: number;
  recentEnrollments30d: number;
  totalSessions: number;
  attendedCount: number;
  attendanceRate: number;
  underEnrolled: boolean;
  overbookRisk: boolean;
  lowAttendanceRisk: boolean;
  status: string;
};

type ClassItem = {
  id: string;
  name: string;
  status: string;
  capacity?: number;
  maxStudents?: number;
};

type SessionItem = {
  id: string;
  classId: string;
  startTime: string;
};

type EnrollmentItem = {
  id: string;
  classId: string;
  studentId: string;
  createdAt: string;
};

type AttendanceItem = {
  id: string;
  sessionId: string;
  status: string;
};

const sortStats = (
  stats: ClassOperationsStat[],
  sortBy: "attendance" | "fill" | "enrollment" | "risk" | "name"
) => {
  const list = [...stats];
  if (sortBy === "attendance") {
    list.sort((a, b) => b.attendanceRate - a.attendanceRate);
  } else if (sortBy === "fill") {
    list.sort((a, b) => b.fillRate - a.fillRate);
  } else if (sortBy === "enrollment") {
    list.sort((a, b) => b.totalEnrolled - a.totalEnrolled);
  } else if (sortBy === "risk") {
    const score = (item: ClassOperationsStat) => {
      let risk = 0;
      if (item.underEnrolled) risk += 2;
      if (item.lowAttendanceRisk) risk += 2;
      if (item.overbookRisk) risk += 1;
      return risk;
    };
    list.sort((a, b) => score(b) - score(a));
  } else {
    list.sort((a, b) => a.className.localeCompare(b.className));
  }
  return list;
};

export default function ClassAnalyticsPage() {
  const [classStats, setClassStats] = useState<ClassOperationsStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<"attendance" | "fill" | "enrollment" | "risk" | "name">("risk");

  useEffect(() => {
    fetchClassAnalytics();
  }, []);

  useEffect(() => {
    setClassStats((prev) => sortStats(prev, sortBy));
  }, [sortBy]);

  const fetchClassAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const [classesRes, sessionsRes, enrollmentsRes] = await Promise.all([
        classesAPI.getAll(),
        sessionsAPI.getAll(),
        enrollmentsAPI.getAll(),
      ]);

      const classes = Array.isArray(classesRes) ? classesRes : classesRes.classes || [];
      const sessions = Array.isArray(sessionsRes) ? sessionsRes : sessionsRes.sessions || [];
      const enrollments = Array.isArray(enrollmentsRes)
        ? enrollmentsRes
        : enrollmentsRes.enrollments || [];

      const statsMap: { [key: string]: ClassOperationsStat } = {};
      const enrollmentsByClass: { [key: string]: EnrollmentItem[] } = {};
      const day30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      classes.forEach((cls: ClassItem) => {
        const capacity = cls.capacity || cls.maxStudents || 20;
        statsMap[cls.id] = {
          classId: cls.id,
          className: cls.name,
          capacity,
          status: cls.status,
          totalEnrolled: 0,
          fillRate: 0,
          recentEnrollments30d: 0,
          totalSessions: 0,
          attendedCount: 0,
          attendanceRate: 0,
          underEnrolled: false,
          overbookRisk: false,
          lowAttendanceRisk: false,
        };
        enrollmentsByClass[cls.id] = [];
      });

      enrollments.forEach((enrollment: EnrollmentItem) => {
        if (statsMap[enrollment.classId]) {
          enrollmentsByClass[enrollment.classId].push(enrollment);
        }
      });

      Object.entries(enrollmentsByClass).forEach(([classId, classEnrollments]) => {
        if (!statsMap[classId]) return;
        statsMap[classId].totalEnrolled = classEnrollments.length;
        statsMap[classId].recentEnrollments30d = classEnrollments.filter((item) => new Date(item.createdAt) >= day30).length;
        statsMap[classId].fillRate = Math.round((classEnrollments.length / statsMap[classId].capacity) * 100);
      });

      const sessionClassMap = new Map<string, string>();
      sessions.forEach((session: SessionItem) => {
        if (!statsMap[session.classId]) return;
        statsMap[session.classId].totalSessions += 1;
        sessionClassMap.set(session.id, session.classId);
      });

      const sessionIds = sessions.map((session: SessionItem) => session.id);
      const attendanceRes = await attendanceAPI.getBySessionIds(sessionIds);
      const attendanceList: AttendanceItem[] = Array.isArray(attendanceRes)
        ? attendanceRes
        : attendanceRes.attendances || [];

      attendanceList.forEach((attendance: AttendanceItem) => {
        const status = attendance.status?.toUpperCase();
        if (status !== 'PRESENT' && status !== 'LATE') return;
        const classId = sessionClassMap.get(attendance.sessionId);
        if (!classId || !statsMap[classId]) return;
        statsMap[classId].attendedCount += 1;
      });

      Object.values(statsMap).forEach((stat) => {
        const possibleAttendances = stat.totalSessions * stat.totalEnrolled;
        if (possibleAttendances > 0) {
          stat.attendanceRate = Math.round((stat.attendedCount / possibleAttendances) * 100);
        }

        stat.underEnrolled = stat.fillRate < 60;
        stat.overbookRisk = stat.fillRate >= 90 && stat.recentEnrollments30d >= 2;
        stat.lowAttendanceRisk = stat.attendanceRate > 0 && stat.attendanceRate < 65;
      });

      setClassStats(sortStats(Object.values(statsMap), sortBy));
    } catch (err: any) {
      console.error('Error fetching class analytics:', err);
      setError(err?.response?.data?.message || "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = ['Lớp học', 'Sức chứa', 'Đã đăng ký', 'Fill rate %', 'Ghi danh 30 ngày', 'Tổng buổi', 'Điểm danh hợp lệ', 'Tỷ lệ điểm danh %', 'Rủi ro', 'Trạng thái'];
    const rows = classStats.map(stat => [
      stat.className,
      stat.capacity,
      stat.totalEnrolled,
      stat.fillRate,
      stat.recentEnrollments30d,
      stat.totalSessions,
      stat.attendedCount,
      stat.attendanceRate,
      [
        stat.underEnrolled ? 'UNDER_ENROLLED' : '',
        stat.lowAttendanceRisk ? 'LOW_ATTENDANCE' : '',
        stat.overbookRisk ? 'OVERBOOK_RISK' : '',
      ].filter(Boolean).join('|') || 'NORMAL',
      stat.status,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `class-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Đã phê duyệt';
      case 'PENDING':
        return 'Chờ phê duyệt';
      case 'REJECTED':
        return 'Từ chối';
      default:
        return status;
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    if (rate >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  };

  const getFillRateColor = (rate: number) => {
    if (rate >= 85) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (rate >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">🏫 Thống Kê Vận Hành Lớp Học</h1>
        <p className="text-gray-600 dark:text-gray-400">Tập trung vào năng lực vận hành: fill rate, cảnh báo lớp thiếu học viên, rủi ro quá tải và rủi ro điểm danh.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-blue-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Tổng Lớp Học</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{classStats.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-green-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Lớp cần tăng ghi danh</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {classStats.filter(c => c.underEnrolled).length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-yellow-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Rủi ro điểm danh thấp</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {classStats.filter(c => c.lowAttendanceRisk).length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-purple-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Rủi ro quá tải</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {classStats.filter(c => c.overbookRisk).length}
          </p>
        </div>
      </div>

      {/* Filter & Export */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8 border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sắp xếp theo</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="risk">Mức độ rủi ro</option>
              <option value="attendance">Tỷ lệ điểm danh</option>
              <option value="fill">Fill rate</option>
              <option value="enrollment">Số lượng đăng ký</option>
              <option value="name">Tên lớp (A-Z)</option>
            </select>
          </div>
          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            📥 Tải CSV
          </button>
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chi tiết lớp học</h2>
        </div>

        {classStats.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">Không có lớp học nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Lớp Học</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Sức Chứa</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Đã Đăng Ký</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Fill Rate</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Ghi Danh 30 Ngày</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Buổi Tập</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Điểm Danh Hợp Lệ</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Tỷ Lệ Điểm Danh</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Cảnh Báo</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {classStats.map((stat) => (
                  <tr key={stat.classId} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/70">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{stat.className}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{stat.capacity}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{stat.totalEnrolled}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 rounded-full font-semibold ${getFillRateColor(stat.fillRate)}`}>
                        {stat.fillRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{stat.recentEnrollments30d}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{stat.totalSessions}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{stat.attendedCount}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 rounded-full font-semibold ${getAttendanceColor(stat.attendanceRate)}`}>
                        {stat.attendanceRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {stat.underEnrolled && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">Thiếu học viên</span>
                        )}
                        {stat.lowAttendanceRisk && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Điểm danh thấp</span>
                        )}
                        {stat.overbookRisk && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Sắp quá tải</span>
                        )}
                        {!stat.underEnrolled && !stat.lowAttendanceRisk && !stat.overbookRisk && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Ổn định</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(stat.status)}`}>
                        {getStatusText(stat.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
