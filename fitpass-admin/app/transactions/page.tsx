"use client";

import { useEffect, useState } from "react";
import { transactionsAPI } from "@/lib/api";
import AdvancedTable from "@/components/AdvancedTable";

type Transaction = {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paymentMethod: string;
  paypalOrderId?: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  userPackage?: {
    id: string;
    package?: {
      id: string;
      name: string;
      price: number;
    };
  };
  // Legacy support for direct package relation
  package?: {
    id: string;
    name: string;
    price: number;
  };
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await transactionsAPI.getAll();
      // Handle paginated response format
      const data = response?.data || response;
      const txList = Array.isArray(data) ? data : [];
      setAllTransactions(txList);
      setTransactions(txList);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError(err?.response?.data?.message || "Failed to fetch transactions");
      setAllTransactions([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const updateTransactionStatus = async (id: string, status: string) => {
    try {
      await transactionsAPI.updateStatus(id, status);
      await fetchTransactions(); // Refresh data
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to update transaction`);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    let filtered = [...allTransactions];
    
    if (startDate) {
      filtered = filtered.filter(t => new Date(t.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.createdAt) <= endDateTime);
    }
    
    setTransactions(filtered);
  }, [startDate, endDate, allTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'PENDING': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 'FAILED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Hoàn thành';
      case 'PENDING': return 'Đang xử lý';
      case 'FAILED': return 'Thất bại';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  };

  const downloadCSV = () => {
    const headers = ['ID', 'Khách hàng', 'Số tiền', 'Phương thức', 'Trạng thái', 'Ngày tạo'];
    const rows = (Array.isArray(transactions) ? transactions : []).map(t => [
      t.id,
      t.user?.fullName || 'N/A',
      t.amount.toString(),
      t.paymentMethod || 'PayPal',
      getStatusText(t.status),
      new Date(t.createdAt).toLocaleDateString('vi-VN')
    ]);
    const csv = [
      headers.join(','),
      ...(Array.isArray(rows) ? rows : []).map(row => (Array.isArray(row) ? row.map(cell => `"${cell}"`).join(',') : ''))
    ].join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `transactions-${new Date().toLocaleDateString('vi-VN')}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-6">
      <div className="card">
        <div className="card-header flex justify-between items-start">
          <div>
            <h2 className="card-title">Transactions Management</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Quản lý các giao dịch thanh toán</p>
          </div>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            📥 Export CSV
          </button>
        </div>

        {error && (
          <div className="alert mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Từ ngày
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Đến ngày
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input w-full"
            />
          </div>
          <button
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
          >
            Xóa bộ lọc
          </button>
        </div>

        <AdvancedTable
          columns={[
            {
              key: 'user',
              label: 'Người dùng',
              sortable: true,
              filterable: true,
              render: (value, transaction) => (
                <div>
                  <div className="font-medium">{transaction.user?.fullName || 'N/A'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{transaction.user?.email}</div>
                </div>
              )
            },
            {
              key: 'package',
              label: 'Gói học',
              sortable: true,
              filterable: true,
              render: (value, transaction) => (
                <div>
                  <div className="font-medium">{transaction.userPackage?.package?.name || 'N/A'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {transaction.userPackage?.package?.price ? formatCurrency(transaction.userPackage.package.price) : 'N/A'}
                  </div>
                </div>
              )
            },
            {
              key: 'amount',
              label: 'Số tiền',
              sortable: true,
              filterable: false,
              render: (value) => <span className="font-medium">{formatCurrency(value)}</span>
            },
            {
              key: 'method',
              label: 'PayPal',
              sortable: false,
              filterable: false,
              render: () => (
                <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  PayPal
                </span>
              )
            },
            {
              key: 'status',
              label: 'Trạng thái',
              sortable: true,
              filterable: true,
              render: (value) => (
                <span className={`px-2 py-1 text-xs rounded font-medium ${getStatusColor(value)}`}>
                  {getStatusText(value)}
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
              label: 'Thao tác',
              sortable: false,
              filterable: false,
              render: (value, transaction) => (
                <div className="flex items-center gap-1 flex-wrap">
                  {transaction.status === 'PENDING' && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      ⏳ Đang xử lý PayPal...
                    </span>
                  )}
                  {transaction.status === 'COMPLETED' && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✅ Thanh toán thành công
                    </span>
                  )}
                  {transaction.status === 'FAILED' && (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      ❌ Thanh toán thất bại
                    </span>
                  )}
                  {(transaction.status === 'COMPLETED' || transaction.status === 'FAILED') && (
                    <button
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors ml-2"
                      onClick={() => {
                        const newStatus = transaction.status === 'COMPLETED' ? 'FAILED' : 'COMPLETED';
                        if (confirm(`Thay đổi trạng thái thành ${newStatus === 'COMPLETED' ? 'Thành công' : 'Thất bại'}?`)) {
                          updateTransactionStatus(transaction.id, newStatus);
                        }
                      }}
                    >
                      Override
                    </button>
                  )}
                </div>
              )
            }
          ]}
          data={Array.isArray(transactions) ? transactions : []}
          loading={loading}
          searchable={true}
          filterable={true}
          itemsPerPage={15}
          emptyMessage="Chưa có giao dịch nào"
        />
      </div>
    </div>
  );
}