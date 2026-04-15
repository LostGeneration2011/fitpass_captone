# Test Register API
Write-Host "Testing POST /auth/register..." -ForegroundColor Cyan
$registerData = @{
    fullName = "Test Student $(Get-Random)"
    email = "test.student.$(Get-Random)@fitpass.com"
    password = "password123"
    role = "STUDENT"
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod -Uri http://localhost:3001/auth/register `
    -Method Post `
    -ContentType "application/json" `
    -Body $registerData

Write-Host "Registration successful!" -ForegroundColor Green
Write-Host "User: $($registerResponse.user.fullName) ($($registerResponse.user.role))" -ForegroundColor Yellow
Write-Host "Token: $($registerResponse.token.Substring(0, 20))..." -ForegroundColor Yellow

# Test Login API
Write-Host "`nTesting POST /auth/login..." -ForegroundColor Cyan
$loginData = @{
    email = $registerResponse.user.email
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri http://localhost:3001/auth/login `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginData

Write-Host "Login successful!" -ForegroundColor Green
Write-Host "User: $($loginResponse.user.fullName)" -ForegroundColor Yellow

# Test Sessions API
Write-Host "`nTesting GET /sessions..." -ForegroundColor Cyan
$sessions = Invoke-RestMethod -Uri http://localhost:3001/sessions
$sessions | ConvertTo-Json -Depth 5

Write-Host "`nTotal sessions: $($sessions.Count)" -ForegroundColor Green
$sessions | ForEach-Object {
    Write-Host "- Session $($_.id): $($_.class.name) - $($_.status) - Start: $($_.startTime)" -ForegroundColor Yellow
}
