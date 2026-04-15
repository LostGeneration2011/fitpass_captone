# Complete Earnings Test with Real Data

Write-Host "=== FitPass Earnings Complete Test ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001/api"
$email = "teacher.full.test@fitpass.com"
$password = "Password123!"

# Step 1: Register/Login Teacher
Write-Host "Step 1: Setup Teacher Account..." -ForegroundColor Cyan
$loginData = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginData `
        -ErrorAction Stop

    $token = $loginResponse.token
    $teacherId = $loginResponse.user.id
    Write-Host "✅ Teacher logged in: $($loginResponse.user.fullName)" -ForegroundColor Green
}
catch {
    Write-Host "⏳ Registering new teacher..." -ForegroundColor Yellow
    
    $registerData = @{
        fullName = "Teacher Full Test"
        email = $email
        password = $password
        role = "TEACHER"
        hourlyRate = 250000
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $registerData

    $teacherId = $registerResponse.user.id
    Write-Host "✅ Teacher registered: $($registerResponse.user.fullName)" -ForegroundColor Green
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginData
    
    $token = $loginResponse.token
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "   Teacher ID: $teacherId" -ForegroundColor Yellow
Write-Host ""

# Step 2: Create a Class
Write-Host "Step 2: Creating Class..." -ForegroundColor Cyan
$classData = @{
    name = "Yoga Basics $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    description = "Beginner Yoga Class for Testing"
    type = "YOGA"
    level = "BEGINNER"
    schedule = "Monday, Wednesday, Friday at 10:00 AM"
    maxStudents = 20
    minStudents = 5
} | ConvertTo-Json

try {
    $classResponse = Invoke-RestMethod -Uri "$baseUrl/classes" `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $classData

    $classId = $classResponse.data.id
    Write-Host "✅ Class created: $($classResponse.data.name)" -ForegroundColor Green
    Write-Host "   Class ID: $classId" -ForegroundColor Yellow
}
catch {
    Write-Host "❌ Class creation failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Create Sessions
Write-Host "Step 3: Creating Sessions..." -ForegroundColor Cyan

$sessions = @()
$now = Get-Date
for ($i = 0; $i -lt 3; $i++) {
    $startTime = $now.AddDays(-($i)).AddHours(10)
    $endTime = $startTime.AddHours(1)
    
    $sessionData = @{
        classId = $classId
        startTime = $startTime.ToUniversalTime().ToString("o")
        endTime = $endTime.ToUniversalTime().ToString("o")
        roomId = $null
        status = if ($i -eq 0) { "UPCOMING" } else { "DONE" }
    } | ConvertTo-Json

    try {
        $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/sessions" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $sessionData

        $sessions += $sessionResponse.data
        Write-Host "✅ Session created: $($sessionResponse.data.id) - Status: $($sessionResponse.data.status)" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ Session creation warning: $_" -ForegroundColor Yellow
    }
}

Write-Host ""

# Step 4: Test Earnings Endpoint
Write-Host "Step 4: Testing Earnings Endpoint..." -ForegroundColor Cyan

try {
    $earningsResponse = Invoke-RestMethod -Uri "$baseUrl/earnings/me" `
        -Method Get `
        -Headers $headers

    Write-Host "✅ Earnings data retrieved successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Teacher Information:" -ForegroundColor Cyan
    Write-Host "   Name: $($earningsResponse.teacher.fullName)" -ForegroundColor Yellow
    Write-Host "   Email: $($earningsResponse.teacher.email)" -ForegroundColor Yellow
    Write-Host "   Hourly Rate: $($earningsResponse.teacher.hourlyRate.ToString('N0')) VND/h" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "📈 Earnings Summary:" -ForegroundColor Cyan
    Write-Host "   Total Hours Taught: $($earningsResponse.earnings.totalHoursTaught)h" -ForegroundColor Yellow
    Write-Host "   Current Month Hours: $($earningsResponse.earnings.currentMonthHours)h" -ForegroundColor Yellow
    Write-Host "   Expected Salary This Month: $($earningsResponse.earnings.expectedSalaryThisMonth.ToString('N0')) VND" -ForegroundColor Magenta
    if ($earningsResponse.earnings.lastPaidAmount) {
        Write-Host "   Last Paid Amount: $($earningsResponse.earnings.lastPaidAmount.ToString('N0')) VND" -ForegroundColor Green
        Write-Host "   Last Paid Date: $($earningsResponse.earnings.lastPaidDate)" -ForegroundColor Green
    }
    Write-Host ""
    
    Write-Host "📋 Salary History:" -ForegroundColor Cyan
    if ($earningsResponse.salaryHistory.Count -gt 0) {
        $earningsResponse.salaryHistory | ForEach-Object {
            $statusColor = if ($_.status -eq 'PAID') { 'Green' } elseif ($_.status -eq 'PENDING') { 'Yellow' } else { 'Gray' }
            Write-Host "   [$($_.period)] $($_.totalHours)h => $($_.amount.ToString('N0')) VND [$($_.status)]" -ForegroundColor $statusColor
        }
    } else {
        Write-Host "   No salary history yet" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "✅ Full Response:" -ForegroundColor Cyan
    Write-Host ($earningsResponse | ConvertTo-Json -Depth 5) -ForegroundColor Gray
}
catch {
    Write-Host "❌ Earnings endpoint error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ($_.Exception.Response.Content | ConvertFrom-Json | ConvertTo-Json) -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Test Completed Successfully! ===" -ForegroundColor Green
