// Simple test to check if we have teachers in database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTeachers() {
  try {
    console.log('Checking teachers in database...');
    
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        fullName: true,
        email: true,
        hourlyRate: true,
      }
    });
    
    console.log(`Found ${teachers.length} teachers:`);
    teachers.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.fullName} (${teacher.email}) - Rate: ${teacher.hourlyRate || 'Not set'} VND/hour`);
    });
    
    if (teachers.length === 0) {
      console.log('\n❌ No teachers found. You need to:');
      console.log('1. Create a user with role TEACHER');
      console.log('2. Set their hourlyRate in the admin panel');
    } else {
      console.log('\n✅ Teachers found! You can test salary updates in the admin panel.');
    }
    
  } catch (error) {
    console.log('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTeachers();