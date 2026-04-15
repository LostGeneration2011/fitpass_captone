"use client";

import { useEffect, useState } from "react";
import { salaryAPI } from "@/lib/api";
import { useToast } from "@/lib/toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import AdvancedTable from "@/components/AdvancedTable";

type Teacher = {
  id: string;
  fullName: string;
  email: string;
  hourlyRate: number;
  totalHours: number;
  totalEarnings: number;
  totalSessions: number;
  salaryOwed: number;
  unpaidAmount: number;
  classesCount: number;
};

type PaymentHistory = {
  id: string;
  teacherId: string;
  teacherName: string;
  amount: number;
  paidDate: string;
  paidBy: string;
  paymentMethod: string;
  note: string;
};

export default function TeacherSalaryPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [minOwed, setMinOwed] = useState("");
  const { showToast } = useToast();
  
  // Payment history modal
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  
  // Confirm dialogs state
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
    type: 'warning'
  });

  const fetchTeachers = async () => {
    try {
      const data = await salaryAPI.getTeacherOverview();
      const teachersList = Array.isArray(data) ? data : [];
      setAllTeachers(teachersList);
      setTeachers(teachersList);
    } catch (err: any) {
      console.error('Error fetching teachers:', err);
      setError(err?.response?.data?.message || "Failed to fetch teachers");
      setAllTeachers([]);
      setTeachers([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchTeachers();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    let filtered = [...allTeachers];
    
    if (minOwed) {
      const minAmount = parseFloat(minOwed);
      if (!isNaN(minAmount)) {
        filtered = filtered.filter(t => t.unpaidAmount >= minAmount);
      }
    }
    
    setTeachers(filtered);
  }, [minOwed, allTeachers]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  const stats = {
    totalTeachers: Array.isArray(teachers) ? teachers.length : 0,
    totalOwed: Array.isArray(teachers) ? teachers.reduce((sum, t) => sum + (t.unpaidAmount || 0), 0) : 0,
    totalPaid: 0, // Will be calculated from payment history
  };

  const downloadCSV = () => {
    const headers = ['Giáo viên', 'Email', 'Số giờ', 'Lương theo giờ', 'Tổng thu nhập', 'Còn nợ', 'Trạng thái'];
    const rows = (Array.isArray(teachers) ? teachers : []).map(t => [
      t.fullName || 'N/A',
      t.email || 'N/A',
      t.totalHours.toString(),
      t.hourlyRate.toString(),
      t.totalEarnings.toString(),
      t.unpaidAmount.toString(),
      t.unpaidAmount > 0 ? 'Còn nợ' : 'Đã thanh toán'
    ]);
    const csv = [
      headers.join(','),
      ...(Array.isArray(rows) ? rows : []).map(row => (Array.isArray(row) ? row.map(cell => `"${cell}"`).join(',') : ''))
    ].join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `payroll-${new Date().toLocaleDateString('vi-VN')}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Simple input modal state
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputModalData, setInputModalData] = useState<{
    title: string;
    label: string;
    value: string;
    onConfirm: (value: string) => void;
  } | null>(null);

  const updateTeacherHourlyRate = async (teacherId: string, teacherName: string, currentRate: number) => {
    setInputModalData({
      title: 'Cập nhật lương giáo viên',
      label: `Mức lương mới cho ${teacherName} (VND/giờ):`,
      value: currentRate.toString(),
      onConfirm: async (newRateStr: string) => {
        const newRate = Number(newRateStr);
        if (isNaN(newRate) || newRate <= 0) {
          showToast('Vui lòng nhập mức lương hợp lệ', 'error');
          return;
        }

        try {
          await salaryAPI.updateHourlyRate(teacherId, newRate);
          showToast(`Đã cập nhật lương ${teacherName}: ${formatCurrency(newRate)}`, 'success');
          await fetchTeachers();
          setShowInputModal(false);
        } catch (error: any) {
          console.error('Error updating hourly rate:', error);
          showToast(`Lỗi cập nhật lương: ${error.message}`, 'error');
        }
      }
    });
    setShowInputModal(true);
  };

  const payTeacherSalary = async (teacherId: string, teacherName: string, amount: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận thanh toán lương',
      message: `Xác nhận thanh toán ${formatCurrency(amount)} cho ${teacherName}?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await salaryAPI.payTeacher(teacherId, amount);
          
          showToast(`Đã thanh toán lương cho ${teacherName}`, 'success');
          await fetchTeachers();
        } catch (error: any) {
          console.error('Error paying salary:', error);
          showToast(`Lỗi thanh toán: ${error.message}`, 'error');
        }
      }
    });
  };

  const showPaymentHistory = async () => {
    try {
      const data = await salaryAPI.getPayrollHistory('PAID');
      const formattedHistory = (Array.isArray(data) ? data : []).map((record: any) => ({
        id: record.id,
        teacherId: record.teacherId,
        teacherName: record.teacher?.fullName || record.teacher?.email || 'Unknown',
        amount: record.totalAmount || record.amount || 0,
        paidDate: record.paidDate || record.updatedAt || new Date().toISOString(),
        paidBy: record.paidByAdmin?.fullName || record.paidByAdmin?.email || 'Admin',
        paymentMethod: record.paymentMethod || 'Bank Transfer',
        note: record.paymentNote || record.note || `Lương tháng ${record.month}/${record.year}`
      }));
      setPaymentHistory(formattedHistory);
      setShowPaymentHistoryModal(true);
    } catch (error: any) {
      console.error('Payment history error:', error);
      showToast('Không thể tải lịch sử thanh toán', 'error');
    }
  };

  const exportSalaryReport = async () => {
    try {
      showToast('Đang xuất báo cáo...', 'info');
      
      // Create HTML table for Excel import (Excel can read HTML tables perfectly)
      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .number { text-align: right; }
          </style>
        </head>
        <body>
          <h2>Báo cáo lương giáo viên - ${new Date().toLocaleDateString('vi-VN')}</h2>
          <table>
            <thead>
              <tr>
                <th>Giáo viên</th>
                <th>Email</th>
                <th>Lương/giờ (VND)</th>
                <th>Tổng giờ</th>
                <th>Tổng lương (VND)</th>
                <th>Chưa trả (VND)</th>
              </tr>
            </thead>
            <tbody>
              ${(Array.isArray(teachers) ? teachers : []).map(teacher => `
                <tr>
                  <td>${teacher.fullName || teacher.email}</td>
                  <td>${teacher.email}</td>
                  <td class="number">${teacher.hourlyRate.toLocaleString('vi-VN')}</td>
                  <td class="number">${teacher.totalHours}</td>
                  <td class="number">${teacher.totalEarnings.toLocaleString('vi-VN')}</td>
                  <td class="number">${teacher.unpaidAmount.toLocaleString('vi-VN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p><strong>Tổng giáo viên:</strong> ${teachers.length}</p>
          <p><strong>Tổng lương chưa trả:</strong> ${teachers.reduce((sum, t) => sum + t.unpaidAmount, 0).toLocaleString('vi-VN')} VND</p>
        </body>
        </html>
      `;

      // Create and download as Excel file
      const blob = new Blob([htmlContent], { 
        type: 'application/vnd.ms-excel;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bao-cao-luong-giao-vien-${new Date().toISOString().slice(0, 10)}.xls`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      showToast('Đã xuất báo cáo Excel thành công', 'success');
    } catch (error: any) {
      console.error('Export error:', error);
      showToast('Lỗi xuất báo cáo', 'error');
    }
  };

  // Export individual teacher report
  const exportTeacherReport = async (teacher: Teacher) => {
    try {
      showToast(`Đang xuất báo cáo cho ${teacher.fullName || teacher.email}...`, 'info');
      
      // Get detailed payment history for this teacher
      let paymentHistory: any[] = [];
      try {
        const historyData = await salaryAPI.getTeacherHistory(teacher.id);
        paymentHistory = historyData || [];
      } catch (err) {
        // If no specific endpoint, use general payroll data filtered
        const allPayments = await salaryAPI.getPayrollHistory('PAID');
        paymentHistory = (allPayments || []).filter((payment: any) => payment.teacherId === teacher.id);
      }

      const currentDate = new Date().toLocaleDateString('vi-VN');
      const teacherName = teacher.fullName || teacher.email;
      
      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info-section { margin-bottom: 25px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .number { text-align: right; }
            .total-row { background-color: #e6f3ff; font-weight: bold; }
            .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BÁO CÁO LƯƠNG GIÁO VIÊN</h1>
            <h2>${teacherName}</h2>
            <p>Ngày xuất báo cáo: ${currentDate}</p>
          </div>
          
          <div class="info-section">
            <h3>Thông tin giáo viên:</h3>
            <div class="info-row"><span><strong>Họ tên:</strong></span> <span>${teacherName}</span></div>
            <div class="info-row"><span><strong>Email:</strong></span> <span>${teacher.email}</span></div>
            <div class="info-row"><span><strong>Mức lương/giờ:</strong></span> <span>${formatCurrency(teacher.hourlyRate)}</span></div>
            <div class="info-row"><span><strong>Số lớp đang dạy:</strong></span> <span>${teacher.classesCount || 0} lớp</span></div>
          </div>
          
          <div class="summary">
            <h3>Tóm tắt lương:</h3>
            <div class="info-row"><span><strong>Tổng giờ đã dạy:</strong></span> <span>${teacher.totalHours} giờ</span></div>
            <div class="info-row"><span><strong>Tổng lương phải trả:</strong></span> <span>${formatCurrency(teacher.totalEarnings)}</span></div>
            <div class="info-row"><span><strong>Tổng đã thanh toán:</strong></span> <span>${formatCurrency(teacher.totalEarnings - teacher.unpaidAmount)}</span></div>
            <div class="info-row"><span><strong>Số tiền chưa trả:</strong></span> <span style="color: red;">${formatCurrency(teacher.unpaidAmount)}</span></div>
          </div>
          
          ${paymentHistory.length > 0 ? `
          <h3>Lịch sử thanh toán:</h3>
          <table>
            <thead>
              <tr>
                <th>Ngày thanh toán</th>
                <th>Số tiền</th>
                <th>Phương thức</th>
                <th>Người duyệt</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${(Array.isArray(paymentHistory) ? paymentHistory : []).map(payment => `
                <tr>
                  <td>${new Date(payment.paidDate || payment.updatedAt).toLocaleDateString('vi-VN')}</td>
                  <td class="number">${(payment.totalAmount || payment.amount || 0).toLocaleString('vi-VN')} VND</td>
                  <td>${payment.paymentMethod || 'Bank Transfer'}</td>
                  <td>${payment.paidByAdmin?.fullName || payment.paidByAdmin?.email || 'Admin'}</td>
                  <td>${payment.paymentNote || payment.note || ''}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Tổng đã thanh toán</strong></td>
                <td class="number"><strong>${paymentHistory.reduce((sum, p) => sum + (p.totalAmount || p.amount || 0), 0).toLocaleString('vi-VN')} VND</strong></td>
                <td colspan="3"></td>
              </tr>
            </tbody>
          </table>
          ` : '<p><em>Chưa có lịch sử thanh toán</em></p>'}
          
          <div style="margin-top: 40px; text-align: right;">
            <p><strong>Người xuất báo cáo:</strong> Admin</p>
            <p><strong>Ngày xuất:</strong> ${currentDate}</p>
          </div>
        </body>
        </html>
      `;

      // Create and download file
      const blob = new Blob([htmlContent], { 
        type: 'application/vnd.ms-excel;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const fileName = `bao-cao-luong-${teacherName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.xls`;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      showToast(`Đã xuất báo cáo cho ${teacherName} thành công`, 'success');
    } catch (error: any) {
      console.error('Export teacher report error:', error);
      showToast(`Lỗi xuất báo cáo cho ${teacher.fullName || teacher.email}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="stats-card">
        <div className="stats-number">Loading...</div>
        <div className="stats-label">Đang tải dữ liệu lương giáo viên</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quản lý lương giáo viên</h2>
          <div className="flex gap-3">
            <button className="btn btn-secondary" onClick={exportSalaryReport}>
              📊 Xuất báo cáo
            </button>
            <button className="btn btn-primary" onClick={showPaymentHistory}>
              📝 Lịch sử thanh toán
            </button>
          </div>
        </div>

        {error && (
          <div className="alert mb-4 rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-danger">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="stats-card">
            <div className="stats-number">{stats.totalTeachers}</div>
            <div className="stats-label">Tổng giáo viên</div>
          </div>

          <div className="stats-card">
            <div className="stats-number text-red-600">{formatCurrency(stats.totalOwed)}</div>
            <div className="stats-label">Tổng lương chưa trả</div>
          </div>

          <div className="stats-card">
            <div className="stats-number text-green-600">{formatCurrency(stats.totalPaid)}</div>
            <div className="stats-label">Tổng đã trả trong tháng</div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lương còn nợ tối thiểu (VND)
              </label>
              <input
                type="number"
                value={minOwed}
                onChange={(e) => setMinOwed(e.target.value)}
                placeholder="Nhập số tiền..."
                className="form-input w-full"
              />
            </div>
            <button
              onClick={() => setMinOwed("")}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* Teacher Salary Overview */}
        <AdvancedTable
          columns={[
            {
              key: 'fullName', // Thay đổi từ 'teacher' thành 'fullName' để search hoạt động
              label: 'GIÁO VIÊN',
              sortable: true,
              filterable: true,
              render: (value, teacher) => (
                <div>
                  <div className="font-medium text-black dark:text-white">
                    {teacher.fullName || teacher.email}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{teacher.email}</div>
                </div>
              )
            },
            {
              key: 'hourlyRate',
              label: 'LƯƠNG/GIỜ',
              sortable: true,
              filterable: false,
              render: (value) => (
                <span className="font-medium text-primary">
                  {formatCurrency(value)}
                </span>
              )
            },
            {
              key: 'totalHours',
              label: 'TỔNG GIỜ DẠY',
              sortable: true,
              filterable: false,
              render: (value) => <span>{value} giờ</span>
            },
            {
              key: 'totalEarnings',
              label: 'LƯƠNG PHẢI TRẢ',
              sortable: true,
              filterable: false,
              render: (value) => (
                <span className="font-medium text-success">
                  {formatCurrency(value)}
                </span>
              )
            },
            {
              key: 'unpaidAmount',
              label: 'LƯƠNG CHƯA TRẢ',
              sortable: true,
              filterable: false,
              render: (value) => (
                <span className="font-medium text-danger">
                  {formatCurrency(value)}
                </span>
              )
            },
            {
              key: 'activity',
              label: 'HOẠT ĐỘNG',
              sortable: false,
              filterable: false,
              render: (value, teacher) => (
                <div className="text-sm">
                  <div>{teacher.classesCount || 0} lớp</div>
                  <div>{teacher.totalSessions || 0} buổi dạy</div>
                </div>
              )
            },
            {
              key: 'actions',
              label: 'ACTIONS',
              sortable: false,
              filterable: false,
              render: (value, teacher) => (
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="btn btn-primary text-xs px-2 py-1"
                    onClick={() => updateTeacherHourlyRate(teacher.id, teacher.fullName || teacher.email, teacher.hourlyRate)}
                  >
                    Cập nhật lương
                  </button>
                  
                  {teacher.unpaidAmount > 0 && (
                    <button
                      className="btn btn-success text-xs px-2 py-1"
                      onClick={() => payTeacherSalary(teacher.id, teacher.fullName || teacher.email, teacher.unpaidAmount)}
                    >
                      Thanh toán
                    </button>
                  )}
                  
                  <button
                    className="btn btn-secondary text-xs px-2 py-1"
                    onClick={() => exportTeacherReport(teacher)}
                    title="Xuất báo cáo lương"
                  >
                    📊 Báo cáo
                  </button>
                </div>
              )
            }
          ]}
          data={Array.isArray(teachers) ? teachers : []}
          loading={loading}
          searchable={true}
          filterable={true}
          itemsPerPage={10}
          emptyMessage="Chưa có giáo viên nào"
        />
      </div>
      
      {/* Payment History Modal */}
      {showPaymentHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="card max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="card-header">
              <h3 className="card-title">Lịch sử thanh toán lương</h3>
              <button
                onClick={() => setShowPaymentHistoryModal(false)}
                className="btn btn-secondary"
              >
                Đóng
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Giáo viên</th>
                    <th>Số tiền</th>
                    <th>Ngày trả</th>
                    <th>Phương thức</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(paymentHistory) && paymentHistory.length > 0 ? paymentHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.teacherName}</td>
                      <td className="font-medium text-success">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td>{new Date(payment.paidDate).toLocaleDateString('vi-VN')}</td>
                      <td>{payment.paymentMethod}</td>
                      <td>{payment.note}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-500 dark:text-gray-400">
                        Chưa có lịch sử thanh toán
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Simple Input Modal */}
      {showInputModal && inputModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="card max-w-md w-full mx-4">
            <div className="card-header">
              <h3 className="card-title">{inputModalData.title}</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                {inputModalData.label}
              </label>
              <input
                type="number"
                defaultValue={inputModalData.value}
                className="form-input w-full"
                placeholder="Nhập số tiền..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value;
                    inputModalData.onConfirm(value);
                  }
                  if (e.key === 'Escape') {
                    setShowInputModal(false);
                  }
                }}
                id="salary-input"
              />
              <div className="flex gap-3 justify-end mt-4">
                <button
                  onClick={() => setShowInputModal(false)}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    const input = document.getElementById('salary-input') as HTMLInputElement;
                    if (input) {
                      inputModalData.onConfirm(input.value);
                    }
                  }}
                  className="btn btn-primary"
                >
                  Cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm Dialog */}
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