/**
 * Seed payroll demo records — insert PENDING salary records for all teachers
 * for the past 2 months so the admin can demo payroll + mark as PAID.
 * Run: node scripts/seed-payroll-demo.js
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const now = new Date();
  const months = [
    { month: now.getMonth() === 0 ? 12 : now.getMonth(), year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear() },
    { month: now.getMonth() + 1, year: now.getFullYear() }, // current month
  ];

  const teachers = await p.user.findMany({
    where: { role: 'TEACHER' },
    select: { id: true, fullName: true, hourlyRate: true },
  });

  if (teachers.length === 0) {
    console.log('❌ No teachers found in DB.');
    return;
  }

  console.log(`Found ${teachers.length} teachers:`, teachers.map(t => `${t.fullName} (rate: ${t.hourlyRate})`).join(', '));

  for (const { month, year } of months) {
    for (const teacher of teachers) {
      const hourlyRate = teacher.hourlyRate || 150000;
      // Random between 8-20 hours taught
      const totalHours = parseFloat((Math.random() * 12 + 8).toFixed(2));
      const totalAmount = parseFloat((totalHours * hourlyRate).toFixed(2));

      // Skip if record already exists
      const existing = await p.salaryRecord.findFirst({
        where: { teacherId: teacher.id, month, year },
      });
      if (existing) {
        console.log(`⏭  ${teacher.fullName} ${month}/${year} already exists (${existing.status}), skipping.`);
        continue;
      }

      const record = await p.salaryRecord.create({
        data: {
          teacherId: teacher.id,
          month,
          year,
          totalHours,
          hourlyRate,
          totalAmount,
          status: 'PENDING',
        },
      });
      console.log(`✅ Created payroll for ${teacher.fullName} — ${month}/${year}: ${totalAmount.toLocaleString('vi-VN')} VNĐ (${totalHours}h) [ID: ${record.id}]`);
    }
  }

  console.log('\nDone! Payroll records ready for demo.');
}

main().catch(console.error).finally(() => p.$disconnect());
