# Test Earnings API
# First, let's create a teacher via login or use an existing teacher

Write-Host "Testing Earnings API..." -ForegroundColor Cyan
Write-Host ""

# Use test credentials
$email = "teacher.test@fitpass.com"
$password = "Password123!"

# 1. Try to login or register
Write-Host "Step 1: Logging in teacher..." -ForegroundColor Cyan

$loginData = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginData `
        -ErrorAction Stop

    $token = $loginResponse.token
    $teacherId = $loginResponse.user.id
    Write-Host "✅ Teacher logged in: $($loginResponse.user.fullName)" -ForegroundColor Green
}
catch {
    # If login fails, register first
    Write-Host "⏳ Teacher not found, registering..." -ForegroundColor Yellow
    
    $teacherData = @{
        fullName = "Test Teacher $(Get-Random)"
        email = $email
        password = $password
        role = "TEACHER"
        hourlyRate = 250000
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/register `
        -Method Post `
        -ContentType "application/json" `
        -Body $teacherData

    $teacherId = $registerResponse.user.id
    Write-Host "✅ Teacher registered: $($registerResponse.user.fullName)" -ForegroundColor Green
    
    # Now login to get token
    $loginResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginData
    
    $token = $loginResponse.token
}

Write-Host "   Teacher ID: $teacherId" -ForegroundColor Yellow
Write-Host "   Token: $($token.Substring(0, 30))..." -ForegroundColor Yellow
Write-Host ""

# 2. Call earnings endpoint
Write-Host "Step 2: Calling GET /api/earnings/me..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $earningsResponse = Invoke-RestMethod -Uri http://localhost:3001/api/earnings/me `
        -Method Get `
        -Headers $headers

    Write-Host "✅ Earnings data retrieved successfully!" -ForegroundColor Green
    Write-Host ($earningsResponse | ConvertTo-Json -Depth 5) -ForegroundColor Yellow
}
catch {
    Write-Host "❌ Error calling earnings endpoint:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ($_.Exception.Response.Content | ConvertFrom-Json | ConvertTo-Json) -ForegroundColor Red
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Cyan
