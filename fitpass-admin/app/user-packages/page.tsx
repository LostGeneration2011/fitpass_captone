"use client";

import { useEffect, useState } from "react";
import { userPackagesAPI, usersAPI, packagesAPI } from "@/lib/api";
import AdvancedTable from "@/components/AdvancedTable";
import { useToast } from "@/lib/toast";

type UserPackage = {
  id: string;
  userId: string;
  packageId: string;
  creditsLeft: number;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  purchasedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  package?: {
    id: string;
    name: string;
    price: number;
    credits: number;
    validDays: number;
  };
};

type UserPackageStatus = {
  userPackage: {
    id: string;
    status: string;
    creditsLeft: number;
    expiresAt: string | null;
    purchasedAt: string;
  };
  package: {
    name: string;
    originalCredits: number;
    price: number;
    validDays: number;
  };
  transactions: Array<{
    id: string;
    status: string;
    amount: number;
    paymentMethod: string;
    paymentId: string | null;
    createdAt: string;
  }>;
  bookings: Array<{
    id: string;
    creditsUsed: number;
    sessionName: string | null;
    createdAt: string;
  }>;
  summary: {
    isExpired: boolean;
    isActive: boolean;
    hasPaymentCompleted: boolean;
    totalBookings: number;
    creditsUsed: number;
  };
};

export default function UserPackagesPage() {
  const [userPackages, setUserPackages] = useState<UserPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<UserPackageStatus | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const { showToast } = useToast();

  const fetchUserPackages = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await userPackagesAPI.getAll();
      console.log("User packages response:", response);

      if (response.success) {
        setUserPackages(response.data || []);
      } else {
        throw new Error(response.message || "Failed to fetch user packages");
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch user packages");
      showToast(err.message || "Failed to fetch user packages", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStatus = async (userPackage: UserPackage) => {
    try {
      const response = await userPackagesAPI.getStatus(userPackage.id);
      console.log("Package status response:", response);

      if (response.success) {
        setSelectedPackage(response.data);
        setShowStatusModal(true);
      } else {
        throw new Error(response.message || "Failed to fetch package status");
      }
    } catch (err: any) {
      console.error("Status fetch error:", err);
      showToast(err.message || "Failed to fetch package status", 'error');
    }
  };

  useEffect(() => {
    fetchUserPackages();
  }, []);

  const downloadCSV = () => {
    const headers = ['Học viên', 'Email', 'Gói học', 'Credits còn lại', 'Trạng thái', 'Ngày mua', 'Hết hạn'];
    const rows = (Array.isArray(userPackages) ? userPackages : []).map(up => [
      up.user?.fullName || 'N/A',
      up.user?.email || 'N/A',
      up.package?.name || 'N/A',
      up.creditsLeft.toString(),
      up.status,
      new Date(up.purchasedAt).toLocaleDateString('vi-VN'),
      up.expiresAt ? new Date(up.expiresAt).toLocaleDateString('vi-VN') : 'Never'
    ]);
    const csv = [
      headers.join(','),
      ...(Array.isArray(rows) ? rows : []).map(row => (Array.isArray(row) ? row.map(cell => `"${cell}"`).join(',') : ''))
    ].join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `user-packages-${new Date().toLocaleDateString('vi-VN')}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const columns = [
    { 
      key: "id", 
      label: "User Package ID",
      render: (value: string) => (
        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
          {value.substring(0, 8)}...
        </span>
      )
    },
    { 
      key: "user.fullName", 
      label: "Student Name",
      render: (value: string, row: UserPackage) => (
        <div>
          <div className="font-medium">{value || row.userId}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.user?.email}</div>
        </div>
      )
    },
    { 
      key: "package.name", 
      label: "Package",
      render: (value: string, row: UserPackage) => (
        <div>
          <div className="font-medium">{value || row.packageId}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {row.package?.credits} credits - {row.package?.price?.toLocaleString()} VND
          </div>
        </div>
      )
    },
    { 
      key: "status", 
      label: "Status",
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
          value === 'EXPIRED' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
        }`}>
          {value}
        </span>
      )
    },
    { 
      key: "creditsLeft", 
      label: "Credits Left",
      render: (value: number, row: UserPackage) => (
        <div className="text-center">
          <div className="font-bold text-lg text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            / {row.package?.credits || 0}
          </div>
        </div>
      )
    },
    { 
      key: "purchasedAt", 
      label: "Purchased",
      render: (value: string) => new Date(value).toLocaleDateString('vi-VN')
    },
    { 
      key: "expiresAt", 
      label: "Expires",
      render: (value: string | null) => {
        if (!value) return <span className="text-gray-400 dark:text-gray-500">Never</span>;
        const expireDate = new Date(value);
        const isExpired = expireDate < new Date();
        return (
          <span className={isExpired ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
            {expireDate.toLocaleDateString('vi-VN')}
          </span>
        );
      }
    },
    { 
      key: "actions", 
      label: "Actions",
      render: (value: any, row: UserPackage) => (
        <button
          onClick={() => handleViewStatus(row)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          View Details
        </button>
      )
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-900 dark:text-white">Loading user packages...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">User Packages Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and monitor student package purchases and credit usage
          </p>
        </div>
        <button
          onClick={downloadCSV}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium text-sm"
        >
          📥 Export CSV
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button 
            onClick={fetchUserPackages}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      <AdvancedTable
        data={userPackages}
        columns={columns}
      />

      {/* Status Detail Modal */}
      {showStatusModal && selectedPackage && (
        <div className="fixed inset-0 z-9999 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Package Status Details</h2>
                <button 
                  onClick={() => setShowStatusModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {/* Package Overview */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                  <h3 className="font-semibold mb-2">Package Info</h3>
                  <p><strong>Name:</strong> {selectedPackage.package.name}</p>
                  <p><strong>Price:</strong> {selectedPackage.package.price.toLocaleString()} VND</p>
                  <p><strong>Original Credits:</strong> {selectedPackage.package.originalCredits}</p>
                  <p><strong>Valid Days:</strong> {selectedPackage.package.validDays}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                  <h3 className="font-semibold mb-2">Current Status</h3>
                  <p><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${
                      selectedPackage.userPackage.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                      'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                    }`}>
                      {selectedPackage.userPackage.status}
                    </span>
                  </p>
                  <p><strong>Credits Left:</strong> {selectedPackage.userPackage.creditsLeft}</p>
                  <p><strong>Purchased:</strong> {new Date(selectedPackage.userPackage.purchasedAt).toLocaleString('vi-VN')}</p>
                  <p><strong>Expires:</strong> {selectedPackage.userPackage.expiresAt 
                    ? new Date(selectedPackage.userPackage.expiresAt).toLocaleString('vi-VN') 
                    : 'Never'}</p>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded text-gray-900 dark:text-gray-100">
                <h3 className="font-semibold mb-2">Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Is Active:</strong> {selectedPackage.summary.isActive ? '✅ Yes' : '❌ No'}</p>
                    <p><strong>Is Expired:</strong> {selectedPackage.summary.isExpired ? '⚠️ Yes' : '✅ No'}</p>
                  </div>
                  <div>
                    <p><strong>Payment Completed:</strong> {selectedPackage.summary.hasPaymentCompleted ? '✅ Yes' : '❌ No'}</p>
                    <p><strong>Total Bookings:</strong> {selectedPackage.summary.totalBookings}</p>
                    <p><strong>Credits Used:</strong> {selectedPackage.summary.creditsUsed}</p>
                  </div>
                </div>
              </div>

              {/* Transactions */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Transactions</h3>
                {selectedPackage.transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 dark:border-gray-700">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Transaction ID</th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Status</th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Amount</th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Method</th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Payment ID</th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(selectedPackage?.transactions) ? selectedPackage.transactions : []).map((transaction) => (
                          <tr key={transaction.id} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-2 font-mono text-xs text-gray-900 dark:text-gray-100">{transaction.id.substring(0, 8)}...</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                transaction.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                                transaction.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                                'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              }`}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{transaction.amount.toLocaleString()} VND</td>
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{transaction.paymentMethod}</td>
                            <td className="px-4 py-2 font-mono text-xs text-gray-900 dark:text-gray-100">{transaction.paymentId || 'N/A'}</td>
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{new Date(transaction.createdAt).toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
                )}
              </div>

              {/* Bookings */}
              <div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Bookings</h3>
                {selectedPackage.bookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 dark:border-gray-700">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Booking ID</th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Session</th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Credits Used</th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Booked At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(selectedPackage?.bookings) ? selectedPackage.bookings : []).map((booking) => (
                          <tr key={booking.id} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-2 font-mono text-xs text-gray-900 dark:text-gray-100">{booking.id.substring(0, 8)}...</td>
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{booking.sessionName || 'Unknown Session'}</td>
                            <td className="px-4 py-2 text-center text-gray-900 dark:text-gray-100">{booking.creditsUsed}</td>
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{new Date(booking.createdAt).toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No bookings found</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}