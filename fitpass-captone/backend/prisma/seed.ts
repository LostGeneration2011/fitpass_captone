import {
  PrismaClient,
  UserRole,
  ReactionType,
  ForumModerationStatus,
  PaymentMethod,
  TransactionStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed...');

  // Clean existing data
  await prisma.forumReaction.deleteMany();
  await prisma.forumComment.deleteMany();
  await prisma.forumMedia.deleteMany();
  await prisma.forumPost.deleteMany();
  await prisma.chatThreadRead.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatThread.deleteMany();
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

  // Create sessions from recent past to next 3 months (balanced volume for demos)
  const sessions: any[] = [];
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const windowStart = new Date(now.getTime() - 14 * msPerDay); // include some completed sessions
  const windowEnd = new Date(now);
  windowEnd.setMonth(windowEnd.getMonth() + 3); // exactly 3 months ahead

  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const classItem = classes[classIndex];
    const room = rooms[classIndex % rooms.length];
    if (!classItem || !room) continue;

    // 2 sessions per week for each class across the whole window
    for (let week = 0; week < 15; week++) {
      for (const dayOffset of [1, 4]) {
        const sessionDate = new Date(windowStart);
        sessionDate.setDate(windowStart.getDate() + week * 7 + dayOffset);

        if (sessionDate > windowEnd) continue;

        const startHour = 7 + (classIndex % 5) * 2; // 7,9,11,13,15
        sessionDate.setHours(startHour, 0, 0, 0);

        const endTime = new Date(sessionDate);
        endTime.setMinutes(sessionDate.getMinutes() + classItem.duration);

        let status: 'DONE' | 'ACTIVE' | 'UPCOMING' = 'UPCOMING';
        if (endTime < now) {
          status = 'DONE';
        } else if (sessionDate <= now && endTime >= now) {
          status = 'ACTIVE';
        }

        const session = await prisma.session.create({
          data: {
            classId: classItem.id,
            startTime: sessionDate,
            endTime,
            status,
            roomId: room.id,
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

  // Create richer session data for key demo classes (kept moderate)
  const testSessions: any[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  for (let classIdx = 0; classIdx < testClasses.length; classIdx++) {
    const testClass = testClasses[classIdx];
    const config = testClassConfigs[classIdx]!;
    const room = rooms[config.roomIndex];
    
    // 3 sessions/week per class for next 12 weeks
    for (let week = 0; week < 12; week++) {
      for (let timeSlot = 0; timeSlot < 3; timeSlot++) {
        const sessionDate = new Date(today);
        sessionDate.setDate(today.getDate() + week * 7 + timeSlot * 2);
        
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
            status: sessionDate < now ? 'DONE' : 'UPCOMING',
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
  console.log(`   Sessions: ${testSessions.length} (12 weeks × 3 sessions/week)`);
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

  // Create transactions for purchased user packages (admin finance demo)
  const userPackages = await prisma.userPackage.findMany({
    include: {
      package: true,
      user: true,
    },
  });

  for (const up of userPackages) {
    await prisma.transaction.create({
      data: {
        userPackageId: up.id,
        userId: up.userId,
        amount: up.package.price,
        paymentMethod: PaymentMethod.MOMO,
        paymentId: `DEMO-PAY-${up.id.slice(0, 8).toUpperCase()}`,
        status: TransactionStatus.COMPLETED,
      },
    });
  }

  // Create class reviews and reactions for analytics/moderation demo
  const reviewTexts = [
    'Lop rat chat luong, giao vien nhiet tinh.',
    'Lich hoc hop ly, bai tap de theo doi.',
    'Phong hoc sach se, khong khi rat tot.',
    'Noi dung huu ich, em cam thay tien bo ro.',
    'Muon co them tai lieu bo tro sau buoi hoc.',
  ];

  for (let i = 0; i < Math.min(24, enrollments.length); i++) {
    const enrollment = enrollments[i];
    await prisma.classReview.create({
      data: {
        classId: enrollment.classId,
        studentId: enrollment.studentId,
        rating: 4 + (i % 2),
        comment: reviewTexts[i % reviewTexts.length],
      },
    });

    await prisma.classReaction.create({
      data: {
        classId: enrollment.classId,
        studentId: enrollment.studentId,
        type: i % 5 === 0 ? ReactionType.DISLIKE : ReactionType.LIKE,
      },
    });
  }

  // Create salary records for 3 recent months for each teacher
  const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  for (const teacher of teachers) {
    for (let m = 0; m < 3; m++) {
      const d = new Date(currentMonthDate);
      d.setMonth(currentMonthDate.getMonth() - m);
      const totalHours = 18 + ((teacher.id.length + m) % 10);
      const totalAmount = totalHours * (teacher.hourlyRate || 250000);

      await prisma.salaryRecord.create({
        data: {
          teacherId: teacher.id,
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          totalHours,
          hourlyRate: teacher.hourlyRate || 250000,
          totalAmount,
          status: m === 0 ? 'PENDING' : 'PAID',
          paidDate: m === 0 ? null : new Date(d.getFullYear(), d.getMonth(), 28),
          paidBy: m === 0 ? null : admin.id,
          paymentMethod: m === 0 ? null : 'BANK_TRANSFER',
          note: 'Demo payroll data for presentation',
        },
      });
    }
  }

  // Create notifications for all roles
  const notificationTargets = [admin, ...teachers.slice(0, 3), ...students.slice(0, 6)];
  for (const user of notificationTargets) {
    await prisma.notification.createMany({
      data: [
        {
          userId: user.id,
          title: 'Thong bao he thong',
          body: 'Du lieu demo da duoc khoi tao day du cho buoi thuyet trinh.',
          type: 'INFO',
          isRead: false,
        },
        {
          userId: user.id,
          title: 'Nhac lich hoc',
          body: 'Ban co buoi hoc sap toi trong lich 3 thang ke tiep.',
          type: 'REMINDER',
          isRead: true,
        },
      ],
    });
  }

  // Seed Forum data for end-to-end moderation testing
  console.log('\n🗣️ Seeding forum test data...');

  const forumAuthors = {
    teacher: teachers[0],
    studentA: students[0],
    studentB: students[1],
    studentC: students[2],
    admin,
  };

  const approvedPost1 = await prisma.forumPost.create({
    data: {
      authorId: forumAuthors.studentA.id,
      content: 'Hôm nay em tập Yoga Căng Cơ buổi sáng thấy cải thiện phần lưng rất rõ. Mọi người có tips thở nào hay không ạ?',
      moderationStatus: ForumModerationStatus.APPROVED,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80', order: 0 },
        ],
      },
    },
  });

  const approvedPost2 = await prisma.forumPost.create({
    data: {
      authorId: forumAuthors.teacher.id,
      content: 'Lịch HIIT tuần này đã mở thêm slot 17:00. Các bạn nhớ khởi động kỹ trước khi vào bài nhé!',
      moderationStatus: ForumModerationStatus.APPROVED,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80', order: 0 },
        ],
      },
    },
  });

  const pendingPost = await prisma.forumPost.create({
    data: {
      authorId: forumAuthors.studentB.id,
      content: 'Em mới bắt đầu tập nên hơi ngại, mong mọi người góp ý giúp em về lịch tập phù hợp ạ.',
      moderationStatus: ForumModerationStatus.PENDING,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1540206395-68808572332f?auto=format&fit=crop&w=1200&q=80', order: 0 },
        ],
      },
    },
  });

  const rejectedPost = await prisma.forumPost.create({
    data: {
      authorId: forumAuthors.studentC.id,
      content: 'Bài viết test moderation: nội dung sẽ được từ chối để kiểm tra queue admin.',
      moderationStatus: ForumModerationStatus.REJECTED,
      moderationNote: 'Seed sample rejected post',
      moderatedAt: new Date(),
      isHidden: true,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', order: 0 },
        ],
      },
    },
  });

  await prisma.forumComment.createMany({
    data: [
      {
        postId: approvedPost1.id,
        authorId: forumAuthors.teacher.id,
        content: 'Em thử nhịp thở 4-4-6 trong lúc giữ tư thế, hiệu quả khá tốt.',
      },
      {
        postId: approvedPost1.id,
        authorId: forumAuthors.studentB.id,
        content: 'Mình cũng gặp vấn đề tương tự, đang áp dụng và thấy đỡ đau lưng hơn.',
      },
      {
        postId: approvedPost2.id,
        authorId: forumAuthors.studentA.id,
        content: 'Thầy ơi em đăng ký slot 17:00 rồi ạ, cảm ơn thầy!',
      },
    ],
  });

  await prisma.forumReaction.createMany({
    data: [
      { postId: approvedPost1.id, userId: forumAuthors.studentB.id, type: ReactionType.LIKE },
      { postId: approvedPost1.id, userId: forumAuthors.teacher.id, type: ReactionType.LOVE },
      { postId: approvedPost2.id, userId: forumAuthors.studentA.id, type: ReactionType.WOW },
      { postId: approvedPost2.id, userId: forumAuthors.studentC.id, type: ReactionType.LIKE },
    ],
  });

  await prisma.forumPost.update({
    where: { id: approvedPost2.id },
    data: {
      reports: {
        push: {
          userId: forumAuthors.studentC.id,
          reason: 'SPAM',
          detail: 'Seed data: report sample for admin moderation tab',
          createdAt: new Date().toISOString(),
        },
      },
    },
  });

  await prisma.forumPost.update({
    where: { id: pendingPost.id },
    data: {
      reports: {
        push: {
          userId: forumAuthors.studentA.id,
          reason: 'OTHER',
          detail: 'Seed data: pending post report sample',
          createdAt: new Date().toISOString(),
        },
      },
    },
  });

  console.log('✅ Forum seed done: 2 APPROVED, 1 PENDING, 1 REJECTED, comments/reactions/reports ready');

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
  console.log(`  - 4 Forum posts (moderation mix)`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });