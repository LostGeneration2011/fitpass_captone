"use client";

import { useEffect, useState } from "react";
import { classesAPI, enrollmentsAPI, usersAPI } from "@/lib/api";

type Student360Stat = {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  newStudents30d: number;
  avgEnrollmentsPerStudent: number;
  retentionRate: number;
  churnRate: number;
  repeatEnrollmentRate: number;
};

type StudentDetail = {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
  enrollmentCount: number;
  uniqueClassCount: number;
  favoriteClassType: string;
  lastEnrollmentDate: string | null;
  status: "ACTIVE" | "INACTIVE";
  segment: "NEW" | "RETAINED" | "AT_RISK" | "CHURNED";
};

type UserItem = {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
  role: string;
};

type EnrollmentItem = {
  id: string;
  studentId: string;
  classId: string;
  createdAt: string;
};

type ClassItem = {
  id: string;
  type?: string;
};

export default function MembershipAnalyticsPage() {
  const [stats, setStats] = useState<Student360Stat>({
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    newStudents30d: 0,
    avgEnrollmentsPerStudent: 0,
    retentionRate: 0,
    churnRate: 0,
    repeatEnrollmentRate: 0,
  });
  const [studentDetails, setStudentDetails] = useState<StudentDetail[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "NEW" | "RETAINED" | "AT_RISK" | "CHURNED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchMembershipData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [studentDetails, statusFilter, searchTerm]);

  const fetchMembershipData = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, enrollmentsRes, classesRes] = await Promise.all([
        usersAPI.getAll(),
        enrollmentsAPI.getAll(),
        classesAPI.getAll(),
      ]);

      const users = Array.isArray(usersRes) ? usersRes : usersRes.users || [];
      const enrollments = Array.isArray(enrollmentsRes)
        ? enrollmentsRes
        : enrollmentsRes.enrollments || [];
      const classes = Array.isArray(classesRes) ? classesRes : classesRes.classes || [];
      const classTypeMap = new Map<string, string>();
      classes.forEach((cls: ClassItem) => {
        classTypeMap.set(cls.id, cls.type || "Khác");
      });

      const students = users.filter((u: UserItem) => u.role === 'STUDENT');
      const totalStudents = students.length;
      const now = new Date();
      const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const day90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const day180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      let newStudents30d = 0;
      let repeatStudents = 0;
      const studentDetailsMap: { [key: string]: StudentDetail } = {};

      students.forEach((student: UserItem) => {
        const enrollmentList = (enrollments as EnrollmentItem[]).filter(
          (e: EnrollmentItem) => e.studentId === student.id
        );

        const sortedEnrollments = [...enrollmentList].sort((a: EnrollmentItem, b: EnrollmentItem) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        const lastEnrollment = sortedEnrollments[0] || null;

        const isActive = Boolean(lastEnrollment && new Date(lastEnrollment.createdAt) >= day90);

        const classTypeCounter = new Map<string, number>();
        const uniqueClassIds = new Set<string>();
        sortedEnrollments.forEach((enrollment) => {
          uniqueClassIds.add(enrollment.classId);
          const classType = classTypeMap.get(enrollment.classId) || "Khác";
          classTypeCounter.set(classType, (classTypeCounter.get(classType) || 0) + 1);
        });

        const favoriteClassType = Array.from(classTypeCounter.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

        let segment: StudentDetail["segment"] = "CHURNED";
        if (new Date(student.createdAt) >= day30) {
          segment = "NEW";
        } else if (isActive && sortedEnrollments.length >= 2) {
          segment = "RETAINED";
        } else if (lastEnrollment && new Date(lastEnrollment.createdAt) >= day180) {
          segment = "AT_RISK";
        }

        if (sortedEnrollments.length >= 2) {
          repeatStudents += 1;
        }

        studentDetailsMap[student.id] = {
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          createdAt: student.createdAt,
          enrollmentCount: sortedEnrollments.length,
          uniqueClassCount: uniqueClassIds.size,
          favoriteClassType,
          lastEnrollmentDate: lastEnrollment?.createdAt || null,
          status: isActive ? "ACTIVE" : "INACTIVE",
          segment,
        };

        if (new Date(student.createdAt) >= day30) {
          newStudents30d += 1;
        }
      });

      const activeCount = Object.values(studentDetailsMap).filter(
        (s: StudentDetail) => s.status === "ACTIVE"
      ).length;

      const totalEnrollments = (enrollments as EnrollmentItem[]).length;
      const avgEnrollmentsPerStudent = totalStudents > 0
        ? Math.round((totalEnrollments / totalStudents) * 10) / 10
        : 0;

      const retentionRate = totalStudents > 0
        ? Math.round((activeCount / totalStudents) * 100)
        : 0;

      const churnedCount = Object.values(studentDetailsMap).filter(
        (student) => student.segment === "CHURNED"
      ).length;

      const churnRate = totalStudents > 0
        ? Math.round((churnedCount / totalStudents) * 100)
        : 0;

      const repeatEnrollmentRate = totalStudents > 0
        ? Math.round((repeatStudents / totalStudents) * 100)
        : 0;

      setStats({
        totalStudents,
        activeStudents: activeCount,
        inactiveStudents: totalStudents - activeCount,
        newStudents30d,
        avgEnrollmentsPerStudent,
        retentionRate,
        churnRate,
        repeatEnrollmentRate,
      });

      setStudentDetails(Object.values(studentDetailsMap));
    } catch (err: any) {
      console.error('Error fetching membership data:', err);
      setError(err?.response?.data?.message || "Failed to fetch membership data");
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = studentDetails;

    if (statusFilter !== "ALL") {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (segmentFilter !== "ALL") {
      filtered = filtered.filter((s) => s.segment === segmentFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  };

  const downloadCSV = () => {
    const headers = ['Học viên', 'Email', 'Lần tạo tài khoản', 'Số lần đăng ký', 'Số lớp khác nhau', 'Loại lớp ưu tiên', 'Lần cuối đăng ký', 'Trạng thái', 'Phân khúc'];
    const rows = filteredStudents.map(student => [
      student.fullName,
      student.email,
      new Date(student.createdAt).toLocaleDateString('vi-VN'),
      student.enrollmentCount,
      student.uniqueClassCount,
      student.favoriteClassType,
      student.lastEnrollmentDate
        ? new Date(student.lastEnrollmentDate).toLocaleDateString('vi-VN')
        : 'N/A',
      student.status,
      student.segment,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `membership-report-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  };

  const getStatusText = (status: string) => {
    return status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động';
  };

  const getSegmentBadge = (segment: StudentDetail['segment']) => {
    switch (segment) {
      case 'NEW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'RETAINED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'AT_RISK':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
    }
  };

  const getSegmentText = (segment: StudentDetail['segment']) => {
    switch (segment) {
      case 'NEW':
        return 'Mới';
      case 'RETAINED':
        return 'Giữ chân tốt';
      case 'AT_RISK':
        return 'Có rủi ro';
      default:
        return 'Đã churn';
    }
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">👥 Học Viên 360</h1>
        <p className="text-gray-600 dark:text-gray-400">Một màn duy nhất để theo dõi vòng đời học viên: tăng trưởng, giữ chân, churn và hành vi ghi danh.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Students */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-blue-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Tổng Học Viên</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalStudents}</p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">Tổng số tài khoản học viên</p>
        </div>

        {/* Active Students */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-green-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Hoạt Động</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.activeStudents}</p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
            {stats.totalStudents > 0
              ? Math.round((stats.activeStudents / stats.totalStudents) * 100)
              : 0}% hoạt động
          </p>
        </div>

        {/* Retention Rate */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-purple-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Tỷ Lệ Giữ Chân</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.retentionRate}%</p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">Có ghi danh trong 90 ngày gần nhất</p>
        </div>

        {/* Churn Rate */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-red-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Tỷ Lệ Churn</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.churnRate}%</p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">Không ghi danh hơn 180 ngày</p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Học viên mới 30 ngày</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.newStudents30d}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Không Hoạt Động</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.inactiveStudents}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Trung Bình Đăng Ký / HV</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.avgEnrollmentsPerStudent}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Tỷ lệ học viên quay lại</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.repeatEnrollmentRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8 border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bộ Lọc</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tìm kiếm</label>
            <input
              type="text"
              placeholder="Tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Không hoạt động</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phân khúc</label>
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              <option value="NEW">Mới</option>
              <option value="RETAINED">Giữ chân tốt</option>
              <option value="AT_RISK">Có rủi ro</option>
              <option value="CHURNED">Đã churn</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={downloadCSV}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              📥 Tải CSV
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Danh sách học viên ({filteredStudents.length})
          </h2>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">Không có học viên nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Học Viên</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Email</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Số Lần Ghi Danh</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Số Lớp Khác Nhau</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Loại Lớp Ưa Thích</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Lần Cuối</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Trạng Thái</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Phân Khúc</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/70">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{student.fullName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.email}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{student.enrollmentCount}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900 dark:text-gray-100">{student.uniqueClassCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.favoriteClassType}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {student.lastEnrollmentDate
                        ? new Date(student.lastEnrollmentDate).toLocaleDateString('vi-VN')
                        : 'Chưa có'}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                        {getStatusText(student.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSegmentBadge(student.segment)}`}>
                        {getSegmentText(student.segment)}
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
