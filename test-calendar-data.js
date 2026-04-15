#!/usr/bin/env node
const axios = require('axios');

/**
 * Script to add test calendar data for student anhdinhniocorp@gmail.com
 * Usage: node test-calendar-data.js
 */

const API_BASE = 'http://localhost:3000/api';

// Test data
const TEST_DATA = {
  // You need to provide JWT token here or we create via login
  classes: [
    {
      name: 'Yoga Cơ Bản',
      description: 'Yoga căn bản cho người mới bắt đầu',
      duration: 60,
      capacity: 15,
      teacherEmail: 'teacher1@fitpass.com',
    },
    {
      name: 'Pilates Nâng Cao',
      description: 'Pilates dành cho những người đã có kinh nghiệm',
      duration: 90,
      capacity: 10,
      teacherEmail: 'teacher2@fitpass.com',
    },
  ],
};

async function main() {
  try {
    console.log('🔐 Logging in as student...');
    
    // Step 1: Login student to get token
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'anhdinhniocorp@gmail.com',
      password: 'Password@123', // Update if different
    });

    const token = loginRes.data.data.token;
    const studentId = loginRes.data.data.id;
    console.log('✅ Student login successful. ID:', studentId);

    // Setup axios with token
    const api = axios.create({
      baseURL: API_BASE,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Step 2: Get or create test classes with sessions
    console.log('\n📚 Setting up test classes and sessions...');

    // For now, let's get existing classes
    const classesRes = await api.get('/classes?limit=100');
    const allClasses = classesRes.data.data || [];
    console.log(`Found ${allClasses.length} classes`);

    if (allClasses.length < 2) {
      console.log('❌ Not enough classes. Please create classes first via admin panel.');
      process.exit(1);
    }

    // Step 3: Create test bookings
    console.log('\n📅 Creating test bookings...');

    // Get user packages
    const packagesRes = await api.get('/user-packages');
    const userPackages = packagesRes.data.data || [];

    if (userPackages.length === 0) {
      console.log('❌ No user packages found. Please purchase a package first.');
      process.exit(1);
    }

    const packageId = userPackages[0].id;
    console.log('Using package:', packageId);

    // Get available sessions from first 2 classes
    const bookingsToCreate = [];
    for (let i = 0; i < Math.min(2, allClasses.length); i++) {
      const cls = allClasses[i];
      if (cls.sessions && cls.sessions.length > 0) {
        // Book first 2 upcoming sessions from each class
        for (let j = 0; j < Math.min(2, cls.sessions.length); j++) {
          const session = cls.sessions[j];
          const sessionTime = new Date(session.startTime);
          
          // Only book future sessions
          if (sessionTime > new Date()) {
            bookingsToCreate.push({
              sessionId: session.id,
              userPackageId: packageId,
            });
          }
        }
      }
    }

    console.log(`Creating ${bookingsToCreate.length} bookings...`);
    for (const booking of bookingsToCreate) {
      try {
        const res = await api.post('/user-packages/bookings', booking);
        console.log(`✅ Booked session:`, booking.sessionId);
      } catch (err) {
        console.log(`⚠️  Could not book session ${booking.sessionId}:`, err.response?.data?.message || err.message);
      }
    }

    // Step 4: Create test enrollments
    console.log('\n🎓 Creating test enrollments...');

    const enrollmentsToCreate = allClasses.slice(0, 2).map(cls => ({
      classId: cls.id,
    }));

    for (const enrollment of enrollmentsToCreate) {
      try {
        const res = await api.post('/enrollments', enrollment);
        console.log(`✅ Enrolled in class:`, enrollment.classId);
      } catch (err) {
        // Might already be enrolled
        console.log(`⚠️  Could not enroll in class ${enrollment.classId}:`, err.response?.data?.message || err.message);
      }
    }

    console.log('\n✨ Test data setup complete!');
    console.log('📱 Check your calendar now - you should see:');
    console.log('  - Blue sessions (booked bookings)');
    console.log('  - Amber sessions (enrolled class sessions)');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
