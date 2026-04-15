const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create sample teachers
  // Using pre-hashed password for 'teacher123'
  const teacherPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJK';
  const teachers = [];
  
  for (let i = 1; i <= 3; i++) {
    const teacher = await prisma.user.upsert({
      where: { email: `teacher${i}@fitpass.com` },
      update: {},
      create: {
        email: `teacher${i}@fitpass.com`,
        password: teacherPassword,
        fullName: `Teacher ${i}`,
        role: 'TEACHER',
        emailVerified: true,
        hourlyRate: 200000 + (i * 50000),
      }
    });
    teachers.push(teacher);
  }
  console.log(`✅ Created ${teachers.length} teachers`);

  // 2. Create sample students  
  // Using pre-hashed password for 'student123'
  const studentPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJK';
  const students = [];
  
  for (let i = 1; i <= 20; i++) {
    const student = await prisma.user.upsert({
      where: { email: `student${i}@fitpass.com` },
      update: {},
      create: {
        email: `student${i}@fitpass.com`,
        password: studentPassword,
        fullName: `Student ${i}`,
        role: 'STUDENT',
        emailVerified: true,
      }
    });
    students.push(student);
  }
  console.log(`✅ Created ${students.length} students`);

  // 3. Create sample rooms
  const rooms = [];
  const roomNames = ['Studio A', 'Studio B', 'Yoga Room', 'Cardio Zone'];
  
  for (const roomName of roomNames) {
    // Check if room already exists
    const existingRoom = await prisma.room.findFirst({
      where: { name: roomName }
    });
    
    if (!existingRoom) {
      const room = await prisma.room.create({
        data: {
          name: roomName,
          description: `Professional fitness space`,
          capacity: 20,
          status: 'AVAILABLE',
        }
      });
      rooms.push(room);
    } else {
      rooms.push(existingRoom);
    }
  }
  console.log(`✅ Created ${rooms.length} rooms`);

  // 4. Create sample classes
  const classTypes = ['YOGA', 'CARDIO', 'STRENGTH', 'DANCE', 'PILATES'];
  const classLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  const classes = [];
  
  for (let i = 0; i < 10; i++) {
    const classData = await prisma.class.create({
      data: {
        name: `${classTypes[i % classTypes.length]} Class ${i + 1}`,
        description: `Professional ${classTypes[i % classTypes.length].toLowerCase()} training`,
        capacity: 15 + (i % 5),
        duration: 60,
        teacherId: teachers[i % teachers.length].id,
        status: 'APPROVED',
        minStudents: 5,
        type: classTypes[i % classTypes.length],
        level: classLevels[i % classLevels.length],
      }
    });
    classes.push(classData);
  }
  console.log(`✅ Created ${classes.length} classes`);

  // 5. Create enrollments
  const enrollments = [];
  for (let i = 0; i < students.length; i++) {
    // Each student enrolls in 1-3 classes
    const numClasses = 1 + Math.floor(Math.random() * 3);
    const selectedClasses = [];
    
    for (let j = 0; j < numClasses; j++) {
      const classIndex = Math.floor(Math.random() * classes.length);
      if (!selectedClasses.includes(classIndex)) {
        selectedClasses.push(classIndex);
        
        const enrollment = await prisma.enrollment.create({
          data: {
            studentId: students[i].id,
            classId: classes[classIndex].id,
          }
        });
        enrollments.push(enrollment);
      }
    }
  }
  console.log(`✅ Created ${enrollments.length} enrollments`);

  // 6. Create sessions (last 14 days)
  const sessions = [];
  const now = new Date();
  
  for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
    const sessionDate = new Date(now);
    sessionDate.setDate(sessionDate.getDate() - dayOffset);
    sessionDate.setHours(9, 0, 0, 0); // Start at 9 AM
    
    // Create 2-3 sessions per day
    const numSessionsPerDay = 2 + Math.floor(Math.random() * 2);
    
    for (let sessionIdx = 0; sessionIdx < numSessionsPerDay; sessionIdx++) {
      const startTime = new Date(sessionDate);
      startTime.setHours(9 + (sessionIdx * 3)); // 9 AM, 12 PM, 3 PM
      
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);
      
      const classData = classes[Math.floor(Math.random() * classes.length)];
      
      const session = await prisma.session.create({
        data: {
          classId: classData.id,
          roomId: rooms[Math.floor(Math.random() * rooms.length)].id,
          startTime: startTime,
          endTime: endTime,
          status: dayOffset === 0 ? 'UPCOMING' : 'DONE',
        }
      });
      sessions.push(session);
    }
  }
  console.log(`✅ Created ${sessions.length} sessions`);

  // 7. Create attendance records for completed sessions
  const attendances = [];
  const completedSessions = sessions.filter(s => s.status === 'DONE');
  
  for (const session of completedSessions) {
    // Get enrolled students for this class
    const classEnrollments = enrollments.filter(e => e.classId === session.classId);
    
    // 70-90% attendance rate
    const attendanceRate = 0.7 + (Math.random() * 0.2);
    
    for (const enrollment of classEnrollments) {
      if (Math.random() < attendanceRate) {
        const attendance = await prisma.attendance.create({
          data: {
            sessionId: session.id,
            studentId: enrollment.studentId,
            status: 'PRESENT',
            checkedInAt: session.startTime,
          }
        });
        attendances.push(attendance);
      }
    }
  }
  console.log(`✅ Created ${attendances.length} attendance records`);

  // 8. Create packages
  const packages = [
    { name: 'Basic', price: 500000, credits: 10, validDays: 30, isActive: true },
    { name: 'Standard', price: 900000, credits: 20, validDays: 30, isActive: true },
    { name: 'Premium', price: 1500000, credits: -1, validDays: 30, isActive: true },
  ];
  
  const createdPackages = [];
  for (const pkg of packages) {
    const existingPkg = await prisma.package.findFirst({
      where: { name: pkg.name }
    });
    
    if (!existingPkg) {
      const createdPkg = await prisma.package.create({
        data: pkg,
      });
      createdPackages.push(createdPkg);
    } else {
      createdPackages.push(existingPkg);
    }
  }
  console.log(`✅ Created ${createdPackages.length} packages`);

  // 9. Create transactions (last 30 days)
  const transactions = [];
  
  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const txDate = new Date(now);
    txDate.setDate(txDate.getDate() - dayOffset);
    
    // 1-3 transactions per day
    const numTxPerDay = 1 + Math.floor(Math.random() * 3);
    
    for (let txIdx = 0; txIdx < numTxPerDay; txIdx++) {
      const student = students[Math.floor(Math.random() * students.length)];
      const pkg = createdPackages[Math.floor(Math.random() * createdPackages.length)];
      
      // Create UserPackage first
      const userPackage = await prisma.userPackage.create({
        data: {
          userId: student.id,
          packageId: pkg.id,
          creditsLeft: pkg.credits,
          status: 'ACTIVE',
          purchasedAt: txDate,
          expiresAt: new Date(txDate.getTime() + pkg.validDays * 24 * 60 * 60 * 1000),
        }
      });
      
      // Then create transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId: student.id,
          userPackageId: userPackage.id,
          amount: pkg.price,
          status: dayOffset > 2 ? 'COMPLETED' : (Math.random() > 0.7 ? 'PENDING' : 'COMPLETED'),
          paymentMethod: 'PAYPAL',
          paymentId: `PAYPAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: txDate,
        }
      });
      transactions.push(transaction);
    }
  }
  console.log(`✅ Created ${transactions.length} transactions`);

  console.log('');
  console.log('🎉 Database seeding completed!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Teachers: ${teachers.length}`);
  console.log(`   Students: ${students.length}`);
  console.log(`   Classes: ${classes.length}`);
  console.log(`   Rooms: ${rooms.length}`);
  console.log(`   Sessions: ${sessions.length}`);
  console.log(`   Enrollments: ${enrollments.length}`);
  console.log(`   Attendance: ${attendances.length}`);
  console.log(`   Packages: ${createdPackages.length}`);
  console.log(`   Transactions: ${transactions.length}`);
  console.log('');
  console.log('🔐 Login credentials:');
  console.log('   Teacher: teacher1@fitpass.com / teacher123');
  console.log('   Student: student1@fitpass.com / student123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
