$base = "http://103.179.45.111:3000"
$backend = "http://103.179.45.111:4000"
$passed = 0
$failed = 0

function Test-Case($name, $script) {
  try {
    & $script
    Write-Host "PASS: $name" -ForegroundColor Green
    $script:passed++
  } catch {
    Write-Host "FAIL: $name - $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
  }
}

Test-Case "Backend health check" {
  $r = Invoke-RestMethod -Uri "$backend/health"
  if (-not $r.ok) { throw "Backend unhealthy" }
}

Test-Case "Cleanup existing meetings" {
  $all = Invoke-RestMethod -Uri "$base/api/meetings"
  foreach ($m in $all) {
    Invoke-RestMethod -Uri "$base/api/meetings/$($m.id)" -Method DELETE | Out-Null
  }
}

Test-Case "Home redirects to schedule" {
  $r = Invoke-WebRequest -Uri "$base/" -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue
  if ($r.StatusCode -ne 307 -and $r.StatusCode -ne 308) { throw "Expected redirect, got $($r.StatusCode)" }
}

Test-Case "Schedule page loads" {
  $r = Invoke-WebRequest -Uri "$base/schedule" -UseBasicParsing
  if ($r.StatusCode -ne 200) { throw "Status $($r.StatusCode)" }
  if ($r.Content -notmatch "Schedule") { throw "Missing Schedule content" }
  if ($r.Content -notmatch "navbar") { throw "Missing Bootstrap navbar" }
}

Test-Case "Status page loads" {
  $r = Invoke-WebRequest -Uri "$base/status" -UseBasicParsing
  if ($r.StatusCode -ne 200) { throw "Status $($r.StatusCode)" }
  if ($r.Content -notmatch "Status") { throw "Missing Status content" }
}

Test-Case "GET meetings empty" {
  $r = Invoke-RestMethod -Uri "$base/api/meetings?startDate=2026-06-29&endDate=2026-07-05"
  if ($r.Count -ne 0) { throw "Expected 0 meetings" }
}

$bodyHiring = @{
  meetingDate = "2026-07-01"
  meetingHour = 10
  companyName = "Hiring Corp"
  caller = "ORION"
  jobSiteName = "FINDY"
  meetingLink = "https://meet.google.com/hiring"
  jobPositionLink = "https://jobs.example.com/hiring"
  interviewer = "Jane Doe"
  contactName = "HR Team"
  contactPosition = "Recruiter"
  chatLink = "https://slack.com/hiring"
  jobStatus = "FIRST_INTERVIEW_SCHEDULED"
  jobCondition = "OK"
} | ConvertTo-Json

Test-Case "POST hiring stage meeting" {
  $script:hiring = Invoke-RestMethod -Uri "$base/api/meetings" -Method POST -Body $bodyHiring -ContentType "application/json"
  if ($script:hiring.companyName -ne "Hiring Corp") { throw "Wrong company" }
  if ($script:hiring.caller -ne "ORION") { throw "Wrong caller" }
}

$bodyReject = @{
  meetingDate = "2026-07-01"
  meetingHour = 11
  companyName = "Rejected Corp"
  caller = "ALEX"
  jobSiteName = "GREEN"
  jobStatus = "CASUAL_INTERVIEW_FAIL"
  jobCondition = "REJECT"
} | ConvertTo-Json

Test-Case "POST reject meeting" {
  $script:reject = Invoke-RestMethod -Uri "$base/api/meetings" -Method POST -Body $bodyReject -ContentType "application/json"
  if ($script:reject.jobCondition -ne "REJECT") { throw "Wrong condition" }
}

$bodyEarly = @{
  meetingDate = "2026-07-01"
  meetingHour = 14
  companyName = "Early Corp"
  caller = "WANG_BUG"
  jobSiteName = "TALENT"
  jobStatus = "CASUAL_INTERVIEW_PASS"
  jobCondition = "OK"
} | ConvertTo-Json

Test-Case "POST early stage meeting" {
  $script:early = Invoke-RestMethod -Uri "$base/api/meetings" -Method POST -Body $bodyEarly -ContentType "application/json"
  if ($script:early.jobStatus -ne "CASUAL_INTERVIEW_PASS") { throw "Wrong status" }
}

Test-Case "GET meetings by date range" {
  $r = Invoke-RestMethod -Uri "$base/api/meetings?startDate=2026-06-29&endDate=2026-07-05"
  if ($r.Count -ne 3) { throw "Expected 3 meetings, got $($r.Count)" }
}

Test-Case "GET OK meetings for status page" {
  $r = Invoke-RestMethod -Uri "$base/api/meetings?jobCondition=OK"
  if ($r.Count -ne 2) { throw "Expected 2 OK meetings, got $($r.Count)" }
}

Test-Case "PATCH meeting" {
  $patch = @{ jobStatus = "SECOND_INTERVIEW_SCHEDULED" } | ConvertTo-Json
  $updated = Invoke-RestMethod -Uri "$base/api/meetings/$($script:hiring.id)" -Method PATCH -Body $patch -ContentType "application/json"
  if ($updated.jobStatus -ne "SECOND_INTERVIEW_SCHEDULED") { throw "Patch failed" }
}

Test-Case "GET single meeting" {
  $r = Invoke-RestMethod -Uri "$base/api/meetings/$($script:hiring.id)"
  if ($r.id -ne $script:hiring.id) { throw "Wrong meeting returned" }
}

Test-Case "Duplicate slot rejected" {
  $resp = try {
    Invoke-WebRequest -Uri "$base/api/meetings" -Method POST -Body $bodyHiring -ContentType "application/json" -UseBasicParsing
    $null
  } catch {
    $_.Exception.Response
  }
  if (-not $resp) { throw "Should have failed" }
  $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
  $text = $reader.ReadToEnd()
  if ($text -notmatch "already exists") { throw "Wrong error: $text" }
}

Test-Case "GET upcoming meetings endpoint" {
  $r = Invoke-RestMethod -Uri "$base/api/meetings/upcoming?leadMinutes=15"
  if ($null -eq $r.meetings) { throw "Missing meetings array" }
  if ($r.leadMinutes -ne 15) { throw "Wrong leadMinutes" }
}

Test-Case "DELETE reject meeting" {
  Invoke-RestMethod -Uri "$base/api/meetings/$($script:reject.id)" -Method DELETE | Out-Null
  try {
    Invoke-RestMethod -Uri "$base/api/meetings/$($script:reject.id)"
    throw "Should be deleted"
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw "Expected 404" }
  }
}

Write-Host ""
Write-Host "Results: $passed passed, $failed failed" -ForegroundColor Cyan
if ($failed -gt 0) { exit 1 }
