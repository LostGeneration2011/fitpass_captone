"use client";

import { useEffect, useMemo, useState } from "react";
import { classesAPI, enrollmentsAPI, usersAPI } from "@/lib/api";

type Student = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
};

type Enrollment = {
  id: string;
  studentId: string;
  classId: string;
  createdAt: string;
};

type ClassItem = {
  id: string;
  name: string;
  type?: string;
};

type StudentInsightRow = {
  studentId: string;
  studentName: string;
  email: string;
  totalEnrollments: number;
  uniqueClasses: number;
  segment: "NEW" | "ENGAGED" | "AT_RISK" | "CHURNED";
  lastEnrollmentAt: string | null;
  favoriteClassType: string;
};

const asArray = <T,>(payload: any, key: string): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.[key])) return payload[key] as T[];
  if (Array.isArray(payload?.data?.[key])) return payload.data[key] as T[];
  return [];
};

export default function StudentInsightsPage() {
  const [rows, setRows] = useState<StudentInsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [usersRes, enrollmentsRes, classesRes] = await Promise.all([
          usersAPI.getAll(),
          enrollmentsAPI.getAll(),
          classesAPI.getAll(),
        ]);

        const students = asArray<Student>(usersRes, "users").filter((u) => u.role === "STUDENT");
        const enrollments = asArray<Enrollment>(enrollmentsRes, "enrollments");
        const classes = asArray<ClassItem>(classesRes, "classes");

        const classTypeById = new Map<string, string>();
        classes.forEach((cls) => classTypeById.set(cls.id, cls.type || "Khac"));

        const day30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const day90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
        const day180 = Date.now() - 180 * 24 * 60 * 60 * 1000;

        const nextRows: StudentInsightRow[] = students.map((student) => {
          const studentEnrollments = enrollments
            .filter((enrollment) => enrollment.studentId === student.id)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

          const uniqueClassIds = new Set(studentEnrollments.map((item) => item.classId));
          const typeCounter = new Map<string, number>();
          studentEnrollments.forEach((enrollment) => {
            const classType = classTypeById.get(enrollment.classId) || "Khac";
            typeCounter.set(classType, (typeCounter.get(classType) || 0) + 1);
          });

          const favoriteClassType =
            Array.from(typeCounter.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
            "Chua xac dinh";

          const lastEnrollmentAt = studentEnrollments[0]?.createdAt || null;
          const lastEnrollmentTime = lastEnrollmentAt
            ? new Date(lastEnrollmentAt).getTime()
            : 0;

          let segment: StudentInsightRow["segment"] = "CHURNED";
          if (new Date(student.createdAt).getTime() >= day30) {
            segment = "NEW";
          } else if (lastEnrollmentTime >= day90) {
            segment = "ENGAGED";
          } else if (lastEnrollmentTime >= day180) {
            segment = "AT_RISK";
          }

          return {
            studentId: student.id,
            studentName: student.fullName || student.email,
            email: student.email,
            totalEnrollments: studentEnrollments.length,
            uniqueClasses: uniqueClassIds.size,
            segment,
            lastEnrollmentAt,
            favoriteClassType,
          };
        });

        nextRows.sort((a, b) => b.totalEnrollments - a.totalEnrollments);
        setRows(nextRows);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Khong the tai bao cao hoc vien");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchedKeyword =
        !keyword ||
        row.studentName.toLowerCase().includes(keyword) ||
        row.email.toLowerCase().includes(keyword);

      if (!matchedKeyword) return false;

      if (!startDate && !endDate) return true;
      if (!row.lastEnrollmentAt) return false;

      const lastTime = new Date(row.lastEnrollmentAt).getTime();
      if (Number.isNaN(lastTime)) return false;

      if (startDate) {
        const startTime = new Date(startDate).getTime();
        if (!Number.isNaN(startTime) && lastTime < startTime) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();
        if (!Number.isNaN(endTime) && lastTime > endTime) return false;
      }

      return true;
    });
  }, [rows, search, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRows.length / pageSize));
  }, [filteredRows.length]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage]);

  const summary = useMemo(() => {
    const totals = {
      totalStudents: filteredRows.length,
      engaged: filteredRows.filter((row) => row.segment === "ENGAGED").length,
      atRisk: filteredRows.filter((row) => row.segment === "AT_RISK").length,
      churned: filteredRows.filter((row) => row.segment === "CHURNED").length,
      avgEnrollments:
        filteredRows.length > 0
          ? Math.round(
              (filteredRows.reduce((sum, row) => sum + row.totalEnrollments, 0) / filteredRows.length) * 10
            ) / 10
          : 0,
    };
    return totals;
  }, [filteredRows]);

  const segmentText = (segment: StudentInsightRow["segment"]) => {
    if (segment === "NEW") return "Moi";
    if (segment === "ENGAGED") return "Gan ket";
    if (segment === "AT_RISK") return "Co nguy co";
    return "Roi bo";
  };

  const downloadCSV = () => {
    const headers = [
      "Hoc vien",
      "Email",
      "Phan khuc",
      "So lan dang ky",
      "So lop khac nhau",
      "Loai lop yeu thich",
      "Lan dang ky gan nhat",
    ];

    const rowsCsv = filteredRows.map((row) => [
      row.studentName,
      row.email,
      segmentText(row.segment),
      String(row.totalEnrollments),
      String(row.uniqueClasses),
      row.favoriteClassType,
      row.lastEnrollmentAt ? new Date(row.lastEnrollmentAt).toLocaleDateString("vi-VN") : "Khong co",
    ]);

    const csv = [
      headers.join(","),
      ...rowsCsv.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")),
    ].join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
    element.setAttribute("download", `bao-cao-student-insights-${new Date().toISOString().split("T")[0]}.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const segmentBadge = (segment: StudentInsightRow["segment"]) => {
    if (segment === "NEW") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    if (segment === "ENGAGED") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    if (segment === "AT_RISK") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Dang tai bao cao hoc vien...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-950 min-h-screen space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Phan tich hoc vien</h1>
        <p className="text-gray-600 dark:text-gray-400">Tong hop hanh vi dang ky va muc do gan ket cua hoc vien.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tong hoc vien</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{summary.totalStudents}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Gan ket</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{summary.engaged}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Co nguy co</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">{summary.atRisk}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Roi bo</p>
          <p className="text-2xl font-bold text-rose-600 mt-2">{summary.churned}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">TB lan dang ky</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{summary.avgEnrollments}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tim kiem</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ten hoc vien hoac email..."
              className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tu ngay</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Den ngay</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
          >
            Xuat CSV
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Segment</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Enrollments</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Unique Classes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Favorite Class Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Last Enrollment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  Khong co du lieu phu hop.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr key={row.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/70">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.studentName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{row.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${segmentBadge(row.segment)}`}>
                      {segmentText(row.segment)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">{row.totalEnrollments}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">{row.uniqueClasses}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{row.favoriteClassType}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {row.lastEnrollmentAt ? new Date(row.lastEnrollmentAt).toLocaleDateString("vi-VN") : "Khong co"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Hien thi {filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRows.length)} / {filteredRows.length} dong
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Truoc
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">Trang {currentPage}/{totalPages}</span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
