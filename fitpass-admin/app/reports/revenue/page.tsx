"use client";

import { useEffect, useState } from "react";
import { transactionsAPI } from "@/lib/api";
import { ArrowUpRightIcon, ArrowDownLeftIcon } from "@heroicons/react/24/outline";

type TransactionStat = {
  totalRevenue: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  avgAmount: number;
};

type Transaction = {
  id: string;
  userId: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paymentMethod: string;
  createdAt: string;
  user?: {
    fullName: string;
    email: string;
  };
  userPackage?: {
    package?: {
      name?: string;
    };
  };
};

export default function RevenueReportPage() {
  const [stats, setStats] = useState<TransactionStat>({
    totalRevenue: 0,
    completedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    avgAmount: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedPurpose, setSelectedPurpose] = useState<string>("ALL");
  const [customerSearch, setCustomerSearch] = useState<string>("");

  const normalizeVietnamese = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();

  const getTransactionPurpose = (transaction: Transaction) => {
    const packageName = transaction.userPackage?.package?.name?.trim();
    if (packageName) return `Mua gói: ${packageName}`;
    return "Thanh toán gói học";
  };

  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedStatus("ALL");
    setSelectedPurpose("ALL");
    setCustomerSearch("");
  };

  useEffect(() => {
    fetchRevenuData();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, startDate, endDate, selectedStatus, selectedPurpose, customerSearch]);

  const fetchRevenuData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch transactions
      const response = await transactionsAPI.getAll();
      const data = response?.data || response;
      const txList = Array.isArray(data) ? data : [];
      setTransactions(txList as Transaction[]);

      // Calculate statistics
      const completed = txList.filter((t: Transaction) => t.status === 'COMPLETED');
      const totalRevenue = completed.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const avgAmount = completed.length > 0 ? totalRevenue / completed.length : 0;

      setStats({
        totalRevenue,
        completedCount: completed.length,
        pendingCount: txList.filter((t: Transaction) => t.status === 'PENDING').length,
        failedCount: txList.filter((t: Transaction) => t.status === 'FAILED').length,
        avgAmount: Math.round(avgAmount),
      });
    } catch (err: any) {
      console.error('Error fetching revenue data:', err);
      setError(err?.response?.data?.message || "Failed to fetch revenue data");
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Filter by status
    if (selectedStatus !== "ALL") {
      filtered = filtered.filter(t => t.status === selectedStatus);
    }

    // Filter by purpose
    if (selectedPurpose !== "ALL") {
      filtered = filtered.filter((t) => getTransactionPurpose(t) === selectedPurpose);
    }

    // Search by customer name
    if (customerSearch.trim()) {
      const normalizedSearch = normalizeVietnamese(customerSearch);
      filtered = filtered.filter((t) => {
        const normalizedName = normalizeVietnamese(t.user?.fullName || "");
        return normalizedName.includes(normalizedSearch);
      });
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(t => new Date(t.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.createdAt) <= end);
    }

    setFilteredTransactions(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-900/30';
      case 'PENDING': return 'text-yellow-600 bg-yellow-50 dark:text-yellow-300 dark:bg-yellow-900/30';
      case 'FAILED': return 'text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-900/30';
      case 'CANCELLED': return 'text-gray-600 bg-gray-50 dark:text-gray-300 dark:bg-gray-700';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-300 dark:bg-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Hoàn thành';
      case 'PENDING': return 'Chờ xử lý';
      case 'FAILED': return 'Thất bại';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  };

  const downloadCSV = () => {
    const headers = ['Khách hàng', 'Email', 'Mục đích', 'Số tiền', 'Trạng thái', 'Phương thức', 'Ngày giao dịch'];
    const rows = filteredTransactions.map(t => [
      t.user?.fullName || 'N/A',
      t.user?.email || 'N/A',
      getTransactionPurpose(t),
      t.amount,
      getStatusText(t.status),
      t.paymentMethod || 'N/A',
      new Date(t.createdAt).toLocaleDateString('vi-VN'),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `revenue-report-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">💰 Báo Cáo Doanh Thu</h1>
        <p className="text-gray-600 dark:text-gray-400">Phân tích tổng quan về doanh thu từ các giao dịch</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-green-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Tổng Doanh Thu</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <ArrowUpRightIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>

        {/* Completed Transactions */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-blue-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Giao Dịch Hoàn Thành</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.completedCount}</p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
            Trung bình: {formatCurrency(stats.avgAmount)}
          </p>
        </div>

        {/* Pending Transactions */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-yellow-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Chờ Xử Lý</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.pendingCount}</p>
        </div>

        {/* Failed Transactions */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-l-4 border-red-500 ring-1 ring-gray-100 dark:ring-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Giao Dịch Thất Bại</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.failedCount}</p>
            </div>
            <ArrowDownLeftIcon className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8 border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bộ Lọc</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Từ ngày
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Đến ngày
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trạng thái
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="PENDING">Chờ xử lý</option>
              <option value="FAILED">Thất bại</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mục đích
            </label>
            <select
              value={selectedPurpose}
              onChange={(e) => setSelectedPurpose(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              {Array.from(new Set(transactions.map((t) => getTransactionPurpose(t)))).map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purpose}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tìm khách hàng
            </label>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Nhập tên khách hàng..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-gray-200 dark:border-gray-800 pt-4">
          <button
            onClick={clearAllFilters}
            className="h-10 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium whitespace-nowrap"
          >
            Xóa nhanh bộ lọc
          </button>
          <button
            onClick={downloadCSV}
            className="h-10 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
          >
            📥 Tải CSV
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Chi tiết giao dịch ({filteredTransactions.length})
          </h2>
        </div>
        
        {filteredTransactions.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Không có giao dịch nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Khách hàng</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Mục đích</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Số tiền</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Phương thức</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Ngày giao dịch</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/70">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">{transaction.user?.fullName || 'N/A'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{transaction.user?.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {getTransactionPurpose(transaction)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {transaction.paymentMethod || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(transaction.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
