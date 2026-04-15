"use client";

import { useEffect, useState } from "react";
import { enrollmentsAPI, usersAPI, classesAPI } from "@/lib/api";
import AdvancedTable from "@/components/AdvancedTable";

type EnrollmentItem = {
  id: string;
  studentId: string;
  classId: string;
  createdAt: string;
};

type UserItem = { id: string; fullName?: string; email?: string; role?: string };
type ClassItem = { id: string; name: string };

export default function EnrollmentsPage() {
  const [items, setItems] = useState<EnrollmentItem[]>([]);
  const [students, setStudents] = useState<UserItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({ studentId: "", classId: "" });

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [enrollmentsRes, usersRes, classesRes] = await Promise.all([
        enrollmentsAPI.getAll(),
        usersAPI.getAll(),
        classesAPI.getAll(),
      ]);
      const enrollments = Array.isArray(enrollmentsRes)
        ? enrollmentsRes
        : enrollmentsRes.enrollments || enrollmentsRes.data || [];
      const users = Array.isArray(usersRes) ? usersRes : usersRes.users || [];
      const onlyStudents = (users as UserItem[]).filter((u) => u.role === "STUDENT");
      const classesList = Array.isArray(classesRes) ? classesRes : classesRes.classes || [];

      setItems(enrollments as EnrollmentItem[]);
      setStudents(onlyStudents);
      setClasses(classesList as ClassItem[]);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setCreateForm({ studentId: "", classId: "" });
    setIsCreateOpen(true);
  };

  const submitCreate = async () => {
    setError("");
    const { studentId, classId } = createForm;
    if (!studentId || !classId) {
      setError("Please select student and class");
      return;
    }
    try {
      await enrollmentsAPI.create({ studentId, classId });
      setIsCreateOpen(false);
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to enroll student");
    }
  };

  const studentLabel = (id: string) => {
    const s = students.find((u) => u.id === String(id));
    return s?.fullName || s?.email || id;
  };

  const classLabel = (id: string) => {
    const c = classes.find((cl) => cl.id === String(id));
    return c?.name || id;
  };

  const downloadCSV = () => {
    const headers = ['Học viên', 'Email', 'Lớp học', 'Ngày đăng ký'];
    const rows = (Array.isArray(items) ? items : []).map(e => [
      studentLabel(e.studentId),
      students.find(s => s.id === String(e.studentId))?.email || 'N/A',
      classLabel(e.classId),
      new Date(e.createdAt).toLocaleDateString('vi-VN')
    ]);
    const csv = [
      headers.join(','),
      ...(Array.isArray(rows) ? rows : []).map(row => (Array.isArray(row) ? row.map(cell => `"${cell}"`).join(',') : ''))
    ].join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `enrollments-${new Date().toLocaleDateString('vi-VN')}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-6">
      <div className="card">
        <div className="card-header flex justify-between items-center gap-2">
          <h2 className="card-title">Enrollments</h2>
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              📥 Export CSV
            </button>
            <button className="btn btn-primary" onClick={openCreate}>Create</button>
          </div>
        </div>

        {error && (
          <div className="alert mb-4 rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="stats-card">
            <div className="stats-number">Loading...</div>
            <div className="stats-label">Please wait</div>
          </div>
        ) : items.length === 0 ? (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">No data</h3>
            </div>
          </div>
        ) : (
          <AdvancedTable
            columns={[
              {
                key: 'student',
                label: 'Học viên',
                sortable: true,
                filterable: true,
                render: (value, enrollment) => studentLabel(enrollment.studentId)
              },
              {
                key: 'class',
                label: 'Lớp học',
                sortable: true,
                filterable: true,
                render: (value, enrollment) => classLabel(enrollment.classId)
              },
              {
                key: 'createdAt',
                label: 'Ngày đăng ký',
                sortable: true,
                filterable: false,
                render: (value) => new Date(value).toLocaleDateString('vi-VN')
              }
            ]}
            data={Array.isArray(items) ? items : []}
            loading={loading}
            searchable={true}
            filterable={true}
            itemsPerPage={15}
            emptyMessage="Chưa có đăng ký nào"
          />
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="card w-full max-w-lg">
            <div className="card-header">
              <h3 className="card-title">Enroll Student</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Student</label>
                <select
                  className="form-input"
                  value={createForm.studentId}
                  onChange={(e) => setCreateForm({ ...createForm, studentId: e.target.value })}
                >
                  <option value="">Select a student</option>
                  {(Array.isArray(students) ? students : []).map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName || s.email || s.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Class</label>
                <select
                  className="form-input"
                  value={createForm.classId}
                  onChange={(e) => setCreateForm({ ...createForm, classId: e.target.value })}
                >
                  <option value="">Select a class</option>
                  {(Array.isArray(classes) ? classes : []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitCreate}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
