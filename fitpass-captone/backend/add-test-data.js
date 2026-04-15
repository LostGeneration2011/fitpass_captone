const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Finding student: anhdinhniocorp@gmail.com');
    
    const student = await prisma.user.findUnique({
      where: { email: 'anhdinhniocorp@gmail.com' },
    });

    if (!student) {
      console.log('❌ Student not found');
      process.exit(1);
    }

    console.log('✅ Found:', student.fullName);

    // Get or create a package
    let pkg = await prisma.package.findFirst({
      where: { isActive: true },
    });

    if (!pkg) {
      console.log('📦 Creating test package...');
      pkg = await prisma.package.create({
        data: {
          name: 'Gói 10 buổi',
          description: 'Gói 10 buổi tập luyện',
          credits: 10,
          validDays: 90,
          price: 1000000,
          isActive: true,
        },
      });
    }

    console.log('✅ Using package:', pkg.name);

    // Check if student already has this package
    let userPackage = await prisma.userPackage.findFirst({
      where: {
        userId: student.id,
        packageId: pkg.id,
      },
    });

    if (!userPackage) {
      console.log('🛍️  Creating user package (purchase)...');
      userPackage = await prisma.userPackage.create({
        data: {
          userId: student.id,
          packageId: pkg.id,
          creditsLeft: pkg.credits,
          usedCredits: 0,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + pkg.validDays * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      });
      console.log('✅ Purchase created');
    } else {
      console.log('✅ Already has package');
    }

    // Get classes with sessions
    const classes = await prisma.class.findMany({
      where: { status: 'APPROVED' },
      include: {
        sessions: {
          where: { startTime: { gte: new Date() } },
          orderBy: { startTime: 'asc' },
          take: 5,
        },
      },
      take: 3,
    });

    if (classes.length === 0) {
      console.log('❌ No approved classes with sessions found');
      process.exit(1);
    }

    console.log(`\n📚 Found ${classes.length} classes with sessions`);

    let bookingCount = 0;
    let enrollmentCount = 0;

    // Create bookings
    for (const cls of classes) {
      console.log(`\n📚 Class: ${cls.name} (${cls.sessions.length} sessions)`);
      for (const session of cls.sessions.slice(0, 2)) {
        try {
          const booking = await prisma.booking.create({
            data: {
              userId: student.id,
              sessionId: session.id,
              userPackageId: userPackage.id,
              creditsUsed: 1,
            },
          });
          console.log(`✅ Booked: ${cls.name} - ${new Date(session.startTime).toLocaleDateString('vi-VN')}`);
          bookingCount++;
        } catch (e) {
          console.log(`⚠️  Booking error:`, e.message);
        }
      }

      // Create enrollments
      try {
        const enrollment = await prisma.enrollment.create({
          data: {
            studentId: student.id,
            classId: cls.id,
            userPackageId: userPackage.id,
            status: 'ACTIVE',
          },
        });
        console.log(`✅ Enrolled: ${cls.name}`);
        enrollmentCount++;
      } catch (e) {
        console.log(`⚠️  Enrollment error:`, e.message);
      }
    }

    console.log(`\n✨ Complete!`);
    console.log(`   📦 Package: ${pkg.name}`);
    console.log(`   🛍️  Purchase: ACTIVE (valid for 90 days)`);
    console.log(`   📅 Bookings: ${bookingCount}`);
    console.log(`   📚 Enrollments: ${enrollmentCount}`);
    console.log(`\n📱 Reload Expo app to see calendar with data!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
