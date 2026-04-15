"use client";

import { useEffect, useMemo, useState } from "react";
import {
  attendanceAPI,
  classesAPI,
  enrollmentsAPI,
  reviewModerationAPI,
  sessionsAPI,
  usersAPI,
} from "@/lib/api";

type TeacherKpi = {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  classCount: number;
  completedClassCount: number;
  activeClassCount: number;
  upcomingClassCount: number;
  sessionsThisWeek: number;
  totalSessions: number;
  sessionsDone: number;
  totalStudents: number;
  repeatStudents: number;
  repeatStudentRate: number;
  avgAttendanceRate: number;
  avgRating: number;
  reviewCount: number;
  lowAttendanceClasses: number;
};

type SortKey = "students" | "repeat" | "attendance" | "rating" | "sessions";

export default function TeacherStatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("students");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFullMetrics, setShowFullMetrics] = useState(false);
  const [teacherStats, setTeacherStats] = useState<TeacherKpi[]>([]);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setLoading(true);
    setError("");

    try {
      const [usersRes, classesRes, sessionsRes, enrollmentsRes, reviewsRes] = await Promise.all([
        usersAPI.getAll(),
        classesAPI.getAll(),
        sessionsAPI.getAll(),
        enrollmentsAPI.getAll(),
        reviewModerationAPI.list({ limit: 1000, status: "all" }).catch(() => ({ data: [] })),
      ]);

      const users = Array.isArray(usersRes) ? usersRes : usersRes.users || [];
      const classes = Array.isArray(classesRes) ? classesRes : classesRes.classes || [];
      const sessions = Array.isArray(sessionsRes) ? sessionsRes : sessionsRes.sessions || [];
      const enrollments = Array.isArray(enrollmentsRes)
        ? enrollmentsRes
        : enrollmentsRes.enrollments || [];
      const reviews = Array.isArray(reviewsRes) ? reviewsRes : reviewsRes.data || [];

      const teachers = users.filter((user: any) => user.role === "TEACHER");

      const classesByTeacher = new Map<string, any[]>();
      classes.forEach((classItem: any) => {
        if (!classItem.teacherId) return;
        if (!classesByTeacher.has(classItem.teacherId)) {
          classesByTeacher.set(classItem.teacherId, []);
        }
        classesByTeacher.get(classItem.teacherId)?.push(classItem);
      });

      const classTeacherMap = new Map<string, string>();
      classes.forEach((classItem: any) => {
        if (classItem.teacherId) {
          classTeacherMap.set(classItem.id, classItem.teacherId);
        }
      });

      const sessionIds = sessions.map((session: any) => session.id);
      const attendanceRes = await attendanceAPI.getBySessionIds(sessionIds);
      const attendances = Array.isArray(attendanceRes)
        ? attendanceRes
        : attendanceRes.attendances || [];

      const sessionClassMap = new Map<string, string>();
      sessions.forEach((session: any) => {
        sessionClassMap.set(session.id, session.classId);
      });

      const sessionByClass = new Map<string, any[]>();
      sessions.forEach((session: any) => {
        if (!sessionByClass.has(session.classId)) {
          sessionByClass.set(session.classId, []);
        }
        sessionByClass.get(session.classId)?.push(session);
      });

      const enrollmentsByClass = new Map<string, any[]>();
      enrollments.forEach((enrollment: any) => {
        if (!enrollmentsByClass.has(enrollment.classId)) {
          enrollmentsByClass.set(enrollment.classId, []);
        }
        enrollmentsByClass.get(enrollment.classId)?.push(enrollment);
      });

      const presentLateByClass = new Map<string, number>();
      attendances.forEach((attendance: any) => {
        const status = attendance.status?.toUpperCase();
        if (status !== "PRESENT" && status !== "LATE") return;
        const classId = sessionClassMap.get(attendance.sessionId);
        if (!classId) return;
        presentLateByClass.set(classId, (presentLateByClass.get(classId) || 0) + 1);
      });

      const reviewByTeacher = new Map<string, { sum: number; count: number }>();
      reviews.forEach((review: any) => {
        const teacherId = review.teacher?.id || review.teacherId;
        if (!teacherId) return;
        if (!reviewByTeacher.has(teacherId)) {
          reviewByTeacher.set(teacherId, { sum: 0, count: 0 });
        }
        const current = reviewByTeacher.get(teacherId)!;
        current.sum += Number(review.rating || 0);
        current.count += 1;
      });

      const stats: TeacherKpi[] = teachers.map((teacher: any) => {
        const teacherClasses = classesByTeacher.get(teacher.id) || [];
        const teacherClassIds = new Set(teacherClasses.map((item: any) => item.id));
        const teacherSessions = sessions.filter((session: any) => {
          const classId = session.classId;
          return classTeacherMap.get(classId) === teacher.id;
        });

        const now = new Date();
        const day = now.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + mondayOffset);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const totalSessions = teacherSessions.length;
        const sessionsThisWeek = teacherSessions.filter((session: any) => {
          const startTime = new Date(session.startTime);
          return startTime >= weekStart && startTime <= weekEnd;
        }).length;

        const sessionsDone = teacherSessions.filter((session: any) => {
          return session.status?.toUpperCase() === "DONE";
        }).length;

        let completedClassCount = 0;
        let activeClassCount = 0;
        let upcomingClassCount = 0;

        teacherClassIds.forEach((classId) => {
          const classSessions = sessionByClass.get(classId) || [];
          const hasActive = classSessions.some((session: any) => session.status?.toUpperCase() === "ACTIVE");
          const hasUpcoming = classSessions.some((session: any) => session.status?.toUpperCase() === "UPCOMING");
          const hasDone = classSessions.some((session: any) => session.status?.toUpperCase() === "DONE");
          const allClosed = classSessions.length > 0 && classSessions.every((session: any) => {
            const status = session.status?.toUpperCase();
            return status === "DONE" || status === "CANCELLED";
          });

          if (hasActive) {
            activeClassCount += 1;
            return;
          }

          if (hasUpcoming) {
            upcomingClassCount += 1;
            return;
          }

          if (hasDone && allClosed) {
            completedClassCount += 1;
          }
        });

        const studentClassCount = new Map<string, number>();
        teacherClassIds.forEach((classId) => {
          const classEnrollments = enrollmentsByClass.get(classId) || [];
          classEnrollments.forEach((enrollment: any) => {
            studentClassCount.set(enrollment.studentId, (studentClassCount.get(enrollment.studentId) || 0) + 1);
          });
        });

        const totalStudents = studentClassCount.size;
        const repeatStudents = Array.from(studentClassCount.values()).filter((count) => count >= 2).length;
        const repeatStudentRate = totalStudents > 0 ? Math.round((repeatStudents / totalStudents) * 100) : 0;

        let totalPossibleAttendances = 0;
        let totalAttended = 0;
        let lowAttendanceClasses = 0;

        teacherClassIds.forEach((classId) => {
          const classSessions = sessionByClass.get(classId) || [];
          const enrolledCount = (enrollmentsByClass.get(classId) || []).length;
          const attended = presentLateByClass.get(classId) || 0;

          totalAttended += attended;
          totalPossibleAttendances += classSessions.length * enrolledCount;

          const classAttendanceRate = classSessions.length * enrolledCount > 0
            ? Math.round((attended / (classSessions.length * enrolledCount)) * 100)
            : 0;

          if (classAttendanceRate > 0 && classAttendanceRate < 65) {
            lowAttendanceClasses += 1;
          }
        });

        const avgAttendanceRate = totalPossibleAttendances > 0
          ? Math.round((totalAttended / totalPossibleAttendances) * 100)
          : 0;

        const review = reviewByTeacher.get(teacher.id);
        const avgRating = review && review.count > 0
          ? Math.round((review.sum / review.count) * 10) / 10
          : 0;

        return {
          teacherId: teacher.id,
          teacherName: teacher.fullName || teacher.email,
          teacherEmail: teacher.email,
          classCount: teacherClasses.length,
          completedClassCount,
          activeClassCount,
          upcomingClassCount,
          sessionsThisWeek,
          totalSessions,
          sessionsDone,
          totalStudents,
          repeatStudents,
          repeatStudentRate,
          avgAttendanceRate,
          avgRating,
          reviewCount: review?.count || 0,
          lowAttendanceClasses,
        };
      });

      setTeacherStats(stats);
    } catch (err: any) {
      console.error("Error loading teacher statistics:", err);
      setError(err?.response?.data?.message || "Không thể tải thống kê giáo viên");
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = teacherStats.filter((item) => {
      if (!normalizedSearch) return true;
      return (
        item.teacherName.toLowerCase().includes(normalizedSearch) ||
        item.teacherEmail.toLowerCase().includes(normalizedSearch)
      );
    });

    const sorted = [...filtered];
    if (sortBy === "students") sorted.sort((a, b) => b.totalStudents - a.totalStudents);
    if (sortBy === "repeat") sorted.sort((a, b) => b.repeatStudentRate - a.repeatStudentRate);
    if (sortBy === "attendance") sorted.sort((a, b) => b.avgAttendanceRate - a.avgAttendanceRate);
    if (sortBy === "rating") sorted.sort((a, b) => b.avgRating - a.avgRating);
    if (sortBy === "sessions") sorted.sort((a, b) => b.totalSessions - a.totalSessions);

    return sorted;
  }, [teacherStats, sortBy, searchTerm]);

  const summary = useMemo(() => {
    const totalTeachers = teacherStats.length;
    const avgRepeatRate = totalTeachers > 0
      ? Math.round(teacherStats.reduce((sum, item) => sum + item.repeatStudentRate, 0) / totalTeachers)
      : 0;
    const avgAttendanceRate = totalTeachers > 0
      ? Math.round(teacherStats.reduce((sum, item) => sum + item.avgAttendanceRate, 0) / totalTeachers)
      : 0;
    const atRiskTeachers = teacherStats.filter((item) => item.lowAttendanceClasses > 0).length;
    const totalClasses = teacherStats.reduce((sum, item) => sum + item.classCount, 0);
    const completedClasses = teacherStats.reduce((sum, item) => sum + item.completedClassCount, 0);
    const activeClasses = teacherStats.reduce((sum, item) => sum + item.activeClassCount, 0);
    const upcomingClasses = teacherStats.reduce((sum, item) => sum + item.upcomingClassCount, 0);
    const weeklySessions = teacherStats.reduce((sum, item) => sum + item.sessionsThisWeek, 0);
    const totalSessions = teacherStats.reduce((sum, item) => sum + item.totalSessions, 0);

    return {
      totalTeachers,
      avgRepeatRate,
      avgAttendanceRate,
      atRiskTeachers,
      totalClasses,
      completedClasses,
      activeClasses,
      upcomingClasses,
      weeklySessions,
      totalSessions,
    };
  }, [teacherStats]);

  const attendanceBadge = (rate: number) => {
    if (rate >= 80) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    if (rate >= 65) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
  };

  const classStateBadge = (value: number, kind: "done" | "active" | "upcoming") => {
    if (kind === "done") {
      return value > 0
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
    if (kind === "active") {
      return value > 0
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
    return value > 0
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải thống kê giáo viên...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-950 min-h-screen space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">👨‍🏫 Thống Kê Giáo Viên</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Theo dõi hiệu suất giáo viên theo tiến độ lớp học, khối lượng buổi dạy và mức độ tham gia của học viên.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border-l-4 border-indigo-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tổng giáo viên</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summary.totalTeachers}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border-l-4 border-blue-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tổng số lớp</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summary.totalClasses}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border-l-4 border-emerald-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Lớp đã hoàn thành</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summary.completedClasses}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border-l-4 border-rose-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Lớp đang giảng dạy</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summary.activeClasses}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border-l-4 border-amber-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Lớp sắp giảng dạy</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summary.upcomingClasses}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border-l-4 border-cyan-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Buổi trong tuần</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summary.weeklySessions}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border-l-4 border-violet-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tổng số buổi</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summary.totalSessions}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border-l-4 border-fuchsia-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">GV cần hỗ trợ</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summary.atRiskTeachers}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tìm giáo viên</label>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tên hoặc email..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sắp xếp theo</label>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortKey)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="students">Tổng học viên</option>
              <option value="repeat">Tỷ lệ học viên quay lại</option>
              <option value="attendance">Tỷ lệ điểm danh</option>
              <option value="rating">Điểm đánh giá</option>
              <option value="sessions">Tổng số buổi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hiển thị chỉ số</label>
            <button
              onClick={() => setShowFullMetrics((prev) => !prev)}
              className="h-10 w-full px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              {showFullMetrics ? "Thu gọn chỉ số" : "Hiện đầy đủ chỉ số"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bảng hiệu suất giáo viên ({filteredAndSorted.length})</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {showFullMetrics
              ? "Đang hiển thị đầy đủ chỉ số. Cuộn ngang để xem toàn bộ cột."
              : "Đang ở chế độ gọn (ẩn bớt cột phụ). Bấm Hiện đầy đủ chỉ số để xem chi tiết."}
          </p>
        </div>

        {filteredAndSorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Không có dữ liệu giáo viên</div>
        ) : (
          <div className="overflow-x-auto [scrollbar-width:thin]">
            <table className={`w-full ${showFullMetrics ? "min-w-[1480px]" : "min-w-[1260px]"}`}>
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
                <tr>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-700 dark:text-gray-300 sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 min-w-[250px] shadow-[4px_0_8px_-6px_rgba(0,0,0,0.35)]">Giáo viên</th>
                  <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Tổng số lớp</th>
                  <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Lớp đã hoàn thành</th>
                  <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Đang giảng dạy</th>
                  <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Sắp giảng dạy</th>
                  <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Buổi tuần này</th>
                  <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Tổng số buổi</th>
                  {showFullMetrics && (
                    <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Buổi hoàn thành</th>
                  )}
                  <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Tổng học viên</th>
                  {showFullMetrics && (
                    <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Học viên quay lại</th>
                  )}
                  <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Tỷ lệ quay lại</th>
                  <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Tỷ lệ điểm danh</th>
                  {showFullMetrics && (
                    <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Đánh giá</th>
                  )}
                  <th className="px-3 py-3 text-center text-[12px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((item, index) => (
                  <tr key={item.teacherId} className={`border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/70 ${index % 2 === 1 ? "bg-gray-50/40 dark:bg-gray-900/40" : ""}`}>
                    <td className="px-4 py-4 text-sm sticky left-0 z-10 bg-white dark:bg-gray-900 shadow-[4px_0_8px_-6px_rgba(0,0,0,0.25)]">
                      <div className="font-medium text-gray-900 dark:text-white">{item.teacherName}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{item.teacherEmail}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-center font-semibold text-gray-900 dark:text-gray-100">{item.classCount}</td>
                    <td className="px-3 py-4 text-sm text-center">
                      <span className={`inline-flex min-w-[40px] justify-center px-2 py-1 rounded-full text-xs font-semibold ${classStateBadge(item.completedClassCount, "done")}`}>
                        {item.completedClassCount}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-center">
                      <span className={`inline-flex min-w-[40px] justify-center px-2 py-1 rounded-full text-xs font-semibold ${classStateBadge(item.activeClassCount, "active")}`}>
                        {item.activeClassCount}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-center">
                      <span className={`inline-flex min-w-[40px] justify-center px-2 py-1 rounded-full text-xs font-semibold ${classStateBadge(item.upcomingClassCount, "upcoming")}`}>
                        {item.upcomingClassCount}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{item.sessionsThisWeek}</td>
                    <td className="px-3 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{item.totalSessions}</td>
                    {showFullMetrics && (
                      <td className="px-3 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{item.sessionsDone}</td>
                    )}
                    <td className="px-3 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{item.totalStudents}</td>
                    {showFullMetrics && (
                      <td className="px-3 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{item.repeatStudents}</td>
                    )}
                    <td className="px-3 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{item.repeatStudentRate}%</td>
                    <td className="px-3 py-4 text-sm text-center">
                      <span className={`px-3 py-1 rounded-full font-semibold ${attendanceBadge(item.avgAttendanceRate)}`}>
                        {item.avgAttendanceRate}%
                      </span>
                    </td>
                    {showFullMetrics && (
                      <td className="px-3 py-4 text-sm text-center text-gray-900 dark:text-gray-100">
                        {item.reviewCount > 0 ? `${item.avgRating} (${item.reviewCount})` : "Chưa có"}
                      </td>
                    )}
                    <td className="px-3 py-4 text-sm text-center">
                      {item.lowAttendanceClasses > 0 ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                          {item.lowAttendanceClasses} lớp điểm danh thấp
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          Ổn định
                        </span>
                      )}
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
