# Script tạo file Excel với Gantt Chart cho dự án FitPass
# Chạy trong PowerShell

# Import Excel module (cần cài đặt ImportExcel module)
# Install-Module -Name ImportExcel -Force

param(
    [string]$OutputPath = "C:\vtc-project3\fitpass\FitPass_Gantt_Chart.xlsx"
)

# Data cho Gantt Chart
$tasks = @(
    @{Task="Project Planning & Analysis"; StartDate="2025-11-26"; EndDate="2025-12-02"; Phase="Planning"; Priority="High"; Resources="Business Analyst, Technical Lead"},
    @{Task="Domain Research"; StartDate="2025-11-26"; EndDate="2025-11-28"; Phase="Planning"; Priority="High"; Resources="Business Analyst"},
    @{Task="Database Design"; StartDate="2025-11-29"; EndDate="2025-12-02"; Phase="Planning"; Priority="High"; Resources="Database Designer"},
    
    @{Task="Backend Foundation"; StartDate="2025-12-03"; EndDate="2025-12-09"; Phase="Backend"; Priority="High"; Resources="Backend Developer"},
    @{Task="Prisma & Database Setup"; StartDate="2025-12-03"; EndDate="2025-12-05"; Phase="Backend"; Priority="High"; Resources="Backend Developer"},
    @{Task="Authentication System"; StartDate="2025-12-06"; EndDate="2025-12-09"; Phase="Backend"; Priority="High"; Resources="Backend Developer"},
    
    @{Task="Core Backend APIs"; StartDate="2025-12-10"; EndDate="2025-12-16"; Phase="Backend"; Priority="High"; Resources="Backend Developer"},
    @{Task="User Management API"; StartDate="2025-12-10"; EndDate="2025-12-13"; Phase="Backend"; Priority="High"; Resources="Backend Developer"},
    @{Task="Class Management System"; StartDate="2025-12-14"; EndDate="2025-12-16"; Phase="Backend"; Priority="High"; Resources="Backend Developer"},
    
    @{Task="Advanced Backend"; StartDate="2025-12-17"; EndDate="2025-12-23"; Phase="Backend"; Priority="Medium"; Resources="Backend Developer"},
    @{Task="Session & QR System"; StartDate="2025-12-17"; EndDate="2025-12-20"; Phase="Backend"; Priority="Medium"; Resources="Backend Developer"},
    @{Task="WebSocket Implementation"; StartDate="2025-12-21"; EndDate="2025-12-23"; Phase="Backend"; Priority="Medium"; Resources="Backend Developer"},
    
    @{Task="Mobile App Foundation"; StartDate="2025-12-24"; EndDate="2025-12-30"; Phase="Mobile"; Priority="High"; Resources="Mobile Developer"},
    @{Task="Mobile Setup & Auth"; StartDate="2025-12-24"; EndDate="2025-12-30"; Phase="Mobile"; Priority="High"; Resources="Mobile Developer"},
    
    @{Task="Student Mobile Features"; StartDate="2025-12-31"; EndDate="2026-01-06"; Phase="Mobile"; Priority="High"; Resources="Mobile Developer"},
    @{Task="Browse Classes Interface"; StartDate="2025-12-31"; EndDate="2026-01-03"; Phase="Mobile"; Priority="High"; Resources="Mobile Developer"},
    @{Task="Book Sessions Functionality"; StartDate="2026-01-04"; EndDate="2026-01-06"; Phase="Mobile"; Priority="High"; Resources="Mobile Developer"},
    
    @{Task="Teacher Mobile Features"; StartDate="2026-01-07"; EndDate="2026-01-13"; Phase="Mobile"; Priority="High"; Resources="Mobile Developer"},
    @{Task="Class Management Mobile"; StartDate="2026-01-07"; EndDate="2026-01-09"; Phase="Mobile"; Priority="High"; Resources="Mobile Developer"},
    @{Task="QR Code & Attendance"; StartDate="2026-01-10"; EndDate="2026-01-13"; Phase="Mobile"; Priority="Medium"; Resources="Mobile Developer"},
    
    @{Task="Admin Web Dashboard"; StartDate="2026-01-14"; EndDate="2026-01-20"; Phase="Web"; Priority="Medium"; Resources="Frontend Developer"},
    @{Task="Admin Interface"; StartDate="2026-01-14"; EndDate="2026-01-17"; Phase="Web"; Priority="Medium"; Resources="Frontend Developer"},
    @{Task="Reports & Analytics"; StartDate="2026-01-18"; EndDate="2026-01-20"; Phase="Web"; Priority="Low"; Resources="Frontend Developer"},
    
    @{Task="Testing & Deployment"; StartDate="2026-01-21"; EndDate="2026-01-29"; Phase="Testing"; Priority="High"; Resources="QA Engineer, DevOps"},
    @{Task="Integration Testing"; StartDate="2026-01-21"; EndDate="2026-01-24"; Phase="Testing"; Priority="High"; Resources="QA Engineer"},
    @{Task="Bug Fixes & Optimization"; StartDate="2026-01-25"; EndDate="2026-01-27"; Phase="Testing"; Priority="High"; Resources="Full-stack Developer"},
    @{Task="Production Deployment"; StartDate="2026-01-28"; EndDate="2026-01-29"; Phase="Deployment"; Priority="Medium"; Resources="DevOps Engineer"}
)

# Tạo các milestone
$milestones = @(
    @{Milestone="M1: Requirements Done"; Date="2025-12-02"; Description="Hoàn tất phân tích & thiết kế"},
    @{Milestone="M2: Backend MVP"; Date="2025-12-23"; Description="Core APIs hoạt động"},
    @{Milestone="M3: Mobile MVP"; Date="2026-01-13"; Description="App mobile cơ bản"},
    @{Milestone="M4: Admin Dashboard"; Date="2026-01-20"; Description="Web admin hoàn chính"},
    @{Milestone="M5: Production Ready"; Date="2026-01-29"; Description="Sẵn sàng deploy"}
)

Write-Host "Tạo file Excel Gantt Chart cho dự án FitPass..."
Write-Host "Output: $OutputPath"

# Tạo thông tin project
$projectInfo = @(
    @{Info="Tên dự án"; Value="FitPass - Ứng dụng quản lý phòng gym"},
    @{Info="Thời gian bắt đầu"; Value="26/11/2025"},
    @{Info="Thời gian kết thúc"; Value="29/01/2026"},
    @{Info="Tổng thời gian"; Value="9 tuần (64 ngày)"},
    @{Info="Tổng công việc"; Value="~360 giờ"},
    @{Info="Công nghệ chính"; Value="React Native + Node.js + Next.js"},
    @{Info="Database"; Value="PostgreSQL + Prisma ORM"},
    @{Info="Target"; Value="MVP với đầy đủ tính năng cơ bản"}
)

try {
    # Tạo workbook mới
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $workbook = $excel.Workbooks.Add()
    
    # Sheet 1: Project Info
    $worksheet1 = $workbook.Worksheets.Item(1)
    $worksheet1.Name = "Project Overview"
    
    # Tiêu đề
    $worksheet1.Cells.Item(1,1).Value = "FITPASS PROJECT OVERVIEW"
    $worksheet1.Cells.Item(1,1).Font.Size = 16
    $worksheet1.Cells.Item(1,1).Font.Bold = $true
    
    # Thông tin project
    $row = 3
    foreach ($info in $projectInfo) {
        $worksheet1.Cells.Item($row,1).Value = $info.Info
        $worksheet1.Cells.Item($row,2).Value = $info.Value
        $worksheet1.Cells.Item($row,1).Font.Bold = $true
        $row++
    }
    
    # Sheet 2: Gantt Chart
    $worksheet2 = $workbook.Worksheets.Add()
    $worksheet2.Name = "Gantt Chart"
    
    # Headers
    $worksheet2.Cells.Item(1,1).Value = "Task Name"
    $worksheet2.Cells.Item(1,2).Value = "Start Date" 
    $worksheet2.Cells.Item(1,3).Value = "End Date"
    $worksheet2.Cells.Item(1,4).Value = "Duration"
    $worksheet2.Cells.Item(1,5).Value = "Phase"
    $worksheet2.Cells.Item(1,6).Value = "Priority"
    $worksheet2.Cells.Item(1,7).Value = "Resources"
    
    # Format headers
    $headerRange = $worksheet2.Range("A1:G1")
    $headerRange.Font.Bold = $true
    $headerRange.Interior.Color = [System.Drawing.ColorTranslator]::ToOle([System.Drawing.Color]::LightBlue)
    
    # Add tasks
    $row = 2
    foreach ($task in $tasks) {
        $startDate = [DateTime]::Parse($task.StartDate)
        $endDate = [DateTime]::Parse($task.EndDate)
        $duration = ($endDate - $startDate).Days + 1
        
        $worksheet2.Cells.Item($row,1).Value = $task.Task
        $worksheet2.Cells.Item($row,2).Value = $startDate.ToString("dd/MM/yyyy")
        $worksheet2.Cells.Item($row,3).Value = $endDate.ToString("dd/MM/yyyy") 
        $worksheet2.Cells.Item($row,4).Value = "$duration ngày"
        $worksheet2.Cells.Item($row,5).Value = $task.Phase
        $worksheet2.Cells.Item($row,6).Value = $task.Priority
        $worksheet2.Cells.Item($row,7).Value = $task.Resources
        
        # Color coding by phase
        switch ($task.Phase) {
            "Planning" { $worksheet2.Cells.Item($row,5).Interior.Color = [System.Drawing.ColorTranslator]::ToOle([System.Drawing.Color]::LightYellow) }
            "Backend" { $worksheet2.Cells.Item($row,5).Interior.Color = [System.Drawing.ColorTranslator]::ToOle([System.Drawing.Color]::LightGreen) }
            "Mobile" { $worksheet2.Cells.Item($row,5).Interior.Color = [System.Drawing.ColorTranslator]::ToOle([System.Drawing.Color]::LightBlue) }
            "Web" { $worksheet2.Cells.Item($row,5).Interior.Color = [System.Drawing.ColorTranslator]::ToOle([System.Drawing.Color]::LightCoral) }
            "Testing" { $worksheet2.Cells.Item($row,5).Interior.Color = [System.Drawing.ColorTranslator]::ToOle([System.Drawing.Color]::LightPink) }
            "Deployment" { $worksheet2.Cells.Item($row,5).Interior.Color = [System.Drawing.ColorTranslator]::ToOle([System.Drawing.Color]::LightGray) }
        }
        
        $row++
    }
    
    # Sheet 3: Milestones
    $worksheet3 = $workbook.Worksheets.Add()
    $worksheet3.Name = "Milestones"
    
    # Headers
    $worksheet3.Cells.Item(1,1).Value = "Milestone"
    $worksheet3.Cells.Item(1,2).Value = "Target Date"
    $worksheet3.Cells.Item(1,3).Value = "Description"
    
    # Format headers
    $headerRange3 = $worksheet3.Range("A1:C1")
    $headerRange3.Font.Bold = $true
    $headerRange3.Interior.Color = [System.Drawing.ColorTranslator]::ToOle([System.Drawing.Color]::Orange)
    
    # Add milestones
    $row = 2
    foreach ($milestone in $milestones) {
        $worksheet3.Cells.Item($row,1).Value = $milestone.Milestone
        $worksheet3.Cells.Item($row,2).Value = $milestone.Date
        $worksheet3.Cells.Item($row,3).Value = $milestone.Description
        $row++
    }
    
    # Auto-fit columns
    $worksheet1.Columns.AutoFit() | Out-Null
    $worksheet2.Columns.AutoFit() | Out-Null
    $worksheet3.Columns.AutoFit() | Out-Null
    
    # Save file
    $workbook.SaveAs($OutputPath)
    $workbook.Close()
    $excel.Quit()
    
    Write-Host "✅ Đã tạo thành công file Excel: $OutputPath"
    Write-Host "📊 File chứa 3 sheets:"
    Write-Host "   - Project Overview: Thông tin tổng quan"
    Write-Host "   - Gantt Chart: Biểu đồ Gantt chi tiết"
    Write-Host "   - Milestones: Các mốc quan trọng"
}
catch {
    Write-Error "Lỗi khi tạo file Excel: $($_.Exception.Message)"
    Write-Host "💡 Hướng dẫn khắc phục:"
    Write-Host "   1. Đảm bảo Microsoft Excel đã được cài đặt"
    Write-Host "   2. Chạy PowerShell với quyền Administrator"
    Write-Host "   3. Cài đặt ImportExcel module: Install-Module -Name ImportExcel -Force"
}

# Cleanup
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()