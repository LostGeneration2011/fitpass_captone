import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed...');

  // Clean existing data
  await prisma.booking.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.userPackage.deleteMany();
  await prisma.package.deleteMany();
  await prisma.salaryRecord.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.class.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleaned existing data');

  // STRONG PASSWORD: FitPass@2024! (có chữ hoa, chữ thường, số, ký tự đặc biệt)
  const hashedPassword = await bcrypt.hash('FitPass@2024!', 10);

  // Create 1 Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@fitpass.com',
      password: hashedPassword,
      fullName: 'Admin FitPass',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  // Create 5 Teachers using loop
  const teachers: any[] = [];
  const teacherNames = [
    'Trần Văn Hùng',
    'Nguyễn Thị Mai',
    'Lê Hoàng Nam',
    'Phạm Thị Lan',
    'Võ Minh Tuấn'
  ];

  for (let i = 0; i < teacherNames.length; i++) {
    const teacher = await prisma.user.create({
      data: {
        email: `giaovien${i + 1}@fitpass.com`,
        password: hashedPassword,
        fullName: teacherNames[i] || `Giáo viên ${i + 1}`,
        role: UserRole.TEACHER,
        emailVerified: true,
        hourlyRate: 200000 + (i * 50000), // 200k-400k range
        salaryOwed: 0,
      },
    });
    teachers.push(teacher);
    console.log(`👨‍🏫 Created teacher: ${teacher.email} - ${teacher.fullName}`);
  }

  // Create 15 Students using loop
  const students: any[] = [];
  const studentNames = [
    'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Thị Dung',
    'Võ Minh Hiếu', 'Đỗ Thị Hương', 'Bùi Văn Khôi', 'Lý Thị Linh',
    'Hoàng Văn Nam', 'Phan Thị Oanh', 'Đặng Văn Phong', 'Cao Thị Quỳnh',
    'Vũ Văn Sơn', 'Đinh Thị Thảo', 'Ngô Văn Tuấn'
  ];

  for (let i = 0; i < studentNames.length; i++) {
    const student = await prisma.user.create({
      data: {
        email: `hocvien${i + 1}@fitpass.com`,
        password: hashedPassword,
        fullName: studentNames[i] || `Học viên ${i + 1}`,
        role: UserRole.STUDENT,
        emailVerified: true,
      },
    });
    students.push(student);
    console.log(`👨‍🎓 Created student: ${student.email} - ${student.fullName}`);
  }

  // Create Rooms
  const rooms: any[] = [];
  const roomNames = ['Phòng Yoga', 'Phòng Gym', 'Phòng Dance', 'Phòng Cardio', 'Phòng Boxing'];
  
  for (let i = 0; i < roomNames.length; i++) {
    const room = await prisma.room.create({
      data: {
        name: roomNames[i] || `Phòng ${i + 1}`,
        description: `${roomNames[i] || `Phòng ${i + 1}`} với đầy đủ trang thiết bị`,
        capacity: 20 + (i * 5), // 20-40 capacity
        equipment: i === 0 ? 'Thảm yoga, gạch tập' : 
                  i === 1 ? 'Máy tập gym, tạ' :
                  i === 2 ? 'Gương, âm thanh' :
                  i === 3 ? 'Máy chạy bộ, xe đạp' : 'Bao cát, găng tay',
        status: 'AVAILABLE',
      },
    });
    rooms.push(room);
  }

  // Create Classes for each teacher
  const classes: any[] = [];
  const classTypes = [
    { name: 'Yoga Cơ Bản', desc: 'Lớp yoga cho người mới bắt đầu' },
    { name: 'Gym Nâng Cao', desc: 'Tập gym với cường độ cao' },
    { name: 'Dance Aerobic', desc: 'Nhảy aerobic giảm cân' },
    { name: 'Cardio Burn', desc: 'Đốt cháy calo hiệu quả' },
    { name: 'Boxing Cơ Bản', desc: 'Học boxing từ cơ bản' }
  ];

  for (let i = 0; i < teachers.length; i++) {
    for (let j = 0; j < 2; j++) { // Mỗi teacher có 2 classes
      const classType = classTypes[(i + j) % classTypes.length];
      if (classType) {
      const classData = await prisma.class.create({
        data: {
          name: `${classType.name} ${j + 1}`,
          description: classType.desc,
          capacity: 15 + j * 5,
          duration: 60 + j * 30, // 60-90 minutes
          teacherId: teachers[i].id,
          status: 'APPROVED',
        },
      });
      classes.push(classData);
      }
    }
  }

  console.log(`📚 Created ${classes.length} classes`);

  // Create Sessions until end of June 2026 (starting from tomorrow to ensure future dates)
  const sessions: any[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Start from tomorrow
  startDate.setHours(0, 0, 0, 0); // Reset to midnight
  const endDate = new Date(2026, 5, 30); // June 30, 2026
  endDate.setHours(23, 59, 59, 999);
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
  
  for (let day = 0; day < totalDays; day++) {
    for (let classIndex = 0; classIndex < classes.length; classIndex++) {
      if (classes[classIndex] && rooms[classIndex % rooms.length]) {
        const sessionDate = new Date(startDate);
        sessionDate.setDate(startDate.getDate() + day);
        
        const startHour = 7 + (classIndex % 4) * 2; // 7AM, 9AM, 11AM, 1PM
        sessionDate.setHours(startHour, 0, 0, 0);
        
        const endTime = new Date(sessionDate);
        endTime.setMinutes(sessionDate.getMinutes() + classes[classIndex].duration);
        
        const session = await prisma.session.create({
          data: {
            classId: classes[classIndex].id,
            startTime: sessionDate,
            endTime: endTime,
            status: day === 0 ? 'ACTIVE' : 'UPCOMING',
            roomId: rooms[classIndex % rooms.length].id,
          },
        });
        sessions.push(session);
      }
    }
  }

  console.log(`🗓️ Created ${sessions.length} sessions`);

  // Create Packages
  const packages: any[] = [];
  const packageData = [
    { name: 'Gói Cơ Bản', credits: 10, price: 500000, validDays: 30 },
    { name: 'Gói Tiêu Chuẩn', credits: 25, price: 1000000, validDays: 60 },
    { name: 'Gói Premium', credits: 50, price: 1800000, validDays: 90 },
    { name: 'Gói VIP', credits: 100, price: 3000000, validDays: 180 },
  ];

  for (const pkg of packageData) {
    const packageRecord = await prisma.package.create({
      data: {
        name: pkg.name,
        description: `${pkg.name} - ${pkg.credits} buổi tập`,
        price: pkg.price,
        credits: pkg.credits,
        validDays: pkg.validDays,
        isActive: true,
      },
    });
    packages.push(packageRecord);
  }

  // Create UserPackages for students
  for (let i = 0; i < students.length; i++) {
    if (students[i] && packages[i % packages.length]) {
      const packageIndex = i % packages.length;
      const purchaseDate = new Date();
      purchaseDate.setDate(purchaseDate.getDate() - (i % 30));
      
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(purchaseDate.getDate() + packages[packageIndex].validDays);

      await prisma.userPackage.create({
        data: {
          userId: students[i].id,
          packageId: packages[packageIndex].id,
          creditsLeft: packages[packageIndex].credits - (i % 5),
          status: 'ACTIVE',
          purchasedAt: purchaseDate,
          expiresAt: expiryDate,
        },
      });
    }
  }

  // Create Enrollments (students enroll in classes)
  const enrollments: any[] = [];
  for (let i = 0; i < students.length; i++) {
    if (students[i]) {
      // Mỗi student enroll TẤT CẢ classes để có thể book bất kỳ session nào
      for (let classIdx = 0; classIdx < classes.length; classIdx++) {
        if (classes[classIdx]) {
          const enrollment = await prisma.enrollment.create({
            data: {
              studentId: students[i].id,
              classId: classes[classIdx].id,
            },
          });
          enrollments.push(enrollment);
        }
      }
    }
  }

  // 🎯 CREATE DEDICATED TEST DATA FOR giaovien1 (First teacher)
  const teacher1 = teachers[0];
  
  // Create 3 premium test classes for giaovien1
  const testClasses: any[] = [];
  const testClassConfigs = [
    { 
      name: 'Yoga Căng Cơ', 
      desc: 'Lớp yoga dành cho người muốn tăng độ dẻo dai và giảm căng cơ',
      capacity: 12,
      duration: 60,
      roomIndex: 0
    },
    { 
      name: 'HIIT Training', 
      desc: 'Bài tập khoảng cách cường độ cao để đốt cháy calo nhanh chóng',
      capacity: 15,
      duration: 45,
      roomIndex: 1
    },
    { 
      name: 'Pilates Core', 
      desc: 'Tập pilates chuyên sâu cho cơ lõi và ổn định cơ thể',
      capacity: 10,
      duration: 50,
      roomIndex: 2
    }
  ];

  for (const config of testClassConfigs) {
    const testClass = await prisma.class.create({
      data: {
        name: config.name,
        description: config.desc,
        capacity: config.capacity,
        duration: config.duration,
        teacherId: teacher1.id,
        status: 'APPROVED',
        minStudents: Math.ceil(config.capacity * 0.5), // 50% of capacity
      },
    });
    testClasses.push(testClass);
  }

  console.log(`✅ Created ${testClasses.length} premium test classes for ${teacher1.fullName}`);

  // Create rich session data until end of June 2026 (multiple time slots per day)
  const testSessions: any[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let classIdx = 0; classIdx < testClasses.length; classIdx++) {
    const testClass = testClasses[classIdx];
    const config = testClassConfigs[classIdx]!;
    const room = rooms[config.roomIndex];
    
    // Create sessions until end of June 2026 at different times
    const totalTestDays = Math.ceil((endDate.getTime() - today.getTime()) / msPerDay) + 1;
    for (let day = 0; day < totalTestDays; day++) {
      for (let timeSlot = 0; timeSlot < 3; timeSlot++) {
        const sessionDate = new Date(today);
        sessionDate.setDate(today.getDate() + day);
        
        // Time slots: 7:00 AM, 10:00 AM, 5:00 PM
        const startHours = [7, 10, 17];
        sessionDate.setHours(startHours[timeSlot]!, 0, 0, 0);
        
        const endTime = new Date(sessionDate);
        endTime.setMinutes(sessionDate.getMinutes() + testClass.duration);
        
        const session = await prisma.session.create({
          data: {
            classId: testClass.id,
            startTime: sessionDate,
            endTime: endTime,
            status: day === 0 && timeSlot === 0 ? 'ACTIVE' : 
                    day === 0 ? 'UPCOMING' :
                    day <= 1 ? 'UPCOMING' : 'UPCOMING',
            roomId: room.id,
          },
        });
        testSessions.push(session);
      }
    }
  }

  console.log(`✅ Created ${testSessions.length} sessions for test classes`);

  // Enroll test students in test classes
  const testEnrollments: any[] = [];
  for (let studentIdx = 0; studentIdx < 5; studentIdx++) {
    for (const testClass of testClasses) {
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: students[studentIdx].id,
          classId: testClass.id,
          progressNotes: studentIdx === 0 ? '🌟 Học viên tiến bộ nhanh, rất hứng thú với lớp yoga' : 
                         studentIdx === 1 ? '💪 Cần cải thiện sức bền, tập luyện chưa đều' : null,
          lastNoteAt: studentIdx <= 1 ? new Date() : null,
          notesUpdatedBy: studentIdx <= 1 ? teacher1.id : null,
        },
      });
      testEnrollments.push(enrollment);
    }
  }

  console.log(`✅ Created ${testEnrollments.length} enrollments for test classes`);

  // Create attendance records for some test sessions (simulating completed sessions)
  const testAttendanceCount = 0; // Will be 0 initially, can be updated after sessions complete
  
  // Create bookings for test students on test sessions
  let testBookingCount = 0;
  
  // Student 1 (hocvien1) books multiple sessions
  for (let i = 0; i < Math.min(5, testSessions.length); i++) {
    const session = testSessions[i];
    const existing = await prisma.booking.findFirst({
      where: {
        userId: students[0].id,
        sessionId: session.id,
      },
    });
    
    if (!existing && session.classId === testClasses[0].id) {
      await prisma.booking.create({
        data: {
          userId: students[0].id,
          sessionId: session.id,
          creditsUsed: 1,
        },
      });
      testBookingCount++;
    }
  }

  // Student 2 (hocvien2) books other sessions
  for (let i = 5; i < Math.min(10, testSessions.length); i++) {
    const session = testSessions[i];
    const existing = await prisma.booking.findFirst({
      where: {
        userId: students[1].id,
        sessionId: session.id,
      },
    });
    
    if (!existing && session.classId === testClasses[1].id) {
      await prisma.booking.create({
        data: {
          userId: students[1].id,
          sessionId: session.id,
          creditsUsed: 1,
        },
      });
      testBookingCount++;
    }
  }

  console.log(`✅ Created ${testBookingCount} bookings for test sessions`);
  console.log(`\n📊 GIAOVIEN1 TEST SETUP:`);
  console.log(`   Email: giaovien1@fitpass.com`);
  console.log(`   Password: FitPass@2024!`);
  console.log(`   Classes: ${testClasses.length} (Yoga Căng Cơ, HIIT Training, Pilates Core)`);
  console.log(`   Sessions: ${testSessions.length} (7 days × 3 times per day)`);
  console.log(`   Students enrolled: ${testEnrollments.length / testClasses.length} students per class`);
  console.log(`   Test bookings: ${testBookingCount}`);
  console.log(`\n💡 FEATURES TO TEST FOR STUDENT:`);
  console.log(`   ✓ View available sessions for enrolled classes`);
  console.log(`   ✓ Book sessions (check capacity validation)`);
  console.log(`   ✓ Cancel bookings`);
  console.log(`   ✓ QR code check-in at session start`);
  console.log(`   ✓ View attendance history`);
  console.log(`   ✓ See teacher progress notes`);
  console.log(`   ✓ View class details and room info`);
  console.log(`   ✓ Credit management and package validity`);
  console.log(`\n💡 BUSINESS LOGIC TO TEST:`);
  console.log(`   ✓ Class capacity enforcement (${testClasses[0].name}: ${testClasses[0].capacity} capacity)`);
  console.log(`   ✓ Minimum students for class start (${testClasses[0].minStudents} min required)`);
  console.log(`   ✓ Credit consumption per session (1 credit per booking)`);
  console.log(`   ✓ Package expiry validation`);
  console.log(`   ✓ Attendance tracking and completion`);
  console.log(`   ✓ Duplicate booking prevention`);

  // Create Bookings for regular sessions (keep original logic)
  for (let i = 0; i < Math.min(sessions.length, 50); i++) {
    const studentIndex = i % students.length;
    const session = sessions[i];
    
    if (students[studentIndex] && session) {
      // Check if student is enrolled in this class
      const isEnrolled = enrollments.find(e => 
        e.studentId === students[studentIndex].id && 
        e.classId === session.classId
      );
      
      if (isEnrolled) {
        await prisma.booking.create({
          data: {
            userId: students[studentIndex].id,
            sessionId: session.id,
            creditsUsed: 1,
          },
        });
      }
    }
  }

  console.log('🎉 Seed completed successfully!');
  console.log('\n📋 LOGIN CREDENTIALS:');
  console.log('👨‍💼 ADMIN:');
  console.log('  Email: admin@fitpass.com');
  console.log('  Password: FitPass@2024!');
  console.log('\n👨‍🏫 TEACHERS:');
  for (let i = 1; i <= 5; i++) {
    console.log(`  Email: giaovien${i}@fitpass.com`);
    console.log(`  Password: FitPass@2024!`);
  }
  console.log('\n👨‍🎓 STUDENTS:');
  for (let i = 1; i <= 15; i++) {
    console.log(`  Email: hocvien${i}@fitpass.com`);
    console.log(`  Password: FitPass@2024!`);
  }
  console.log('\n📊 SUMMARY:');
  console.log(`  - 1 Admin`);
  console.log(`  - 5 Teachers`);
  console.log(`  - 15 Students`);
  console.log(`  - ${classes.length} Classes`);
  console.log(`  - ${sessions.length} Sessions`);
  console.log(`  - ${packages.length} Packages`);
  console.log(`  - ${enrollments.length} Enrollments`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });