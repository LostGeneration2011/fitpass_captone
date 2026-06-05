"use client";

import { useEffect, useState } from "react";
import AdvancedTable from "@/components/AdvancedTable";
import { userPackagesAPI, usersAPI, classesAPI } from "@/lib/api";

type BookingItem = {
  id: string;
  userId: string;
  sessionId: string;
  createdAt: string;
  user?: {
    id: string;
    fullName?: string;
    email?: string;
  };
  session: {
    id: string;
    startTime: string;
    endTime: string;
    room?: { id: string; name: string } | null;
    class: {
      id: string;
      name: string;
    };
  };
};

type UserItem = { id: string; fullName?: string; email?: string; role?: string };
type ClassItem = { id: string; name: string };

export default function BookingsPage() {
  const [items, setItems] = useState<BookingItem[]>([]);
  const [students, setStudents] = useState<UserItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    userId: "",
    classId: "",
  });

  const fetchMeta = async () => {
    const [usersRes, classesRes] = await Promise.all([usersAPI.getAll(), classesAPI.getAll()]);
    const users = Array.isArray(usersRes) ? usersRes : usersRes.users || usersRes.data || [];
    const classList = Array.isArray(classesRes) ? classesRes : classesRes.classes || classesRes.data || [];
    setStudents((users as UserItem[]).filter((u) => u.role === "STUDENT"));
    setClasses(classList as ClassItem[]);
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await userPackagesAPI.getBookings({
        userId: filters.userId || undefined,
        classId: filters.classId || undefined,
        page: 1,
        limit: 500,
      });

      const list =
        (Array.isArray(response) && response) ||
        (Array.isArray(response?.data) && response.data) ||
        (Array.isArray(response?.data?.data) && response.data.data) ||
        [];

      setItems(list as BookingItem[]);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load bookings");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchMeta();
        await fetchBookings();
      } catch {
        setError("Failed to load bookings data");
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.userId, filters.classId]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("vi-VN");
  };

  const userLabel = (booking: BookingItem) => {
    if (booking.user?.fullName || booking.user?.email) {
      return booking.user.fullName || booking.user.email || booking.userId;
    }

    const match = students.find((s) => s.id === booking.userId);
    return match?.fullName || match?.email || booking.userId;
  };

  const exportCSV = () => {
    const headers = ["Hoc vien", "Email", "Lop hoc", "Buoi hoc", "Phong", "Thoi gian dat"];
    const rows = items.map((item) => {
      const student = students.find((s) => s.id === item.userId);
      return [
        userLabel(item),
        item.user?.email || student?.email || "",
        item.session?.class?.name || "",
        `${formatDateTime(item.session?.startTime)} - ${formatDateTime(item.session?.endTime)}`,
        item.session?.room?.name || "Chua co phong",
        formatDateTime(item.createdAt),
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")),
    ].join("\n");

    const element = document.createElement("a");
    element.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    element.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-6">
      <div className="card">
        <div className="card-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="card-title">Quản lý đặt chỗ buổi học</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="form-label">Học viên</label>
            <select
              className="form-input"
              value={filters.userId}
              onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value }))}
            >
              <option value="">Tất cả học viên</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName || s.email || s.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Lớp học</label>
            <select
              className="form-input"
              value={filters.classId}
              onChange={(e) => setFilters((prev) => ({ ...prev, classId: e.target.value }))}
            >
              <option value="">Tất cả lớp học</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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
              key: "student",
              label: "Học viên",
              sortable: true,
              filterable: true,
              render: (value, row: BookingItem) => userLabel(row),
            },
            {
              key: "class",
              label: "Lớp học",
              sortable: true,
              filterable: true,
              render: (value, row: BookingItem) => row.session?.class?.name || "-",
            },
            {
              key: "session",
              label: "Thời gian buổi học",
              sortable: true,
              filterable: false,
              render: (value, row: BookingItem) =>
                `${formatDateTime(row.session?.startTime)} - ${formatDateTime(row.session?.endTime)}`,
            },
            {
              key: "room",
              label: "Phòng",
              sortable: true,
              filterable: true,
              render: (value, row: BookingItem) => row.session?.room?.name || "Chưa có phòng",
            },
            {
              key: "createdAt",
              label: "Ngày đặt",
              sortable: true,
              filterable: false,
              render: (value, row: BookingItem) => formatDateTime(row.createdAt),
            },
          ]}
          data={items}
          loading={loading}
          searchable={true}
          filterable={true}
          itemsPerPage={15}
          emptyMessage="Chưa có lượt đặt chỗ nào"
        />
      </div>
    </div>
  );
}
