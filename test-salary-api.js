// Test script to check teacher salary API
const API_BASE = 'http://localhost:3001';

async function testTeacherSalaryAPI() {
  try {
    console.log('Testing Teacher Salary API...');
    
    // Test 1: Get teachers overview
    console.log('\n1. Testing GET /api/salary/teachers/salary-overview');
    const response = await fetch(`${API_BASE}/api/salary/teachers/salary-overview`, {
      headers: {
        'Authorization': 'Bearer your-admin-token-here',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const teachers = await response.json();
      console.log('✅ Teachers fetched successfully:', teachers.length, 'teachers');
      
      if (teachers.length > 0) {
        const firstTeacher = teachers[0];
        console.log('First teacher:', {
          id: firstTeacher.id,
          name: firstTeacher.fullName,
          hourlyRate: firstTeacher.hourlyRate
        });
        
        // Test 2: Update hourly rate
        console.log('\n2. Testing PATCH hourly rate update');
        const newRate = firstTeacher.hourlyRate + 50000; // Increase by 50k
        
        const updateResponse = await fetch(`${API_BASE}/api/salary/teachers/${firstTeacher.id}/hourly-rate`, {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer your-admin-token-here',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            hourlyRate: newRate
          })
        });
        
        if (updateResponse.ok) {
          const updateResult = await updateResponse.json();
          console.log('✅ Hourly rate updated successfully:', updateResult);
        } else {
          console.log('❌ Update failed:', await updateResponse.text());
        }
      }
    } else {
      console.log('❌ Failed to fetch teachers:', await response.text());
    }
    
    // Test 3: Get payroll records
    console.log('\n3. Testing GET /api/salary/payroll');
    const payrollResponse = await fetch(`${API_BASE}/api/salary/payroll`, {
      headers: {
        'Authorization': 'Bearer your-admin-token-here',
        'Content-Type': 'application/json'
      }
    });
    
    if (payrollResponse.ok) {
      const payroll = await payrollResponse.json();
      console.log('✅ Payroll records fetched successfully');
    } else {
      console.log('❌ Payroll fetch failed:', await payrollResponse.text());
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
}

// Run test
testTeacherSalaryAPI();