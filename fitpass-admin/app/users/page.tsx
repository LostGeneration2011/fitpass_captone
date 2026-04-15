"use client";

import { useEffect, useState } from "react";
import { usersAPI } from "@/lib/api";
import AdvancedTable from "@/components/AdvancedTable";

type User = {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  emailVerified: boolean;
  isActive?: boolean;
  createdAt: string;
  _count?: {
    teachingClasses?: number;
    enrollments?: number;
    transactions?: number;
  };
};

type UserForm = {
  id?: string;
  email: string;
  fullName: string;
  role: string;
  password: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<UserForm>({
    email: "",
    fullName: "",
    role: "STUDENT",
    password: "",
  });

  const getApiErrorMessage = (err: any, fallback: string) => {
    return err?.response?.data?.message || err?.response?.data?.error || fallback;
  };

  const resetForm = () => {
    setForm({
      email: "",
      fullName: "",
      role: "STUDENT",
      password: "",
    });
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await usersAPI.getAll();
      // Backend returns { users: [...] }, extract the users array
      const usersList = data.users || data || [];
      const normalizedUsers = Array.isArray(usersList)
        ? (Array.isArray(usersList) ? usersList : []).map((u: any) => ({
            ...u,
            isActive: typeof u.isActive === 'boolean' ? u.isActive : Boolean(u.emailVerified),
          }))
        : [];
      setUsers(normalizedUsers);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(getApiErrorMessage(err, "Failed to fetch users"));
      setUsers([]); // Ensure users is always an array
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setIsEditing(false);
    resetForm();
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEdit = (user: User) => {
    setIsEditing(true);
    setShowPassword(false);
    setForm({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      password: "", // Don't prefill password for security
    });
    setIsModalOpen(true);
  };

  const submitForm = async () => {
    if (!form.email || !form.fullName || !form.role) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (!isEditing && !form.password) {
      setError("Vui lòng nhập mật khẩu cho user mới");
      return;
    }

    try {
      const payload = {
        email: form.email,
        fullName: form.fullName,
        role: form.role,
        ...(form.password && { password: form.password })
      };

      if (isEditing && form.id) {
        await usersAPI.update(form.id, payload);
      } else {
        await usersAPI.create(payload);
      }

      await fetchUsers();
      setIsModalOpen(false);
      resetForm();
      setError("");
    } catch (err: any) {
      setError(getApiErrorMessage(err, `Failed to ${isEditing ? 'update' : 'create'} user`));
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa user này?")) return;
    
    try {
      await usersAPI.delete(id);
      await fetchUsers();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to delete user"));
    }
  };

  const toggleEmailVerification = async (id: string, currentStatus: boolean) => {
    try {
      await usersAPI.update(id, { emailVerified: !currentStatus });
      await fetchUsers();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to update email verification"));
    }
  };

  const toggleActiveStatus = async (id: string, newStatus: boolean) => {
    try {
      await usersAPI.update(id, { emailVerified: newStatus });
      await fetchUsers();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to update user status"));
    }
  };

  const downloadCSV = () => {
    const filteredUsers = selectedRole === 'ALL' 
      ? users 
      : users.filter(u => u.role === selectedRole);

    const headers = ['ID', 'Email', 'Full Name', 'Role', 'Email Verified', 'Created At'];
    const rows = (Array.isArray(filteredUsers) ? filteredUsers : []).map(u => [
      u.id.substring(0, 8),
      u.email,
      u.fullName,
      u.role,
      u.emailVerified ? 'Yes' : 'No',
      new Date(u.createdAt).toLocaleDateString('vi-VN'),
    ]);

    const csv = [
      headers.join(','),
      ...(Array.isArray(rows) ? rows : []).map(row => (Array.isArray(row) ? row.map(cell => `"${cell}"`).join(',') : ''))
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `users-report-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = selectedRole === 'ALL' 
    ? (Array.isArray(users) ? users : [])
    : (Array.isArray(users) ? users.filter(user => user.role === selectedRole) : []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'TEACHER': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      case 'STUDENT': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Quản trị viên';
      case 'TEACHER': return 'Giáo viên';
      case 'STUDENT': return 'Học viên';
      default: return role;
    }
  };

  const roleStats = {
    total: Array.isArray(users) ? users.length : 0,
    admin: Array.isArray(users) ? users.filter(u => u.role === 'ADMIN').length : 0,
    teacher: Array.isArray(users) ? users.filter(u => u.role === 'TEACHER').length : 0,
    student: Array.isArray(users) ? users.filter(u => u.role === 'STUDENT').length : 0,
    verified: Array.isArray(users) ? users.filter(u => u.emailVerified).length : 0,
  };

  return (
    <div className="p-6">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Users Management</h2>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              onClick={downloadCSV}
            >
              📥 Export CSV
            </button>
            <button
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              onClick={openCreate}
            >
              Create User
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="stats-card">
            <div className="stats-number">{roleStats.total}</div>
            <div className="stats-label">Tổng users</div>
          </div>
          <div className="stats-card">
            <div className="stats-number">{roleStats.admin}</div>
            <div className="stats-label">Admins</div>
          </div>
          <div className="stats-card">
            <div className="stats-number">{roleStats.teacher}</div>
            <div className="stats-label">Teachers</div>
          </div>
          <div className="stats-card">
            <div className="stats-number">{roleStats.student}</div>
            <div className="stats-label">Students</div>
          </div>
          <div className="stats-card">
            <div className="stats-number">{roleStats.verified}</div>
            <div className="stats-label">Verified</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <label className="form-label">Lọc theo vai trò:</label>
          <select
            className="form-input w-48"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="ALL">Tất cả</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="TEACHER">Giáo viên</option>
            <option value="STUDENT">Học viên</option>
          </select>
        </div>

        {error && (
          <div className="alert mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        <AdvancedTable
          columns={[
            {
              key: 'info',
              label: 'Thông tin',
              sortable: true,
              filterable: true,
              render: (value, user) => (
                <div>
                  <div className="font-medium">{user.fullName}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                </div>
              )
            },
            {
              key: 'role',
              label: 'Vai trò',
              sortable: true,
              filterable: true,
              render: (value) => (
                <span className={`px-2 py-1 text-xs rounded font-medium ${getRoleColor(value)}`}>
                  {getRoleText(value)}
                </span>
              )
            },
            {
              key: 'emailVerified',
              label: 'Email verified',
              sortable: true,
              filterable: false,
              render: (value) => (
                <span className={`px-2 py-1 text-xs rounded font-medium ${
                  value ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
                  'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {value ? 'Đã xác thực' : 'Chưa xác thực'}
                </span>
              )
            },
            {
              key: 'isActive',
              label: 'Hoạt động',
              sortable: true,
              filterable: false,
              render: (value) => (
                <span className={`px-2 py-1 text-xs rounded font-medium ${
                  value ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
                  'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {value ? 'Active' : 'Inactive'}
                </span>
              )
            },
            {
              key: 'createdAt',
              label: 'Ngày tạo',
              sortable: true,
              filterable: false,
              render: (value) => new Date(value).toLocaleDateString('vi-VN')
            },
            {
              key: 'actions',
              label: 'Actions',
              sortable: false,
              filterable: false,
              render: (value, user) => (
                <div className="flex items-center gap-1">
                  {user.isActive ? (
                    <button 
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${
                        user.isActive ? 'bg-gray-500 text-white hover:bg-gray-600' : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      onClick={() => toggleActiveStatus(user.id, !user.isActive)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button 
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                      onClick={() => toggleActiveStatus(user.id, !user.isActive)}
                    >
                      Activate
                    </button>
                  )}
                  <button 
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                    onClick={() => openEdit(user)}
                  >
                    Edit
                  </button>
                  <button 
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                    onClick={() => deleteUser(user.id)}
                  >
                    Delete
                  </button>
                </div>
              )
            }
          ]}
          data={filteredUsers}
          loading={loading}
          searchable={true}
          filterable={true}
          itemsPerPage={15}
          emptyMessage="Không tìm thấy user nào"
        />
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">
              {isEditing ? "Edit User" : "Create New User"}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="user@example.com"
                  disabled={isEditing} // Don't allow email changes when editing
                />
              </div>
              <div>
                <label className="form-label">Họ tên</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="form-label">Vai trò</label>
                <select
                  className="form-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="STUDENT">Học viên</option>
                  <option value="TEACHER">Giáo viên</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </div>
              <div>
                <label className="form-label">
                  {isEditing ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
                </label>
                <div className="relative">
                  <input
                    className="form-input pr-10"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={isEditing ? "Để trống nếu không thay đổi" : "Nhập mật khẩu"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                onClick={() => { setIsModalOpen(false); setError(""); }}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                onClick={submitForm}
              >
                {isEditing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}