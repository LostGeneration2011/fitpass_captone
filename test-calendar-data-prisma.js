#!/usr/bin/env node

/**
 * Add test calendar data using Prisma Client directly
 * Creates bookings and enrollments for anhdinhniocorp@gmail.com
 * Usage: cd fitpass-captone/backend && node ../../test-calendar-data-prisma.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Finding student: anhdinhniocorp@gmail.com');
    
    // Find the student
    const student = await prisma.user.findUnique({
      where: { email: 'anhdinhniocorp@gmail.com' },
      include: {
        userPackages: {
          include: { package: true },
        },
      },
    });

    if (!student) {
      console.log('❌ Student not found. Please create account first.');
      process.exit(1);
    }

    console.log('✅ Found student:', student.fullName);

    // Get user packages
    if (student.userPackages.length === 0) {
      console.log('❌ Student has no packages. Please purchase a package first.');
      process.exit(1);
    }

    const userPackageId = student.userPackages[0].id;
    console.log('✅ Using package:', student.userPackages[0].package.name);

    // Get upcoming classes with sessions
    const classes = await prisma.class.findMany({
      where: {
        status: 'APPROVED',
      },
      include: {
        sessions: {
          where: {
            startTime: {
              gte: new Date(), // Only future sessions
            },
          },
          orderBy: { startTime: 'asc' },
          take: 5,
        },
      },
      take: 3,
    });

    if (classes.length === 0) {
      console.log('❌ No approved classes with future sessions found.');
      process.exit(1);
    }

    console.log(`\n✅ Found ${classes.length} classes with upcoming sessions`);

    // Create bookings for first 3-5 sessions
    console.log('\n📅 Creating test bookings...');
    let bookingCount = 0;

    for (const cls of classes) {
      for (const session of cls.sessions.slice(0, 2)) {
        try {
          const booking = await prisma.booking.create({
            data: {
              userId: student.id,
              sessionId: session.id,
              userPackageId: userPackageId,
              status: 'CONFIRMED',
            },
          });
          console.log(`✅ Booked: ${cls.name} on ${new Date(session.startTime).toLocaleDateString('vi-VN')}`);
          bookingCount++;
        } catch (err) {
          // Might already exist
          if (err.code !== 'P2002') {
            console.log(`⚠️  Error booking ${session.id}:`, err.message);
          }
        }
      }
    }

    console.log(`\n✅ Created ${bookingCount} bookings`);

    // Create enrollments
    console.log('\n🎓 Creating test enrollments...');
    let enrollmentCount = 0;

    for (const cls of classes) {
      try {
        const enrollment = await prisma.enrollment.create({
          data: {
            userId: student.id,
            classId: cls.id,
            enrollmentDate: new Date(),
            refundEligible: true,
          },
        });
        console.log(`✅ Enrolled: ${cls.name}`);
        enrollmentCount++;
      } catch (err) {
        // Might already exist
        if (err.code !== 'P2002') {
          console.log(`⚠️  Error enrolling in ${cls.name}:`, err.message);
        }
      }
    }

    console.log(`\n✅ Created ${enrollmentCount} enrollments`);

    console.log('\n✨ Test data setup complete!');
    console.log('📱 Now check your calendar:');
    console.log('  🔵 Blue cards = Booked sessions');
    console.log('  🟠 Amber cards = Enrolled class sessions');
    console.log('\n💡 Reload your Expo app to see the calendar data!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
