"use client";

import { useEffect, useState } from "react";
import { sessionsAPI, classesAPI, usersAPI, attendanceAPI } from "@/lib/api";

type AttendanceItem = {
  id: string;
  studentId: string;
  status: "PRESENT" | "ABSENT";
  checkedInAt: string | null;
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
  const [sessionId, setSessionId] = useState<string>("");
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
    if (!sessionId) return;
    setLoading(true);
    setError("");
    try {
      const res = await attendanceAPI.getBySession(sessionId);
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

  const downloadCSV = () => {
    const headers = ['Session', 'Student', 'Status', 'Checked In At'];
    const sessionLabel = formatSessionLabel(sessions.find(s => s.id === sessionId) as SessionItem);
    const rows = (Array.isArray(items) ? items : []).map(item => [
      sessionLabel,
      userLabel(item.studentId),
      item.status || 'N/A',
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
          <h2 className="card-title">Attendance</h2>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <label className="form-label">Session</label>
            <select
              className="form-input"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            >
              <option value="">Select a session</option>
              {(Array.isArray(sessions) ? sessions : []).map((s) => (
                <option key={s.id} value={s.id}>{formatSessionLabel(s)}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={loadAttendance}>Load Attendance</button>
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
          <h2 className="card-title">Attendance Records</h2>
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
              <h3 className="card-title">No attendance records</h3>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Checked In At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(items) ? items : []).map((it) => (
                  <tr key={it.id}>
                    <td>{userLabel(it.studentId)}</td>
                    <td>
                      <span className={it.status === "PRESENT" ? "badge badge-success" : "badge badge-danger"}>
                        {it.status}
                      </span>
                    </td>
                    <td>{it.checkedInAt ? new Date(it.checkedInAt).toLocaleString() : "—"}</td>
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
