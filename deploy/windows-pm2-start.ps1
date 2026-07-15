# Start the Meeting Schedule DB + backend after a server reboot (Windows VPS).
# Registered as scheduled task "MeetingSchedule" (boot trigger, ~90s delay so the
# shared PM2 daemon / other projects settle first). Idempotent: if the processes
# are already online (e.g. restored by another project's `pm2 resurrect`), PM2
# matches them by name and does not create duplicates.

$ErrorActionPreference = "Continue"
$Root = "C:\Users\Administrator\Documents\meeting schecdule - Copy"

Set-Location $Root

# Ensure the PM2 daemon is up.
pm2 ping 2>$null | Out-Null

# Ensure the meeting DB + backend are online (starts them if missing).
pm2 start "$Root\ecosystem.config.cjs" 2>$null | Out-Null

# Persist the current list.
pm2 save 2>$null | Out-Null

Write-Host "Meeting Schedule PM2 status:"
pm2 status
