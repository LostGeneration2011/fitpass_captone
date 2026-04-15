"use client";

import { useEffect, useMemo, useState } from "react";
import { attendanceAPI, classesAPI, enrollmentsAPI, sessionsAPI } from "@/lib/api";

type SessionItem = {
  id: string;
  classId: string;
  startTime: string;
  status: string;
};

type ClassItem = {
  id: string;
  name: string;
};

type Enrollment = {
  id: string;
  classId: string;
  studentId: string;
};

type Attendance = {
  id: string;
  sessionId: string;
  studentId: string;
  status: string;
};

type SessionAttendanceRow = {
  sessionId: string;
  className: string;
  startTime: string;
  expectedStudents: number;
  presentLate: number;
  absent: number;
  attendanceRate: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

const asArray = <T,>(payload: any, key: string): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.[key])) return payload[key] as T[];
  if (Array.isArray(payload?.data?.[key])) return payload.data[key] as T[];
  return [];
};

export default function AttendanceReportPage() {
  const [rows, setRows] = useState<SessionAttendanceRow[]>([]);
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
        const [sessionsRes, classesRes, enrollmentsRes] = await Promise.all([
          sessionsAPI.getAll(),
          classesAPI.getAll(),
          enrollmentsAPI.getAll(),
        ]);

        const sessions = asArray<SessionItem>(sessionsRes, "sessions");
        const classes = asArray<ClassItem>(classesRes, "classes");
        const enrollments = asArray<Enrollment>(enrollmentsRes, "enrollments");

        const classNameById = new Map<string, string>();
        classes.forEach((cls) => classNameById.set(cls.id, cls.name));

        const enrolledByClass = new Map<string, Set<string>>();
        enrollments.forEach((enrollment) => {
          if (!enrolledByClass.has(enrollment.classId)) {
            enrolledByClass.set(enrollment.classId, new Set<string>());
          }
          enrolledByClass.get(enrollment.classId)?.add(enrollment.studentId);
        });

        const sessionIds = sessions.map((session) => session.id);
        const bulkAttendance = await attendanceAPI.getBySessionIds(sessionIds);
        const attendances = asArray<Attendance>(bulkAttendance, "attendances");

        const attendanceBySession = new Map<string, Attendance[]>();
        attendances.forEach((attendance) => {
          if (!attendanceBySession.has(attendance.sessionId)) {
            attendanceBySession.set(attendance.sessionId, []);
          }
          attendanceBySession.get(attendance.sessionId)?.push(attendance);
        });

        const nextRows: SessionAttendanceRow[] = sessions.map((session) => {
          const expectedStudents = enrolledByClass.get(session.classId)?.size || 0;
          const sessionAttendances = attendanceBySession.get(session.id) || [];

          const presentLate = sessionAttendances.filter((item) => {
            const normalized = item.status?.toUpperCase();
            return normalized === "PRESENT" || normalized === "LATE";
          }).length;

          const absent = sessionAttendances.filter((item) => item.status?.toUpperCase() === "ABSENT").length;

          const attendanceRate = expectedStudents > 0
            ? Math.round((presentLate / expectedStudents) * 100)
            : 0;

          let riskLevel: SessionAttendanceRow["riskLevel"] = "LOW";
          if (attendanceRate < 55) riskLevel = "HIGH";
          else if (attendanceRate < 75) riskLevel = "MEDIUM";

          return {
            sessionId: session.id,
            className: classNameById.get(session.classId) || "Lop khong xac dinh",
            startTime: session.startTime,
            expectedStudents,
            presentLate,
            absent,
            attendanceRate,
            riskLevel,
          };
        });

        nextRows.sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        setRows(nextRows);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Khong the tai bao cao diem danh");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchedKeyword = !keyword || row.className.toLowerCase().includes(keyword);
      if (!matchedKeyword) return false;

      if (!startDate && !endDate) return true;

      const sessionTime = new Date(row.startTime).getTime();
      if (Number.isNaN(sessionTime)) return false;

      if (startDate) {
        const startTime = new Date(startDate).getTime();
        if (!Number.isNaN(startTime) && sessionTime < startTime) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();
        if (!Number.isNaN(endTime) && sessionTime > endTime) return false;
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
    const totalSessions = filteredRows.length;
    const avgRate =
      totalSessions > 0
        ? Math.round(filteredRows.reduce((sum, row) => sum + row.attendanceRate, 0) / totalSessions)
        : 0;
    const highRisk = filteredRows.filter((row) => row.riskLevel === "HIGH").length;
    const mediumRisk = filteredRows.filter((row) => row.riskLevel === "MEDIUM").length;
    return { totalSessions, avgRate, highRisk, mediumRisk };
  }, [filteredRows]);

  const riskText = (risk: SessionAttendanceRow["riskLevel"]) => {
    if (risk === "HIGH") return "Cao";
    if (risk === "MEDIUM") return "Trung binh";
    return "Thap";
  };

  const downloadCSV = () => {
    const headers = [
      "Lop",
      "Thoi gian buoi hoc",
      "So hoc vien du kien",
      "Co mat/di tre",
      "Vang mat",
      "Ty le diem danh",
      "Muc rui ro",
    ];

    const rowsCsv = filteredRows.map((row) => [
      row.className,
      new Date(row.startTime).toLocaleString("vi-VN"),
      String(row.expectedStudents),
      String(row.presentLate),
      String(row.absent),
      `${row.attendanceRate}%`,
      riskText(row.riskLevel),
    ]);

    const csv = [
      headers.join(","),
      ...rowsCsv.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")),
    ].join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
    element.setAttribute("download", `bao-cao-diem-danh-${new Date().toISOString().split("T")[0]}.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const riskBadge = (risk: SessionAttendanceRow["riskLevel"]) => {
    if (risk === "HIGH") return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
    if (risk === "MEDIUM") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Dang tai bao cao diem danh...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-950 min-h-screen space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Bao cao diem danh</h1>
        <p className="text-gray-600 dark:text-gray-400">Theo doi chat luong diem danh theo tung buoi hoc va canh bao rui ro.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tong buoi hoc</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{summary.totalSessions}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Ty le diem danh TB</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{summary.avgRate}%</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Buoi hoc rui ro cao</p>
          <p className="text-2xl font-bold text-rose-600 mt-2">{summary.highRisk}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Buoi hoc rui ro TB</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">{summary.mediumRisk}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tim lop</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhap ten lop..."
              className="w-full md:w-80 px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tu ngay</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Den ngay</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lop</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Thoi gian</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Du kien</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Co mat/Di tre</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vang</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ty le</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rui ro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  Khong co du lieu phu hop.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr key={row.sessionId} className="hover:bg-gray-50 dark:hover:bg-gray-800/70">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{row.className}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{new Date(row.startTime).toLocaleString("vi-VN")}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">{row.expectedStudents}</td>
                  <td className="px-6 py-4 text-sm text-right text-emerald-700 dark:text-emerald-300">{row.presentLate}</td>
                  <td className="px-6 py-4 text-sm text-right text-rose-700 dark:text-rose-300">{row.absent}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">{row.attendanceRate}%</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${riskBadge(row.riskLevel)}`}>
                      {riskText(row.riskLevel)}
                    </span>
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
