"use client";

import { useEffect, useState } from "react";
import { sessionsAPI, classesAPI, usersAPI, roomsAPI } from "@/lib/api";
import AdvancedTable from "@/components/AdvancedTable";

type SessionItem = {
  id: string;
  classId: string;
  roomId?: string;
  startTime: string;
  endTime?: string;
  status: "UPCOMING" | "ACTIVE" | "DONE";
  room?: { id: string; name: string; capacity: number };
  class?: { 
    id: string; 
    name: string; 
    teacher?: { id: string; fullName: string } 
  };
};

export default function SessionsPage() {
  const [items, setItems] = useState<SessionItem[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string; capacity: number }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [editOverrideReason, setEditOverrideReason] = useState<string>("");
  const [deleteOverrideReason, setDeleteOverrideReason] = useState<string>("");

  const [createForm, setCreateForm] = useState({
    classId: "",
    teacherId: "",
    roomId: "",
    startTime: "",
    endTime: "",
    status: "UPCOMING" as any,
    adminOverrideReason: "",
  });

  const [editForm, setEditForm] = useState({
    id: "",
    classId: "",
    teacherId: "",
    roomId: "",
    startTime: "",
    endTime: "",
    status: "UPCOMING" as any,
  });

  const [deleteId, setDeleteId] = useState<string>("");

  const getStatusText = (status: SessionItem["status"]) => {
    switch (status) {
      case "DONE":
        return "Hoàn thành";
      case "ACTIVE":
        return "Đang diễn ra";
      case "UPCOMING":
      default:
        return "Sắp diễn ra";
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    setError("");
    try {
      const [sessionsRes, classesRes, usersRes, roomsRes] = await Promise.all([
        sessionsAPI.getAll(),
        classesAPI.getAll().catch(() => []),
        usersAPI.getAll().catch(() => []),
        roomsAPI.getAll().catch(() => []),
      ]);
      const sessions = sessionsRes.sessions || sessionsRes.data || sessionsRes;
      setItems(Array.isArray(sessions) ? sessions : []);
      setClasses(Array.isArray(classesRes) ? classesRes : classesRes.classes || []);
      const users = Array.isArray(usersRes) ? usersRes : usersRes.users || [];
      setTeachers(users.filter((u: any) => u.role === 'TEACHER'));
      const rooms = Array.isArray(roomsRes) ? roomsRes : roomsRes.rooms || [];
      setRooms(rooms.filter((r: any) => r.status === 'AVAILABLE'));
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể tải danh sách buổi học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreate = () => {
    setCreateForm({ classId: "", teacherId: "", roomId: "", startTime: "", endTime: "", status: "UPCOMING", adminOverrideReason: "" });
    setIsCreateOpen(true);
  };

  const submitCreate = async () => {
    setError("");
    const { classId, teacherId, roomId, startTime, endTime, status, adminOverrideReason } = createForm;
    if (!classId || !startTime || !status) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc (lớp học, giờ bắt đầu, trạng thái)");
      return;
    }

    if (!adminOverrideReason.trim()) {
      setError("Vui lòng nhập lý do ghi đè của quản trị viên");
      return;
    }

    try {
      // Validate and format datetime
      const startLocal = new Date(startTime);
      if (isNaN(startLocal.getTime())) {
        setError("Định dạng giờ bắt đầu không hợp lệ");
        return;
      }

      let endLocal: Date;
      if (endTime) {
        endLocal = new Date(endTime);
        if (isNaN(endLocal.getTime())) {
          setError("Định dạng giờ kết thúc không hợp lệ");
          return;
        }
      } else {
        // Default to 90 minutes duration if no endTime provided
        endLocal = new Date(startLocal.getTime() + 90 * 60 * 1000);
      }

      // Validate that endTime is after startTime
      if (endLocal <= startLocal) {
        setError("Giờ kết thúc phải sau giờ bắt đầu");
        return;
      }

      const payload = {
        classId,
        roomId: roomId || undefined,
        startTime: startLocal.toISOString(),
        endTime: endLocal.toISOString(),
        status,
        adminOverrideReason: adminOverrideReason.trim(),
      };

      await sessionsAPI.create(payload);
      setIsCreateOpen(false);
      await fetchItems();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Không thể tạo buổi học");
    }
  };

  const openEdit = (item: SessionItem) => {
    setEditOverrideReason("");
    setEditForm({
      id: item.id,
      classId: item.classId || "",
      teacherId: item.class?.teacher?.id || "", // Get teacherId from class.teacher
      roomId: item.roomId || "",
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      status: item.status || "UPCOMING",
    });
    setIsEditOpen(true);
  };

  const submitEdit = async () => {
    setError("");
    const { id, classId, teacherId, roomId, startTime, endTime, status } = editForm;
    if (!id || !classId || !startTime || !status) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc (lớp học, giờ bắt đầu, trạng thái)");
      return;
    }

    if (!editOverrideReason.trim()) {
      setError("Vui lòng nhập lý do ghi đè khi chỉnh sửa buổi học");
      return;
    }

    try {
      // Note: teacherId is handled through class selection, not direct session update
      // If teacher needs to change, user must select different class
      // Validate and format datetime
      const startLocal = new Date(startTime);
      if (isNaN(startLocal.getTime())) {
        setError("Định dạng giờ bắt đầu không hợp lệ");
        return;
      }

      let endLocal: Date;
      if (endTime) {
        endLocal = new Date(endTime);
        if (isNaN(endLocal.getTime())) {
          setError("Định dạng giờ kết thúc không hợp lệ");
          return;
        }
      } else {
        // Default to 90 minutes duration if no endTime provided
        endLocal = new Date(startLocal.getTime() + 90 * 60 * 1000);
      }

      // Validate that endTime is after startTime
      if (endLocal <= startLocal) {
        setError("Giờ kết thúc phải sau giờ bắt đầu");
        return;
      }

      const payload = {
        classId,
        roomId: roomId || undefined,
        startTime: startLocal.toISOString(),
        endTime: endLocal.toISOString(),
        status,
        adminOverrideReason: editOverrideReason.trim(),
      };

      console.log('🔄 Updating session:', id, 'with payload:', payload);
      const result = await sessionsAPI.update(id, payload);
      console.log('✅ Session update result:', result);
      setIsEditOpen(false);
      await fetchItems();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Không thể cập nhật buổi học");
    }
  };

  const openDelete = (id: string) => {
    setDeleteOverrideReason("");
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const submitDelete = async () => {
    setError("");
    if (!deleteOverrideReason.trim()) {
      setError("Vui lòng nhập lý do ghi đè khi xóa buổi học");
      return;
    }
    try {
      await sessionsAPI.deleteWithReason(deleteId, deleteOverrideReason.trim());
      setIsDeleteOpen(false);
      await fetchItems();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể xóa buổi học");
    }
  };

  const downloadCSV = () => {
    const headers = ['Mã', 'Lớp học', 'Giáo viên', 'Phòng', 'Giờ bắt đầu', 'Giờ kết thúc', 'Trạng thái'];
    const rows = (Array.isArray(items) ? items : []).map(item => [
      item.id.substring(0, 8),
      item.class?.name || 'Không có',
      item.class?.teacher?.fullName || 'Không có',
      item.room?.name || 'Không có',
      new Date(item.startTime).toLocaleString('vi-VN'),
      item.endTime ? new Date(item.endTime).toLocaleString('vi-VN') : 'Không có',
      getStatusText(item.status),
    ]);

    const csv = [
      headers.join(','),
      ...(Array.isArray(rows) ? rows : []).map(row => (Array.isArray(row) ? row.map(cell => `"${cell}"`).join(',') : ''))
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `bao-cao-buoi-hoc-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-6">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Buổi học</h2>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={downloadCSV}>
              📥 Xuất CSV
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
          Buổi học do giáo viên tạo. Quản trị viên chỉ chỉnh sửa hoặc xóa buổi học hiện có khi vận hành đặc biệt và bắt buộc nhập lý do.
        </div>

        {error && (
          <div className="alert mb-4 rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-danger">
            {error}
          </div>
        )}

        <AdvancedTable
          columns={[
            {
              key: 'class',
              label: 'Lớp học',
              sortable: true,
              filterable: true,
              filterValue: (item) => {
                const className = classes.find((c) => c.id === String(item.classId))?.name;
                return className || '';
              },
              render: (value, item) => {
                const className = classes.find((c) => c.id === String(item.classId))?.name;
                return <span className="font-medium">{className || 'Không có'}</span>;
              }
            },
            {
              key: 'teacher',
              label: 'Giáo viên',
              sortable: true,
              filterable: true,
              filterValue: (item) => {
                return item.class?.teacher?.fullName || '';
              },
              render: (value, item) => {
                // Teacher comes from class relationship: item.class.teacher
                const teacherName = item.class?.teacher?.fullName || 'Không có';
                return <span>{teacherName}</span>;
              }
            },
            {
              key: 'room',
              label: 'Phòng',
              sortable: true,
              filterable: true,
              filterValue: (item) => {
                return item.room?.name || '';
              },
              render: (value, item) => {
                return <span>{item.room?.name || 'Chưa phân phòng'}</span>;
              }
            },
            {
              key: 'startTime',
              label: 'Thời gian bắt đầu',
              sortable: true,
              filterable: false,
              render: (value) => new Date(value).toLocaleString('vi-VN')
            },
            {
              key: 'endTime',
              label: 'Thời gian kết thúc',
              sortable: true,
              filterable: false,
              render: (value) => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa kết thúc'
            },
            {
              key: 'status',
              label: 'Trạng thái',
              sortable: true,
              filterable: true,
              render: (value) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    value === "DONE"
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      : value === "ACTIVE"
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                  }`}
                >
                  {value === "DONE" ? "Hoàn thành" : value === "ACTIVE" ? "Đang diễn ra" : "Sắp diễn ra"}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'Thao tác',
              sortable: false,
              filterable: false,
              render: (value, item) => (
                <div className="flex items-center gap-2">
                  <button 
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                    onClick={() => openEdit(item)}
                  >
                    Sửa
                  </button>
                  <button 
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                    onClick={() => openDelete(item.id)}
                  >
                    Xóa
                  </button>
                </div>
              )
            }
          ]}
          data={items}
          loading={loading}
          searchable={true}
          filterable={true}
          itemsPerPage={12}
          emptyMessage="Không có buổi học nào"
        />
      </div>

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 overflow-y-auto p-4 sm:p-6"
          onClick={() => setIsCreateOpen(false)}
        >
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h3 className="card-title">Tạo buổi học (ghi đè)</h3>
              <button className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-200">
                Quản trị viên chỉ nên tạo buổi học trong tình huống vận hành đặc biệt. Bắt buộc nhập lý do để phục vụ kiểm tra.
              </div>
              <div>
                <label className="form-label">Lớp học</label>
                <select
                  className="form-input"
                  value={createForm.classId}
                  onChange={(e) => setCreateForm({ ...createForm, classId: e.target.value })}
                >
                  <option value="">Chọn lớp học</option>
                  {(Array.isArray(classes) ? classes : []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Giáo viên</label>
                <select
                  className="form-input"
                  value={createForm.teacherId}
                  onChange={(e) => setCreateForm({ ...createForm, teacherId: e.target.value })}
                >
                  <option value="">Chọn giáo viên</option>
                  {(Array.isArray(teachers) ? teachers : []).map((t) => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Phòng</label>
                <select
                  className="form-input"
                  value={createForm.roomId || ''}
                  onChange={(e) => setCreateForm({ ...createForm, roomId: e.target.value })}
                >
                  <option value="">Chưa phân phòng</option>
                  {(Array.isArray(rooms) ? rooms : []).map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} (Sức chứa: {room.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Giờ bắt đầu</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={createForm.startTime}
                  onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Giờ kết thúc (không bắt buộc)</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={createForm.endTime}
                  onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nếu không nhập, hệ thống mặc định kết thúc sau 90 phút kể từ giờ bắt đầu</p>
              </div>
              <div>
                <label className="form-label">Trạng thái</label>
                <select
                  className="form-input"
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as any })}
                >
                  <option value="UPCOMING">Sắp diễn ra</option>
                  <option value="ACTIVE">Đang diễn ra</option>
                  <option value="DONE">Hoàn thành</option>
                </select>
              </div>
              <div>
                <label className="form-label">Lý do ghi đè (bắt buộc)</label>
                <textarea
                  className="form-input"
                  value={createForm.adminOverrideReason}
                  onChange={(e) => setCreateForm({ ...createForm, adminOverrideReason: e.target.value })}
                  placeholder="Ví dụ: Giáo viên bận, quản trị viên lên lịch buổi học bù"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={submitCreate}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 overflow-y-auto p-4 sm:p-6"
          onClick={() => setIsEditOpen(false)}
        >
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h3 className="card-title">Chỉnh sửa buổi học</h3>
              <button className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Lớp học</label>
                <select
                  className="form-input"
                  value={editForm.classId}
                  onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                >
                  <option value="">Chọn lớp học</option>
                  {(Array.isArray(classes) ? classes : []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Giáo viên</label>
                <select
                  className="form-input"
                  value={editForm.teacherId}
                  onChange={(e) => setEditForm({ ...editForm, teacherId: e.target.value })}
                >
                  <option value="">Chọn giáo viên</option>
                  {(Array.isArray(teachers) ? teachers : []).map((t) => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Phòng</label>
                <select
                  className="form-input"
                  value={editForm.roomId || ''}
                  onChange={(e) => setEditForm({ ...editForm, roomId: e.target.value })}
                >
                  <option value="">Chưa phân phòng</option>
                  {(Array.isArray(rooms) ? rooms : []).map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} (Sức chứa: {room.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Giờ bắt đầu</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Giờ kết thúc (không bắt buộc)</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nếu không nhập, hệ thống mặc định kết thúc sau 90 phút kể từ giờ bắt đầu</p>
              </div>
              <div>
                <label className="form-label">Trạng thái</label>
                <select
                  className="form-input"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                >
                  <option value="UPCOMING">Sắp diễn ra</option>
                  <option value="ACTIVE">Đang diễn ra</option>
                  <option value="DONE">Hoàn thành</option>
                </select>
              </div>
              <div>
                <label className="form-label">Lý do ghi đè (bắt buộc)</label>
                <textarea
                  className="form-input"
                  value={editOverrideReason}
                  onChange={(e) => setEditOverrideReason(e.target.value)}
                  placeholder="Ví dụ: Dời buổi học do phòng bảo trì"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={submitEdit}>
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 overflow-y-auto p-4 sm:p-6"
          onClick={() => setIsDeleteOpen(false)}
        >
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h3 className="card-title">Xác nhận xóa</h3>
              <button className="btn btn-secondary" onClick={() => setIsDeleteOpen(false)}>
                ✕
              </button>
            </div>
            <p>Bạn có chắc chắn muốn xóa buổi học này không?</p>
            <div className="mt-4">
              <label className="form-label">Lý do ghi đè (bắt buộc)</label>
              <textarea
                className="form-input"
                value={deleteOverrideReason}
                onChange={(e) => setDeleteOverrideReason(e.target.value)}
                placeholder="Ví dụ: Tạo nhầm buổi học"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setIsDeleteOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-danger" onClick={submitDelete}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
