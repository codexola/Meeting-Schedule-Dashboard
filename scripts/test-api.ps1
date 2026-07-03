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
  meetingMinute = 0
  companyName = "Hiring Corp"
  caller = "ORION"
  jobSiteName = "Findy"
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
  if ($script:hiring.meetingMinute -ne 0) { throw "Wrong minute" }
}

$bodyCustomSite = @{
  meetingDate = "2026-07-01"
  meetingHour = 10
  meetingMinute = 30
  companyName = "Custom Site Corp"
  caller = "DAMIEN_DAVIAU"
  jobSiteName = "LinkedIn"
  jobStatus = "JOB_APPLICATION_RECEIVED"
  jobCondition = "OK"
} | ConvertTo-Json

Test-Case "POST custom job site at 10:30" {
  $script:custom = Invoke-RestMethod -Uri "$base/api/meetings" -Method POST -Body $bodyCustomSite -ContentType "application/json"
  if ($script:custom.jobSiteName -ne "LinkedIn") { throw "Wrong job site" }
  if ($script:custom.meetingMinute -ne 30) { throw "Wrong minute" }
}

$bodyReject = @{
  meetingDate = "2026-07-01"
  meetingHour = 11
  meetingMinute = 15
  companyName = "Rejected Corp"
  caller = "ALEX"
  jobSiteName = "Green"
  jobStatus = "CASUAL_INTERVIEW_FAIL"
  jobCondition = "REJECT"
} | ConvertTo-Json

Test-Case "POST reject meeting at 11:15" {
  $script:reject = Invoke-RestMethod -Uri "$base/api/meetings" -Method POST -Body $bodyReject -ContentType "application/json"
  if ($script:reject.jobCondition -ne "REJECT") { throw "Wrong condition" }
  if ($script:reject.meetingMinute -ne 15) { throw "Wrong minute" }
}

$bodyEarly = @{
  meetingDate = "2026-07-01"
  meetingHour = 14
  meetingMinute = 45
  companyName = "Early Corp"
  caller = "WANG_BUG"
  jobSiteName = "Talent"
  jobStatus = "CASUAL_INTERVIEW_PASS"
  jobCondition = "OK"
} | ConvertTo-Json

Test-Case "POST early stage meeting at 14:45" {
  $script:early = Invoke-RestMethod -Uri "$base/api/meetings" -Method POST -Body $bodyEarly -ContentType "application/json"
  if ($script:early.jobStatus -ne "CASUAL_INTERVIEW_PASS") { throw "Wrong status" }
  if ($script:early.meetingMinute -ne 45) { throw "Wrong minute" }
}

Test-Case "GET meetings by date range" {
  $r = Invoke-RestMethod -Uri "$base/api/meetings?startDate=2026-06-29&endDate=2026-07-05"
  if ($r.Count -ne 4) { throw "Expected 4 meetings, got $($r.Count)" }
}

Test-Case "GET OK meetings for status page" {
  $r = Invoke-RestMethod -Uri "$base/api/meetings?jobCondition=OK"
  if ($r.Count -ne 3) { throw "Expected 3 OK meetings, got $($r.Count)" }
}

Test-Case "PATCH meeting time and status" {
  $patch = @{
    meetingHour = 10
    meetingMinute = 5
    jobStatus = "SECOND_INTERVIEW_SCHEDULED"
  } | ConvertTo-Json
  $updated = Invoke-RestMethod -Uri "$base/api/meetings/$($script:hiring.id)" -Method PATCH -Body $patch -ContentType "application/json"
  if ($updated.jobStatus -ne "SECOND_INTERVIEW_SCHEDULED") { throw "Patch status failed" }
  if ($updated.meetingMinute -ne 5) { throw "Patch minute failed" }
}

Test-Case "GET single meeting" {
  $r = Invoke-RestMethod -Uri "$base/api/meetings/$($script:hiring.id)"
  if ($r.id -ne $script:hiring.id) { throw "Wrong meeting returned" }
  if ($r.meetingMinute -ne 5) { throw "Wrong minute on GET" }
}

Test-Case "Duplicate slot rejected" {
  $duplicateBody = @{
    meetingDate = "2026-07-01"
    meetingHour = 10
    meetingMinute = 5
    companyName = "Duplicate Corp"
    jobCondition = "OK"
  } | ConvertTo-Json
  $resp = try {
    Invoke-WebRequest -Uri "$base/api/meetings" -Method POST -Body $duplicateBody -ContentType "application/json" -UseBasicParsing
    $null
  } catch {
    $_.ErrorDetails.Message
  }
  if (-not $resp) { throw "Should have failed" }
  if ($resp -notmatch "already exists") { throw "Wrong error: $resp" }
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

Test-Case "Discussions page loads" {
  $r = Invoke-WebRequest -Uri "$base/discussions" -UseBasicParsing
  if ($r.StatusCode -ne 200) { throw "Status $($r.StatusCode)" }
  if ($r.Content -notmatch "Company Discussions") { throw "Missing discussions content" }
}

Test-Case "POST companies sync from meetings" {
  $r = Invoke-RestMethod -Uri "$base/api/companies/sync" -Method POST
  if ($r.meetingCount -lt 1) { throw "Expected meetings to sync" }
}

Test-Case "GET companies list" {
  $r = Invoke-RestMethod -Uri "$base/api/companies"
  if ($r.Count -lt 3) { throw "Expected at least 3 companies, got $($r.Count)" }
  $script:company = $r | Where-Object { $_.name -eq "Hiring Corp" } | Select-Object -First 1
  if (-not $script:company) { throw "Hiring Corp company not found" }
  if ($script:company.stages.Count -ne 6) { throw "Expected 6 stages" }
  if ($script:company.meetingCount -lt 1) { throw "Company must have schedule meetings" }
  if (-not $script:company.latestMeeting) { throw "Missing latest schedule meeting" }
}

Test-Case "Companies without meetings are hidden" {
  $meetings = Invoke-RestMethod -Uri "$base/api/meetings"
  $companies = Invoke-RestMethod -Uri "$base/api/companies"
  foreach ($company in $companies) {
    if ($company.meetingCount -lt 1) { throw "Orphan company returned: $($company.name)" }
  }
}

Test-Case "PATCH company stage outcome" {
  $patch = @{
    outcome = "SCHEDULED"
    scheduledDate = "2026-07-15"
    scheduledHour = 14
    scheduledMinute = 30
    meetingLink = "https://meet.google.com/third-round"
  } | ConvertTo-Json
  $updated = Invoke-RestMethod -Uri "$base/api/companies/$($script:company.id)/stages/THIRD_INTERVIEW" -Method PATCH -Body $patch -ContentType "application/json"
  $stage = $updated.stages | Where-Object { $_.stage -eq "THIRD_INTERVIEW" }
  if ($stage.outcome -ne "SCHEDULED") { throw "Stage outcome not updated" }
  if ($stage.scheduledHour -ne 14) { throw "Stage hour not updated" }
}

Test-Case "GET search by keyword" {
  $r = Invoke-RestMethod -Uri "$base/api/search?q=Hiring"
  if ($r.companies.Count -lt 1) { throw "Expected company search results" }
  if ($r.meetings.Count -lt 1) { throw "Expected meeting search results" }
}

Test-Case "GET meetings search filter" {
  $r = Invoke-RestMethod -Uri "$base/api/meetings?q=Custom"
  if ($r.Count -lt 1) { throw "Expected filtered meetings" }
}

Write-Host ""
Write-Host "Results: $passed passed, $failed failed" -ForegroundColor Cyan
if ($failed -gt 0) { exit 1 }
