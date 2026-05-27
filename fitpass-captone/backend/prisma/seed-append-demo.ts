import { PrismaClient, AttendanceStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function ensureDemoUsers() {
  const hashedPassword = await bcrypt.hash('FitPass@2024!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fitpass.com' },
    update: {},
    create: {
      email: 'admin@fitpass.com',
      password: hashedPassword,
      fullName: 'Admin FitPass',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  const idleTeacher = await prisma.user.upsert({
    where: { email: 'giaovien0@fitpass.com' },
    update: {},
    create: {
      email: 'giaovien0@fitpass.com',
      password: hashedPassword,
      fullName: 'Giáo viên Chưa Có Ca Dạy',
      role: UserRole.TEACHER,
      emailVerified: true,
      hourlyRate: 220000,
      salaryOwed: 0,
      teacherBio: 'Tài khoản append-seed để kiểm tra trạng thái chưa phát sinh công dạy.',
      teacherExperienceYears: 1,
      teacherSpecialties: ['Demo Payroll'],
      teacherCertifications: ['Internal Demo'],
      teacherHighlights: ['Chưa có buổi dạy DONE để test rule thanh toán'],
    },
  });

  return { admin, idleTeacher };
}

async function appendPayrollScenarios(adminId: string) {
  const teachers = await prisma.user.findMany({
    where: { role: UserRole.TEACHER },
    include: {
      classesTeaching: {
        include: {
          sessions: {
            where: { status: 'DONE' },
          },
        },
      },
      salaryRecords: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (teachers.length === 0) {
    console.log('No teacher found. Skip payroll append.');
    return;
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  for (let i = 0; i < teachers.length; i++) {
    const teacher = teachers[i];
    if (!teacher) continue;

    let totalDoneHours = 0;
    teacher.classesTeaching.forEach((cls) => {
      cls.sessions.forEach((session) => {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        totalDoneHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      });
    });

    const roundedHours = Math.round(totalDoneHours * 100) / 100;
    if (roundedHours <= 0) {
      continue;
    }

    const hourlyRate = teacher.hourlyRate || 250000;
    const totalEarnings = Math.round(roundedHours * hourlyRate);

    const existingCurrentMonthRecord = teacher.salaryRecords.find(
      (record) => record.month === currentMonth && record.year === currentYear
    );

    if (existingCurrentMonthRecord) {
      continue;
    }

    const scenarioIndex = i % 3;
    const status = scenarioIndex === 0 ? 'PENDING' : 'PAID';
    const amount =
      scenarioIndex === 2
        ? Math.max(1, Math.round(totalEarnings * 0.5))
        : totalEarnings;

    await prisma.salaryRecord.create({
      data: {
        teacherId: teacher.id,
        month: currentMonth,
        year: currentYear,
        totalHours: roundedHours,
        hourlyRate,
        totalAmount: amount,
        status,
        paidDate: status === 'PAID' ? new Date() : null,
        paidBy: status === 'PAID' ? adminId : null,
        paymentMethod: status === 'PAID' ? 'BANK_TRANSFER' : null,
        note: 'Append seed payroll scenario',
        paymentNote: status === 'PAID' ? 'Append seed payment' : null,
      },
    });
  }

  console.log('Appended payroll scenarios without deleting existing records.');
}

async function appendAttendanceScenarios() {
  const enrollments = await prisma.enrollment.findMany({
    select: { id: true, classId: true, studentId: true },
  });

  const enrollmentByClass = new Map<string, Array<{ id: string; classId: string; studentId: string }>>();
  for (const enrollment of enrollments) {
    const list = enrollmentByClass.get(enrollment.classId) || [];
    list.push(enrollment);
    enrollmentByClass.set(enrollment.classId, list);
  }

  const sessions = await prisma.session.findMany({
    orderBy: { startTime: 'desc' },
    select: {
      id: true,
      classId: true,
      startTime: true,
      status: true,
    },
  });

  const doneSessions = sessions.filter((s) => s.status === 'DONE').slice(0, 120);
  const latestSessions = sessions.slice(0, 10);

  const rows: Array<{
    sessionId: string;
    studentId: string;
    enrollmentId: string;
    status: AttendanceStatus;
    checkedInAt: Date;
  }> = [];

  for (let i = 0; i < doneSessions.length; i++) {
    const session = doneSessions[i];
    if (!session) continue;
    const classEnrollments = (enrollmentByClass.get(session.classId) || []).slice(0, 6);

    for (let j = 0; j < classEnrollments.length; j++) {
      const enrollment = classEnrollments[j];
      if (!enrollment) continue;
      const checkedInAt = new Date(session.startTime);
      checkedInAt.setMinutes(checkedInAt.getMinutes() + (j % 3) * 5);

      rows.push({
        sessionId: session.id,
        studentId: enrollment.studentId,
        enrollmentId: enrollment.id,
        status: (i + j) % 5 === 0 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
        checkedInAt,
      });
    }
  }

  for (const session of latestSessions) {
    const classEnrollments = (enrollmentByClass.get(session.classId) || []).slice(0, 8);

    for (let j = 0; j < classEnrollments.length; j++) {
      const enrollment = classEnrollments[j];
      if (!enrollment) continue;
      const checkedInAt = new Date(session.startTime);
      checkedInAt.setMinutes(checkedInAt.getMinutes() + j);

      rows.push({
        sessionId: session.id,
        studentId: enrollment.studentId,
        enrollmentId: enrollment.id,
        status: AttendanceStatus.PRESENT,
        checkedInAt,
      });
    }
  }

  if (rows.length > 0) {
    const result = await prisma.attendance.createMany({
      data: rows,
      skipDuplicates: true,
    });

    console.log(`Appended ${result.count} attendance rows (duplicates skipped).`);
  }
}

async function main() {
  console.log('Starting append seed (non-destructive)...');
  const { admin } = await ensureDemoUsers();
  await appendPayrollScenarios(admin.id);
  await appendAttendanceScenarios();
  console.log('Append seed completed successfully. Existing data preserved.');
}

main()
  .catch((e) => {
    console.error('Append seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
