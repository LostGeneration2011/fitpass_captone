"use client";

import { useEffect, useState } from "react";
import { classesAPI } from "@/lib/api";
import AdvancedTable from "@/components/AdvancedTable";
import ConfirmDialog from "@/components/ConfirmDialog";

type ClassItem = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  duration: number; // minutes
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  teacherId?: string | null;
  teacher?: {
    id: string;
    fullName: string;
    email: string;
  };
  minStudents?: number;
  maxStudents?: number | null;
  priceAdjustment?: number;
  type?: string;
  level?: string;
  _count?: {
    enrollments?: number;
    sessions?: number;
  };
  classImages?: Array<{ id: string }>;
};

type FormState = {
  id?: string;
  name: string;
  description: string;
  capacity: string; // keep as string for controlled input
  duration: string; // keep as string for controlled input
};

export default function ClassesPage() {
  const [items, setItems] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [actionItem, setActionItem] = useState<ClassItem | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
  });
  const [viewItem, setViewItem] = useState<ClassItem | null>(null);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    capacity: "",
    duration: "",
  });

  const normalizeStatus = (status: unknown): 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNKNOWN' => {
    const normalized = String(status || '').trim().toUpperCase();
    if (normalized === 'PENDING' || normalized === 'APPROVED' || normalized === 'REJECTED') {
      return normalized;
    }
    return 'UNKNOWN';
  };

  const getStatusLabel = (status: unknown) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'APPROVED') return 'Đã duyệt';
    if (normalized === 'REJECTED') return 'Từ chối';
    if (normalized === 'PENDING') return 'Chờ duyệt';
    return 'Không xác định';
  };

  const resetForm = () => {
    setForm({ name: "", description: "", capacity: "", duration: "" });
  };

  const fetchItems = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await classesAPI.getAll();
      const list = Array.isArray(res) ? res : res.classes || res.data || [];
      setItems(list as ClassItem[]);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể tải danh sách lớp học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreate = () => {
    setIsEditing(false);
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (item: ClassItem) => {
    setActionItem(null);
    setIsEditing(true);
    setForm({
      id: item.id,
      name: item.name || "",
      description: item.description || "",
      capacity: String(item.capacity ?? ""),
      duration: String(item.duration ?? ""),
    });
    setIsModalOpen(true);
  };

  const openView = async (item: ClassItem) => {
    setActionItem(null);
    setError("");
    setViewLoading(true);
    try {
      const detail = await classesAPI.getDetail(item.id);
      setViewItem(detail as ClassItem);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể tải chi tiết lớp học.");
    } finally {
      setViewLoading(false);
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setError("Tên lớp là bắt buộc.");
      return false;
    }
    const capacityNum = Number(form.capacity);
    const durationNum = Number(form.duration);
    if (!capacityNum || capacityNum <= 0) {
      setError("Sức chứa phải lớn hơn 0.");
      return false;
    }
    if (!durationNum || durationNum <= 0) {
      setError("Thời lượng phải lớn hơn 0.");
      return false;
    }
    return true;
  };

  const submitForm = async () => {
    setError("");
    if (!validateForm()) return;
    const payload = {
      name: form.name,
      description: form.description,
      capacity: Number(form.capacity),
      duration: Number(form.duration),
    };
    try {
      if (isEditing && form.id) {
        await classesAPI.update(form.id, payload);
      } else {
        await classesAPI.create(payload);
      }
      setIsModalOpen(false);
      await fetchItems();
    } catch (e: any) {
      setError(e?.response?.data?.message || (isEditing ? "Không thể cập nhật lớp học." : "Không thể tạo lớp học."));
    }
  };

  const removeItem = async (id: string) => {
    setActionItem(null);
    setError("");
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa lớp học',
      message: 'Bạn có chắc muốn xóa lớp học này? Hành động này không thể hoàn tác.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await classesAPI.delete(id);
          await fetchItems();
        } catch (e: any) {
          setError(e?.response?.data?.message || 'Không thể xóa lớp học.');
        }
      },
    });
  };

  const approveClass = async (id: string) => {
    setActionItem(null);
    setError("");
    try {
      await classesAPI.approve(id);
      await fetchItems();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể duyệt lớp học.");
    }
  };

  const rejectClass = async (id: string) => {
    setActionItem(null);
    setError("");
    const reason = prompt("Nhập lý do từ chối (tùy chọn):");
    try {
      await classesAPI.reject(id, reason?.trim() || undefined);
      await fetchItems();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể từ chối lớp học.");
    }
  };

  const downloadCSV = () => {
    const headers = ['ID', 'Tên lớp', 'Sức chứa', 'Thời lượng (phút)', 'Trạng thái'];
    const rows = (Array.isArray(items) ? items : []).map(item => [
      item.id.substring(0, 8),
      item.name,
      item.capacity,
      item.duration,
      getStatusLabel(item.status),
    ]);

    const csv = [
      headers.join(','),
      ...(Array.isArray(rows) ? rows : []).map(row => (Array.isArray(row) ? row.map(cell => `"${cell}"`).join(',') : ''))
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `bao-cao-lop-hoc-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Lớp học</h2>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              onClick={downloadCSV}
            >
              📥 Xuất CSV
            </button>
            <button
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              onClick={openCreate}
            >
              Tạo lớp học
            </button>
          </div>
        </div>

        {error && (
          <div className="alert mb-4 rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-danger">
            {error}
          </div>
        )}

        <AdvancedTable
          columns={[
            {
              key: 'name',
              label: 'Tên lớp',
              sortable: true,
              filterable: true,
              render: (value, item) => (
                <div>
                  <div className="font-medium">{value}</div>
                  {item.description && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
                  )}
                </div>
              )
            },
            {
              key: 'teacher',
              label: 'Giáo viên',
              sortable: true,
              filterable: true,
              filterValue: (item) => {
                const teacherName = item.teacher?.fullName || '';
                const teacherEmail = item.teacher?.email || '';
                return `${teacherName} ${teacherEmail}`.trim();
              },
              render: (value, item) => item.teacher?.fullName || 'Chưa có giáo viên'
            },
            {
              key: 'capacity',
              label: 'Sức chứa',
              sortable: true,
              filterable: false
            },
            {
              key: 'duration',
              label: 'Thời lượng (phút)',
              sortable: true,
              filterable: false
            },
            {
              key: 'status',
              label: 'Trạng thái',
              sortable: true,
              filterable: true,
              filterValue: (item) => {
                const status = normalizeStatus(item?.status);
                if (status === 'APPROVED') return 'APPROVED DA DUYET ĐÃ DUYỆT';
                if (status === 'REJECTED') return 'REJECTED TU CHOI TỪ CHỐI';
                if (status === 'PENDING') return 'PENDING CHO DUYET CHỜ DUYỆT';
                return 'UNKNOWN KHONG XAC DINH KHÔNG XÁC ĐỊNH';
              },
              render: (value, item) => (
                <div>
                  {(() => {
                    const rowStatus = normalizeStatus(value ?? item?.status);
                    return (
                      <>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    rowStatus === 'APPROVED' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                    rowStatus === 'REJECTED' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                    rowStatus === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {getStatusLabel(rowStatus)}
                  </span>
                  {rowStatus === 'REJECTED' && item.rejectionReason && (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">{item.rejectionReason}</div>
                  )}
                      </>
                    );
                  })()}
                </div>
              )
            },
            {
              key: 'actions',
              label: 'Thao tác',
              sortable: false,
              filterable: false,
              render: (value, item) => {
                return (
                <div className="relative">
                  <button
                    className="inline-flex items-center justify-center min-w-[96px] px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-colors"
                    onClick={() => setActionItem(item)}
                  >
                    Thao tác
                  </button>
                </div>
              )}
            }
          ]}
          data={items}
          loading={loading}
          searchable={true}
          filterable={true}
          itemsPerPage={10}
          emptyMessage="Không tìm thấy lớp học nào"
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="card w-full max-w-lg">
            <div className="card-header">
              <h3 className="card-title">{isEditing ? "Chỉnh sửa lớp học" : "Tạo lớp học"}</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Tên lớp</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Mô tả</label>
                <textarea
                  className="form-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Sức chứa</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Thời lượng (phút)</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                onClick={() => { setIsModalOpen(false); setError(""); }}
              >
                Hủy
              </button>
              <button 
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                onClick={submitForm}
              >
                {isEditing ? "Cập nhật" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="card-header">
              <h3 className="card-title">Chi tiết lớp học</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-gray-500">Tên lớp</div>
                <div className="font-medium">{viewItem.name}</div>
              </div>
              <div>
                <div className="text-gray-500">Mô tả</div>
                <div>{viewItem.description || '-'}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500">Giáo viên</div>
                  <div>{viewItem.teacher?.fullName || 'Chưa có giáo viên'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Trạng thái</div>
                  <div>{getStatusLabel(viewItem.status)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Sức chứa</div>
                  <div>{viewItem.capacity}</div>
                </div>
                <div>
                  <div className="text-gray-500">Thời lượng</div>
                  <div>{viewItem.duration} phút</div>
                </div>
                <div>
                  <div className="text-gray-500">Loại lớp</div>
                  <div>{viewItem.type || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Cấp độ</div>
                  <div>{viewItem.level || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Số học viên tối thiểu</div>
                  <div>{viewItem.minStudents ?? '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Số học viên tối đa</div>
                  <div>{viewItem.maxStudents ?? '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Lượt đăng ký</div>
                  <div>{viewItem._count?.enrollments ?? 0}</div>
                </div>
                <div>
                  <div className="text-gray-500">Buổi học</div>
                  <div>{viewItem._count?.sessions ?? 0}</div>
                </div>
              </div>
              {viewItem.rejectionReason && (
                <div>
                  <div className="text-gray-500">Lý do từ chối</div>
                  <div className="text-red-600 dark:text-red-400">{viewItem.rejectionReason}</div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                onClick={() => setViewItem(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {actionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="card w-full max-w-sm">
            <div className="card-header">
              <h3 className="card-title">Thao tác lớp học</h3>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">{actionItem.name}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Trạng thái: {getStatusLabel(actionItem.status)}
              </div>

              <button
                className="w-full text-left px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => openView(actionItem)}
                disabled={viewLoading}
              >
                Xem chi tiết
              </button>

              {normalizeStatus(actionItem.status) === 'PENDING' && (
                <>
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-lg border border-green-200 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                    onClick={() => approveClass(actionItem.id)}
                  >
                    Duyệt
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-lg border border-red-200 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => rejectClass(actionItem.id)}
                  >
                    Từ chối
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-lg border border-yellow-200 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                    onClick={() => openEdit(actionItem)}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-lg border border-red-200 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => removeItem(actionItem.id)}
                  >
                    Xóa
                  </button>
                </>
              )}

              {normalizeStatus(actionItem.status) === 'APPROVED' && (
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-lg border border-yellow-200 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                  onClick={() => openEdit(actionItem)}
                >
                  Chỉnh sửa nhỏ
                </button>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                onClick={() => setActionItem(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}
 
// The content below was from the previous implementation and is removed to avoid duplicates.
