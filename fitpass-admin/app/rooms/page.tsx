'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { roomsAPI } from '@/lib/api';
import AdvancedTable from '@/components/AdvancedTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import { 
  BuildingOfficeIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon 
} from '@heroicons/react/24/outline';

interface Room {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  equipment?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
  _count?: { sessions: number };
  createdAt: string;
}

interface RoomFormData {
  name: string;
  description: string;
  capacity: number;
  equipment: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
}

export default function RoomsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
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
  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    description: '',
    capacity: 10,
    equipment: '',
    status: 'AVAILABLE'
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const data = await roomsAPI.getAll();
      setRooms(data.rooms || []);
    } catch (error) {
      showToast('Lỗi khi tải danh sách phòng học.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRoom) {
        await roomsAPI.update(editingRoom.id, formData);
      } else {
        await roomsAPI.create(formData);
      }

      showToast(editingRoom ? 'Cập nhật phòng học thành công.' : 'Tạo phòng học thành công.', 'success');
      setShowModal(false);
      setEditingRoom(null);
      resetForm();
      fetchRooms();
    } catch (error: any) {
      showToast(error.message || 'Lỗi khi lưu phòng học.', 'error');
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description || '',
      capacity: room.capacity,
      equipment: room.equipment || '',
      status: room.status
    });
    setShowModal(true);
  };

  const handleDelete = async (roomId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa phòng',
      message: 'Bạn có chắc muốn xóa phòng này? Hành động này không thể hoàn tác.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await roomsAPI.delete(roomId);
          showToast('Xóa phòng học thành công.', 'success');
          fetchRooms();
        } catch (error: any) {
          showToast(error.message || 'Lỗi khi xóa phòng học.', 'error');
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      capacity: 10,
      equipment: '',
      status: 'AVAILABLE'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'OCCUPIED': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      case 'MAINTENANCE': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 'RESERVED': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'Trống';
      case 'OCCUPIED': return 'Đang sử dụng';
      case 'MAINTENANCE': return 'Bảo trì';
      case 'RESERVED': return 'Đặt trước';
      default: return status;
    }
  };

  const downloadCSV = () => {
    const headers = ['Tên phòng', 'Sức chứa', 'Trạng thái', 'Số buổi', 'Ngày tạo'];
    const rows = (Array.isArray(rooms) ? rooms : []).map(r => [
      r.name,
      r.capacity.toString(),
      getStatusText(r.status),
      r._count?.sessions?.toString() || '0',
      new Date(r.createdAt).toLocaleDateString('vi-VN')
    ]);
    const csv = [
      headers.join(','),
      ...(Array.isArray(rows) ? rows : []).map(row => (Array.isArray(row) ? row.map(cell => `"${cell}"`).join(',') : ''))
    ].join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `phong-hoc-${new Date().toLocaleDateString('vi-VN')}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý phòng học</h1>
          <p className="text-gray-600 dark:text-gray-400">Quản lý phòng tập và trang thiết bị.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadCSV}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium text-sm"
          >
            📥 Xuất CSV
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingRoom(null);
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Thêm phòng học
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="stats-card">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Tổng số phòng</p>
              <p className="text-2xl font-bold">{rooms.length}</p>
            </div>
          </div>
        </div>
        <div className="stats-card">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Còn trống</p>
              <p className="text-2xl font-bold">{rooms.filter(r => r.status === 'AVAILABLE').length}</p>
            </div>
          </div>
        </div>
        <div className="stats-card">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
              <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Đang sử dụng</p>
              <p className="text-2xl font-bold">{rooms.filter(r => r.status === 'OCCUPIED').length}</p>
            </div>
          </div>
        </div>
        <div className="stats-card">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
              <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Bảo trì</p>
              <p className="text-2xl font-bold">{rooms.filter(r => r.status === 'MAINTENANCE').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="card">
        <AdvancedTable
          columns={[
            {
              key: 'name',
              label: 'Tên phòng',
              sortable: true,
              filterable: true,
              render: (value, room) => (
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{value}</div>
                  {room.description && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{room.description}</div>
                  )}
                </div>
              )
            },
            {
              key: 'capacity',
              label: 'Sức chứa',
              sortable: true,
              filterable: false,
              render: (value) => `${value} người`
            },
            {
              key: 'equipment',
              label: 'Thiết bị',
              sortable: false,
              filterable: true,
              render: (value) => (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {value || 'Chưa có thiết bị'}
                </span>
              )
            },
            {
              key: 'status',
              label: 'Trạng thái',
              sortable: true,
              filterable: true,
              render: (value) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
                  {getStatusText(value)}
                </span>
              )
            },
            {
              key: 'sessions',
              label: 'Số buổi học',
              sortable: true,
              filterable: false,
              render: (value, room) => room._count?.sessions || 0
            },
            {
              key: 'actions',
              label: 'Thao tác',
              sortable: false,
              filterable: false,
              render: (value, room) => (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(room)}
                    className="p-1 rounded text-blue-600 hover:text-blue-900 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
                    title="Sửa phòng"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(room.id)}
                    className="p-1 rounded text-red-600 hover:text-red-900 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                    title="Xóa phòng"
                    disabled={room._count && room._count.sessions > 0}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )
            }
          ]}
          data={rooms}
          loading={loading}
          searchable={true}
          filterable={true}
          itemsPerPage={10}
          emptyMessage="Chưa có phòng học nào. Hãy tạo phòng học đầu tiên."
        />
      </div>

      {/* Room Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingRoom ? 'Sửa phòng học' : 'Thêm phòng học mới'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tên phòng *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  required
                  placeholder="Ví dụ: Phòng Yoga 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                  rows={3}
                  placeholder="Mô tả phòng học..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sức chứa *
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  className="form-input"
                  required
                  min="1"
                  placeholder="Số người tối đa"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Thiết bị
                </label>
                <input
                  type="text"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  className="form-input"
                  placeholder="Ví dụ: thảm yoga, loa"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trạng thái
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="form-input"
                >
                  <option value="AVAILABLE">Còn trống</option>
                  <option value="OCCUPIED">Đang sử dụng</option>
                  <option value="MAINTENANCE">Bảo trì</option>
                  <option value="RESERVED">Đặt trước</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRoom ? 'Cập nhật' : 'Tạo mới'} phòng học
                </button>
              </div>
            </form>
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