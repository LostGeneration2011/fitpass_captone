"use client";

import { useEffect, useState } from "react";
import { packagesAPI } from "@/lib/api";
import AdvancedTable from "@/components/AdvancedTable";

type Package = {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  validDays: number;
  isActive: boolean;
  createdAt: string;
};

type PackageForm = {
  id?: string;
  name: string;
  description: string;
  price: string;
  credits: string;
  validDays: string;
};

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<PackageForm>({
    name: "",
    description: "",
    price: "",
    credits: "",
    validDays: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      credits: "",
      validDays: "",
    });
  };

  const fetchPackages = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await packagesAPI.getAll();
      console.log('Admin packages response:', response);
      
      // Handle both direct array and wrapped response
      const packagesData = response?.data || response || [];
      console.log('Setting packages:', packagesData);
      
      setPackages(packagesData);
    } catch (err: any) {
      console.error('Fetch packages error:', err);
      setError(err?.response?.data?.message || err?.message || "Failed to fetch packages");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setIsEditing(false);
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setIsEditing(true);
    setForm({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      price: pkg.price.toString(),
      credits: pkg.credits.toString(),
      validDays: pkg.validDays.toString(),
    });
    setIsModalOpen(true);
  };

  const submitForm = async () => {
    if (!form.name || !form.price || !form.credits || !form.validDays) {
      setError("Vui l\u00f2ng \u0111i\u1ec1n \u0111\u1ea7y \u0111\u1ee7 th\u00f4ng tin");
      return;
    }

    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        credits: parseInt(form.credits),
        validDays: parseInt(form.validDays),
        isActive: true
      };

      if (isEditing && form.id) {
        await packagesAPI.update(form.id, payload);
      } else {
        await packagesAPI.create(payload);
      }

      await fetchPackages();
      setIsModalOpen(false);
      resetForm();
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} package`);
    }
  };

  const deletePackage = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa gói này?")) return;
    
    try {
      await packagesAPI.delete(id);
      await fetchPackages();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete package");
    }
  };

  const togglePackageStatus = async (id: string, isActive: boolean) => {
    try {
      await packagesAPI.update(id, { isActive: !isActive });
      await fetchPackages();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update package status");
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const filteredPackages = selectedStatus === 'ALL'
    ? packages
    : packages.filter((pkg) => selectedStatus === 'ACTIVE' ? pkg.isActive : !pkg.isActive);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const downloadCSV = () => {
    const headers = ['Tên gói', 'Giá', 'Credits', 'Hạn sử dụng (ngày)', 'Trạng thái', 'Ngày tạo'];
    const rows = (Array.isArray(packages) ? packages : []).map(p => [
      p.name,
      p.price.toString(),
      p.credits === -1 ? 'Không giới hạn' : p.credits.toString(),
      p.validDays.toString(),
      p.isActive ? 'Hoạt động' : 'Không hoạt động',
      new Date(p.createdAt).toLocaleDateString('vi-VN')
    ]);
    const csv = [
      headers.join(','),
      ...(Array.isArray(rows) ? rows : []).map(row => (Array.isArray(row) ? row.map(cell => `"${cell}"`).join(',') : ''))
    ].join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `packages-${new Date().toLocaleDateString('vi-VN')}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-6">
      <div className="card">
        <div className="card-header flex justify-between items-center gap-2">
          <h2 className="card-title">Packages Management</h2>
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              📥 Export CSV
            </button>
            <button
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              onClick={openCreate}
            >
              Create Package
            </button>
          </div>
        </div>

        {error && (
          <div className="alert mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Lọc nhanh:</span>
          <button
            type="button"
            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              selectedStatus === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
            onClick={() => setSelectedStatus('ALL')}
          >
            Tất cả ({packages.length})
          </button>
          <button
            type="button"
            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              selectedStatus === 'ACTIVE'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
            onClick={() => setSelectedStatus('ACTIVE')}
          >
            Hoạt động ({packages.filter(p => p.isActive).length})
          </button>
          <button
            type="button"
            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              selectedStatus === 'INACTIVE'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
            onClick={() => setSelectedStatus('INACTIVE')}
          >
            Tạm dừng ({packages.filter(p => !p.isActive).length})
          </button>
        </div>

        <AdvancedTable
          columns={[
            {
              key: 'name',
              label: 'Tên gói',
              sortable: true,
              filterable: true,
              render: (value) => <span className="font-medium">{value}</span>
            },
            {
              key: 'description',
              label: 'Mô tả',
              sortable: true,
              filterable: true,
              render: (value) => <span className="text-sm">{value || 'Không có mô tả'}</span>
            },
            {
              key: 'price',
              label: 'Giá',
              sortable: true,
              filterable: false,
              render: (value) => <span className="font-medium">{formatCurrency(value)}</span>
            },
            {
              key: 'credits',
              label: 'Credits',
              sortable: true,
              filterable: false,
              render: (value) => <span>{value === -1 ? 'Không giới hạn' : `${value} credits`}</span>
            },
            {
              key: 'validDays',
              label: 'Hiệu lực',
              sortable: true,
              filterable: false,
              render: (value) => <span>{value} ngày</span>
            },
            {
              key: 'isActive',
              label: 'Trạng thái',
              sortable: true,
              filterable: true,
              render: (value) => (
                <span className={`px-2 py-1 text-xs rounded font-medium ${
                  value 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {value ? 'Hoạt động' : 'Tạm dừng'}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'Thao tác',
              sortable: false,
              filterable: false,
              render: (value, pkg) => (
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${
                      pkg.isActive 
                        ? 'bg-gray-500 text-white hover:bg-gray-600' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                    onClick={() => togglePackageStatus(pkg.id, pkg.isActive)}
                  >
                    {pkg.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                  </button>
                  <button
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                    onClick={() => openEdit(pkg)}
                  >
                    Edit
                  </button>
                  <button
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                    onClick={() => deletePackage(pkg.id)}
                  >
                    Delete
                  </button>
                </div>
              )
            }
          ]}
          data={Array.isArray(filteredPackages) ? filteredPackages : []}
          loading={loading}
          searchable={true}
          filterable={true}
          itemsPerPage={10}
          emptyMessage="Chưa có gói học nào"
        />
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">
              {isEditing ? "Edit Package" : "Create New Package"}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="form-label">Tên gói</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Gói Premium"
                />
              </div>
              <div>
                <label className="form-label">Mô tả</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả chi tiết về gói học"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Giá (VND)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="500000"
                  />
                </div>
                <div>
                  <label className="form-label">Hiệu lực (ngày)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.validDays}
                    onChange={(e) => setForm({ ...form, validDays: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="form-label">Credits</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.credits}
                    onChange={(e) => setForm({ ...form, credits: e.target.value })}
                    placeholder="10 (-1 cho không giới hạn)"
                  />
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
                {isEditing ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}