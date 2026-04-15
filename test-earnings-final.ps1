# Complete Earnings Test
Write-Host "Testing Earnings API with Real Data" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001/api"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "teacher.test.$timestamp@fitpass.com"
$password = "Password123!"

# Step 1: Login Teacher
Write-Host "Step 1: Teacher Login..." -ForegroundColor Cyan
$loginData = @{ email = $email; password = $password } | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData -ErrorAction Stop
    $token = $loginResponse.token
    $teacherId = $loginResponse.user.id
    Write-Host ("OK: " + $loginResponse.user.fullName) -ForegroundColor Green
}
catch {
    Write-Host "Register new teacher..." -ForegroundColor Yellow
    $registerData = @{ fullName = "Teacher Test"; email = $email; password = $password; role = "TEACHER"; hourlyRate = 250000 } | ConvertTo-Json
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -ContentType "application/json" -Body $registerData
    $teacherId = $registerResponse.user.id
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData
    $token = $loginResponse.token
    Write-Host ("OK: " + $registerResponse.user.fullName) -ForegroundColor Green
}

$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
Write-Host ""

# Step 2: Create Class
Write-Host "Step 2: Creating Class..." -ForegroundColor Cyan
$classData = @{ name = "Yoga Test"; description = "Test Class"; type = "YOGA"; level = "BEGINNER"; schedule = "Mon,Wed,Fri"; maxStudents = 20; minStudents = 5 } | ConvertTo-Json

try {
    $classResponse = Invoke-RestMethod -Uri "$baseUrl/classes" -Method Post -Headers $headers -ContentType "application/json" -Body $classData
    $classId = $classResponse.data.id
    Write-Host ("OK: " + $classResponse.data.name) -ForegroundColor Green
}
catch {
    Write-Host ("ERROR Creating Class:") -ForegroundColor Red
    Write-Host ($_.Exception.Response | ConvertFrom-Json | ConvertTo-Json) -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Create Sessions
Write-Host "Step 3: Creating Sessions..." -ForegroundColor Cyan
$now = Get-Date
for ($i = 0; $i -lt 3; $i++) {
    $startTime = $now.AddDays(-($i)).AddHours(10)
    $endTime = $startTime.AddHours(1)
    $sessionData = @{ classId = $classId; startTime = $startTime.ToUniversalTime().ToString("o"); endTime = $endTime.ToUniversalTime().ToString("o"); roomId = $null; status = if ($i -eq 0) { "UPCOMING" } else { "DONE" } } | ConvertTo-Json
    
    try {
        $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/sessions" -Method Post -Headers $headers -ContentType "application/json" -Body $sessionData
        Write-Host ("OK: Session " + $sessionResponse.data.id) -ForegroundColor Green
    }
    catch {
        Write-Host ("SKIP: " + $_.Exception.Message) -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 4: Test Earnings
Write-Host "Step 4: Testing Earnings Endpoint..." -ForegroundColor Cyan

try {
    $earningsResponse = Invoke-RestMethod -Uri "$baseUrl/earnings/me" -Method Get -Headers $headers
    
    Write-Host "SUCCESS: Earnings Retrieved" -ForegroundColor Green
    Write-Host ""
    Write-Host "Teacher Info:" -ForegroundColor Cyan
    Write-Host ("  Name: " + $earningsResponse.teacher.fullName)
    Write-Host ("  Email: " + $earningsResponse.teacher.email)
    Write-Host ("  Rate: " + $earningsResponse.teacher.hourlyRate + " VND/h")
    Write-Host ""
    Write-Host "Earnings Summary:" -ForegroundColor Cyan
    Write-Host ("  Total Hours: " + $earningsResponse.earnings.totalHoursTaught + "h")
    Write-Host ("  This Month: " + $earningsResponse.earnings.currentMonthHours + "h")
    Write-Host ("  Expected Pay: " + $earningsResponse.earnings.expectedSalaryThisMonth + " VND")
    Write-Host ""
    Write-Host "Full Response:" -ForegroundColor Yellow
    Write-Host ($earningsResponse | ConvertTo-Json -Depth 5)
}
catch {
    Write-Host ("ERROR: " + $_.Exception.Message) -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Test Completed!" -ForegroundColor Green
