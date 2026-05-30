param(
    [string]$InputPath = "c:\New folder\fitpass\BAO_CAO_DO_AN_FITPASS.txt",
    [string]$OutputPath = "c:\New folder\fitpass\BAO_CAO_DO_AN_FITPASS.docx"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InputPath)) {
    throw "Input file not found: $InputPath"
}

$word = $null
$doc = $null

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    $doc = $word.Documents.Add()

    $text = [System.IO.File]::ReadAllText($InputPath, [System.Text.Encoding]::UTF8)
    $doc.Content.Text = $text

    # Base formatting for entire document
    $doc.Content.Font.Name = "Times New Roman"
    $doc.Content.Font.Size = 13
    $doc.Content.ParagraphFormat.LineSpacingRule = 1 # 1.5 lines
    $doc.Content.ParagraphFormat.SpaceBefore = 0
    $doc.Content.ParagraphFormat.SpaceAfter = 0

    # Page setup (A4, one side)
    $cm = 28.3464567
    $doc.PageSetup.PaperSize = 7 # wdPaperA4
    $doc.PageSetup.TopMargin = 2.0 * $cm
    $doc.PageSetup.BottomMargin = 2.5 * $cm
    $doc.PageSetup.LeftMargin = 3.5 * $cm
    $doc.PageSetup.RightMargin = 2.0 * $cm

    # Heading formatting by numbering depth (only in main body, skip manual TOC area)
    $inMainBody = $false
    foreach ($para in $doc.Paragraphs) {
        $pText = $para.Range.Text.Trim()

        if (-not $inMainBody -and $pText -match '^Chương\s+1\.\s+TỔNG QUAN$') {
            $inMainBody = $true
        }

        if (-not $inMainBody) {
            continue
        }

        if ($pText -match '^Chương\s+\d+\.') {
            $para.Range.Font.Name = "Times New Roman"
            $para.Range.Font.Size = 16
            $para.Range.Font.Bold = 1
            $para.Range.Font.Italic = 0
            $para.Range.Font.Underline = 0
            $para.Range.Style = $doc.Styles.Item("Heading 1")
        }
        elseif ($pText -match '^\d+\.\d+\s') {
            $para.Range.Font.Name = "Times New Roman"
            $para.Range.Font.Size = 13
            $para.Range.Font.Bold = 1
            $para.Range.Font.Italic = 0
            $para.Range.Font.Underline = 0
            $para.Range.Style = $doc.Styles.Item("Heading 2")
        }
        elseif ($pText -match '^\d+\.\d+\.\d+\s') {
            $para.Range.Font.Name = "Times New Roman"
            $para.Range.Font.Size = 13
            $para.Range.Font.Bold = 0
            $para.Range.Font.Italic = 1
            $para.Range.Font.Underline = 0
            $para.Range.Style = $doc.Styles.Item("Heading 3")
        }
        elseif ($pText -match '^\d+\.\d+\.\d+\.\d+\s') {
            $para.Range.Font.Name = "Times New Roman"
            $para.Range.Font.Size = 13
            $para.Range.Font.Bold = 0
            $para.Range.Font.Italic = 0
            $para.Range.Font.Underline = 1
            $para.Range.Style = $doc.Styles.Item("Heading 4")
        }
    }

    # Add centered page numbers to footer
    $sec = $doc.Sections.Item(1)
    $null = $sec.Footers.Item(1).PageNumbers.Add()
    $sec.Footers.Item(1).Range.ParagraphFormat.Alignment = 1 # center

    # Save docx
    $doc.SaveAs([ref]$OutputPath, [ref]16) # wdFormatDocumentDefault
    $doc.Close()
    $word.Quit()

    Write-Host "Exported successfully: $OutputPath"
}
catch {
    if ($doc -ne $null) { $doc.Close() }
    if ($word -ne $null) { $word.Quit() }
    throw
}
finally {
    if ($doc -ne $null) {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
    }
    if ($word -ne $null) {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
