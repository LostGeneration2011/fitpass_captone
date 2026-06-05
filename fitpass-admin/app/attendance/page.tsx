"use client";

import { useEffect, useState } from "react";
import { sessionsAPI, classesAPI, usersAPI, attendanceAPI } from "@/lib/api";

type AttendanceItem = {
  id: string;
  studentId: string;
  status: "PRESENT" | "ABSENT";
  checkedInAt: string | null;
  student?: { id: string; fullName?: string; email?: string };
  session?: {
    id: string;
    startTime: string;
    endTime?: string;
    class?: { id: string; name: string };
  };
};

type SessionItem = {
  id: string;
  classId: string;
  startTime: string;
};

type ClassItem = { id: string; name: string };
type UserItem = { id: string; fullName?: string; email?: string };

export default function AttendancePage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [quickRange, setQuickRange] = useState<"" | "today" | "month">("");
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{ id: string; status: "PRESENT" | "ABSENT" }>({ id: "", status: "ABSENT" });

  const fetchMeta = async () => {
    setError("");
    try {
      const [sessionsRes, classesRes, usersRes] = await Promise.all([
        sessionsAPI.getAll(),
        classesAPI.getAll().catch(() => []),
        usersAPI.getAll().catch(() => []),
      ]);
      const sessionsList = Array.isArray(sessionsRes) ? sessionsRes : sessionsRes.sessions || sessionsRes.data || [];
      const classesList = Array.isArray(classesRes) ? classesRes : classesRes.classes || [];
      const usersList = Array.isArray(usersRes) ? usersRes : usersRes.users || [];
      setSessions(sessionsList as SessionItem[]);
      setClasses(classesList as ClassItem[]);
      setUsers(usersList as UserItem[]);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load sessions/classes/users");
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  const formatSessionLabel = (s: SessionItem) => {
    const cls = classes.find((c) => c.id === String(s.classId))?.name || s.classId;
    const dt = new Date(s.startTime);
    const dateStr = dt.toLocaleDateString();
    const timeStr = dt.toLocaleTimeString();
    return `${cls} – ${dateStr} ${timeStr}`;
  };

  const loadAttendance = async () => {
    if (!studentId && !classId && !date && !status && !quickRange) {
      setError("Please select at least one filter condition");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = { page: "1", limit: "500" };
      if (studentId) params.studentId = studentId;
      if (classId) params.classId = classId;
      if (date) params.date = date;
      if (status) params.status = status;
      if (quickRange === "today") {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        params.startDate = start.toISOString();
        params.endDate = end.toISOString();
      }
      if (quickRange === "month") {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        params.startDate = start.toISOString();
        params.endDate = end.toISOString();
      }

      const res = await attendanceAPI.getAll(params);
      const list = Array.isArray(res) ? res : res.attendance || res.attendances || res.data || [];
      setItems(list as AttendanceItem[]);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (item: AttendanceItem) => {
    setEditForm({ id: item.id, status: item.status });
    setIsEditOpen(true);
  };

  const submitEdit = async () => {
    setError("");
    try {
      await attendanceAPI.update(editForm.id, { status: editForm.status });
      setIsEditOpen(false);
      await loadAttendance();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to update attendance");
    }
  };

  const userLabel = (id: string) => {
    const u = users.find((x) => x.id === String(id));
    return u?.fullName || u?.email || id;
  };

  const filteredUsers = users.filter((u) => {
    if (!studentSearch.trim()) return true;
    const haystack = `${u.fullName || ""} ${u.email || ""} ${u.id}`.toLowerCase();
    return haystack.includes(studentSearch.toLowerCase());
  });

  const statusLabel = (value: string) => {
    if (value === "PRESENT") return "Có mặt";
    if (value === "ABSENT") return "Vắng";
    return value;
  };

  const downloadCSV = () => {
    const headers = ['Student', 'Class', 'Session', 'Status', 'Checked In At'];
    const rows = (Array.isArray(items) ? items : []).map(item => [
      item.student?.fullName || item.student?.email || userLabel(item.studentId),
      item.session?.class?.name || '',
      item.session?.startTime ? new Date(item.session.startTime).toLocaleString('vi-VN') : '',
      statusLabel(item.status || 'N/A'),
      item.checkedInAt ? new Date(item.checkedInAt).toLocaleString('vi-VN') : 'N/A',
    ]);

    const csv = [
      headers.join(','),
      ...(Array.isArray(rows) ? rows : []).map(row => (Array.isArray(row) ? row.map(cell => `"${cell}"`).join(',') : ''))
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `attendance-report-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Tra cứu điểm danh</h2>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="form-label">Tìm học viên</label>
              <input
                className="form-input mb-2"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Gõ tên hoặc email học viên..."
              />
              <label className="form-label">Học viên</label>
              <select
                className="form-input"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option value="">Tất cả học viên</option>
                {(Array.isArray(filteredUsers) ? filteredUsers : []).map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName || u.email || u.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Lớp</label>
              <select
                className="form-input"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">Tất cả lớp</option>
                {(Array.isArray(classes) ? classes : []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Ngày</label>
              <input
                className="form-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Trạng thái</label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`btn ${quickRange === "today" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setQuickRange("today");
                setDate("");
              }}
            >
              Hôm nay
            </button>
            <button
              className={`btn ${quickRange === "month" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setQuickRange("month");
                setDate("");
              }}
            >
              Tháng này
            </button>
            <button
              className={`btn ${quickRange === "" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setQuickRange("")}
            >
              Tùy chọn
            </button>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button className="btn btn-secondary" onClick={() => {
              setStudentId("");
              setStudentSearch("");
              setClassId("");
              setDate("");
              setStatus("");
              setQuickRange("");
              setItems([]);
            }}>
              Clear
            </button>
            <button className="btn btn-primary" onClick={loadAttendance}>
              Tra cứu
            </button>
          </div>
          {error && (
            <div className="alert rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-danger">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header flex justify-between items-center gap-2">
          <h2 className="card-title">Kết quả tra cứu</h2>
          <div className="text-sm text-gray-500">
            {items.length} kết quả
          </div>
          {items.length > 0 && (
            <button
              onClick={downloadCSV}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              📥 Export CSV
            </button>
          )}
        </div>
        {loading ? (
          <div className="stats-card">
            <div className="stats-number">Loading...</div>
            <div className="stats-label">Please wait</div>
          </div>
        ) : items.length === 0 ? (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Chưa có kết quả</h3>
            </div>
            <div className="p-4 text-sm text-gray-500">
              Chọn tối thiểu một điều kiện rồi bấm Tra cứu để lọc theo học viên, lớp, ngày và trạng thái.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Học viên</th>
                  <th>Lớp</th>
                  <th>Buổi học</th>
                  <th>Trạng thái</th>
                  <th>Điểm danh lúc</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(items) ? items : []).map((it) => (
                  <tr key={it.id}>
                    <td>{it.student?.fullName || it.student?.email || userLabel(it.studentId)}</td>
                    <td>{it.session?.class?.name || "—"}</td>
                    <td>{it.session?.startTime ? new Date(it.session.startTime).toLocaleString("vi-VN") : "—"}</td>
                    <td>
                      <span className={it.status === "PRESENT" ? "badge badge-success" : "badge badge-danger"}>
                        {it.status}
                      </span>
                    </td>
                    <td>{it.checkedInAt ? new Date(it.checkedInAt).toLocaleString("vi-VN") : "—"}</td>
                    <td>
                      <button className="btn btn-warning px-3 py-2 text-sm" onClick={() => openEdit(it)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="card w-full max-w-md">
            <div className="card-header">
              <h3 className="card-title">Edit Attendance</h3>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as "PRESENT" | "ABSENT" })}
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 p-4">
              <button className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
