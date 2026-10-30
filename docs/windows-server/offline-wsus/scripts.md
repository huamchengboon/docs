# Script library

All scripts are Windows PowerShell 5.1 and run on the machine named in the label. Replace the placeholders. The `$id` values are update IDs from script 1. `Try` is a reserved word in PowerShell, so do not name a function that.

## Script 1. Find the month's cumulative update

```powershell title="powershell on the online server"
$w = Get-WsusServer
"Last sync: " + $w.GetSubscription().GetLastSynchronizationInfo().EndTime

$all = $w.GetUpdates((New-Object Microsoft.UpdateServices.Administration.UpdateScope))

$all |
  Where-Object { $_.Title -match 'Cumulative Update for Windows 11, version 25H2 for x64' } |
  Sort-Object CreationDate |
  ForEach-Object {
    "{0:yyyy-MM-dd} | {1} | id={2} | approved={3}" -f
      $_.CreationDate,
      $_.Title,
      $_.Id.UpdateId,
      $_.IsApproved
  }
```

## Script 2. Size check, read only

```powershell title="powershell on the online server"
$id   = 'PASTE-UPDATE-ID'
$root = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Update Services\Server\Setup').ContentDir
$dir  = Join-Path $root 'WsusContent'
$u    = (Get-WsusServer).GetUpdate([Guid]$id)

$have = 0
$need = 0

foreach ($f in ($u.GetInstallableItems() | ForEach-Object { $_.Files })) {
  $h = ([uri]$f.FileUri).Segments[-1]
  $p = Join-Path $dir ($h.Substring($h.Length-6,2) + '\' + $h)

  if (Test-Path $p) {
    $have += $f.TotalBytes
  }
  else {
    $need += $f.TotalBytes
    if ($f.TotalBytes -gt 1MB) {
      "{0,7:N0} MB NEW  {1}" -f ($f.TotalBytes/1MB), $f.Name
    }
  }
}

"{0}`nOn disk {1:N2} GB | to download {2:N2} GB | free {3:N1} GB" -f
  $u.Title,
  ($have/1GB),
  ($need/1GB),
  ((Get-PSDrive C).Free/1GB)
```

## Script 3. Approve one update for All Computers

```powershell title="powershell on either WSUS server"
$id = 'PASTE-UPDATE-ID'
$w  = Get-WsusServer
$u  = $w.GetUpdate([Guid]$id)
$g  = $w.GetComputerTargetGroups() | Where-Object Name -eq 'All Computers'

[void]$u.Approve('Install', $g)
"Approved: " + $u.Title
```

To undo an approval, run this in the same window:

```powershell title="powershell on either WSUS server"
$u.GetUpdateApprovals() | ForEach-Object { $_.Delete() }
```

## Script 4. Watch the download

```powershell title="powershell on the online server"
$id   = 'PASTE-UPDATE-ID'
$root = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Update Services\Server\Setup').ContentDir
$u    = (Get-WsusServer).GetUpdate([Guid]$id)

1..60 | ForEach-Object {
  $ok    = 0
  $total = 0

  foreach ($f in ($u.GetInstallableItems() | ForEach-Object { $_.Files })) {
    $total++
    $h = ([uri]$f.FileUri).Segments[-1]
    $p = Join-Path $root ('WsusContent\' + $h.Substring($h.Length-6,2) + '\' + $h)

    if ((Test-Path $p) -and (Get-Item $p).Length -eq $f.TotalBytes) {
      $ok++
    }
  }

  $jobs = @(Get-BitsTransfer -AllUsers -ErrorAction SilentlyContinue)

  "{0:HH:mm:ss} files {1}/{2} | bits jobs {3} | states: {4}" -f
    (Get-Date),
    $ok,
    $total,
    $jobs.Count,
    (($jobs.JobState | Sort-Object -Unique) -join ',')

  if ($ok -eq $total) { return }
  Start-Sleep 20
}
```

## Script 5. Check every file against its hash

```powershell title="powershell on the online server"
$id   = 'PASTE-UPDATE-ID'
$root = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Update Services\Server\Setup').ContentDir
$u    = (Get-WsusServer).GetUpdate([Guid]$id)

$bad = 0
$n   = 0

foreach ($f in ($u.GetInstallableItems() | ForEach-Object { $_.Files })) {
  $h = ([uri]$f.FileUri).Segments[-1]
  $p = Join-Path $root ('WsusContent\' + $h.Substring($h.Length-6,2) + '\' + $h)
  $n++

  if ((Get-FileHash $p -Algorithm SHA1).Hash -ne
      [IO.Path]::GetFileNameWithoutExtension($h).ToUpper()) {
    $bad++
    "MISMATCH: $h"
  }
}

"$n files checked, $bad mismatches"
```

## Script 6. Build the carry archive (only the new files)

First list the files the offline server already holds, then build an archive of the rest. The offline server's list travels on the removable drive. Create `offline-have.txt` there with this line and bring it back:

```powershell title="powershell on the offline server"
Get-ChildItem 'C:\WSUS\WsusContent' -Recurse -File |
  ForEach-Object { $_.Name.ToUpper() } |
  Set-Content C:\Transfer\offline-have.txt
```

```powershell title="powershell on the online server"
$id = 'PASTE-UPDATE-ID'

$have = @{}
Get-Content C:\Transfer\offline-have.txt | ForEach-Object { $have[$_] = $true }

$root = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Update Services\Server\Setup').ContentDir
$u    = (Get-WsusServer).GetUpdate([Guid]$id)

$rel = @()
foreach ($f in ($u.GetInstallableItems() | ForEach-Object { $_.Files })) {
  $h = ([uri]$f.FileUri).Segments[-1]
  if (-not $have.ContainsKey($h.ToUpper())) {
    $rel += ($h.Substring($h.Length-6,2) + '\' + $h)
  }
}

$rel | Set-Content C:\Transfer\new-files.txt
Remove-Item C:\Transfer\content.tar -ErrorAction SilentlyContinue
& tar.exe -cf C:\Transfer\content.tar -C (Join-Path $root 'WsusContent') -T C:\Transfer\new-files.txt

"{0} files, {1:N2} GB" -f $rel.Count, ((Get-Item C:\Transfer\content.tar).Length/1GB)
```

Then copy `content.tar` and `export.xml.gz` to the removable drive. The lab July carry listed 8 files. The tar is not compressed, because the files are already compressed.

## Script 7. Extract and verify on the offline server

```powershell title="powershell on the offline server"
$dest = 'C:\WSUS\WsusContent'

& tar.exe -tf C:\Transfer\content.tar | Set-Content C:\Transfer\new-list.txt
& tar.exe -xf C:\Transfer\content.tar -C $dest

$bad = 0
$n   = 0

foreach ($rel in (Get-Content C:\Transfer\new-list.txt | Where-Object { $_ })) {
  $f = Get-Item (Join-Path $dest ($rel -replace '/','\'))
  $n++

  if ((Get-FileHash $f.FullName -Algorithm SHA1).Hash -ne $f.BaseName.ToUpper()) {
    $bad++
    "MISMATCH: $($f.Name)"
  }
}

"$n new files checked, $bad mismatches"
```

## Script 8. Trim to 12 months, delete declined, reindex

Take a checkpoint first. Run offline server first, then online. The decline rule skips anything that is approved. Run the four parts in order in the same PowerShell window.

### Part 1. Set up and count

`$keep` lists the products to keep. Add `'Microsoft Server Operating System-24H2'` to it if you also patch the WSUS server.

```powershell title="powershell on each WSUS server"
$w    = Get-WsusServer
$cut  = (Get-Date).AddMonths(-12)
$keep = @('Windows 11')

function Counts {
  $a = @($w.GetUpdates((New-Object Microsoft.UpdateServices.Administration.UpdateScope)))
  "total {0}, active {1}, declined {2}" -f
    $a.Count,
    @($a | Where-Object { -not $_.IsDeclined }).Count,
    @($a | Where-Object { $_.IsDeclined }).Count
}

"start: " + (Counts)
```

### Part 2. Decline old and unwanted updates

This declines updates older than 12 months, or not for a product in `$keep`, and never an approved update. Run everything except the last line first, read the number it would decline, then run the last line.

```powershell title="powershell on each WSUS server"
$all = $w.GetUpdates((New-Object Microsoft.UpdateServices.Administration.UpdateScope))

$cand = @($all | Where-Object {
  -not $_.IsDeclined -and
  -not $_.IsApproved -and
  ($_.CreationDate -lt $cut -or -not @($_.ProductTitles | Where-Object { $keep -contains $_ }))
})
"would decline: " + $cand.Count

$cand | ForEach-Object { $_.Decline() }
```

### Part 3. Delete the declined records

This is permanent. Run it again if some fail.

```powershell title="powershell on each WSUS server"
$w.GetUpdates((New-Object Microsoft.UpdateServices.Administration.UpdateScope)) |
  Where-Object { $_.IsDeclined } |
  ForEach-Object {
    try {
      $w.DeleteUpdate($_.Id.UpdateId.ToString())
    }
    catch {
      "FAILED: " + $_.Title
    }
  }
```

### Part 4. Reindex, then remove unneeded files

The reindex talks to the database directly, so no `sqlcmd` is needed. The cleanup then removes files nobody needs any more.

```powershell title="powershell on each WSUS server"
$cs = 'Data Source=np:\\.\pipe\MICROSOFT##WID\tsql\query;Initial Catalog=SUSDB;Integrated Security=True'
$c  = New-Object System.Data.SqlClient.SqlConnection $cs
$c.Open()

foreach ($sql in 'EXEC sp_MSforeachtable @command1="SET QUOTED_IDENTIFIER ON;ALTER INDEX ALL ON ? REBUILD;"',
                 'EXEC sp_msforeachtable "UPDATE STATISTICS ? WITH FULLSCAN, COLUMNS"') {
  $cmd = $c.CreateCommand()
  $cmd.CommandText    = $sql
  $cmd.CommandTimeout = 1800
  [void]$cmd.ExecuteNonQuery()
}

$c.Close()

Invoke-WsusServerCleanup -CleanupUnneededContentFiles | Out-String

"end: " + (Counts)

"Approved: " + (
  ($w.GetUpdates((New-Object Microsoft.UpdateServices.Administration.UpdateScope)) |
    Where-Object IsApproved |
    ForEach-Object { 'KB' + ($_.KnowledgebaseArticles -join ',') }
  ) -join ', '
)
```

Lab result: online 617 to 157 updates, offline 617 to 157. Both approved updates stayed approved.

## Script 9. Approve on the offline server and register the files

The first part approves the update and makes WSUS re-check its files. The second part confirms every file of the update is on disk with the right size.

```powershell title="powershell on the offline server"
$id = 'PASTE-UPDATE-ID'
$w  = Get-WsusServer
$u  = $w.GetUpdate([Guid]$id)
$g  = $w.GetComputerTargetGroups() | Where-Object Name -eq 'All Computers'

[void]$u.Approve('Install', $g)
& "$env:ProgramFiles\Update Services\Tools\wsusutil.exe" reset
```

```powershell title="powershell on the offline server"
$miss = 0

foreach ($f in ($u.GetInstallableItems() | ForEach-Object { $_.Files })) {
  $h = ([uri]$f.FileUri).Segments[-1]
  $p = 'C:\WSUS\WsusContent\' + $h.Substring($h.Length-6,2) + '\' + $h

  if (-not ((Test-Path $p) -and (Get-Item $p).Length -eq $f.TotalBytes)) {
    $miss++
  }
}

"missing or short: $miss"
```

## Script 10. Client install (reference version)

Save as `C:\Temp\wu-install.ps1` on the client and run it from an elevated PowerShell window, as described in [Installing on the client](client-install.md). Change the KB number each month. It is set in one place, the `$KB` line at the top, and the script uses that variable for both the search and the log messages. The same script patches the WSUS server in [Patching the WSUS server](server-patching.md) with only that line changed.

```powershell title="powershell on the client"
$KB  = '5101650'
$log = 'C:\Temp\wu-install.log'

function L($m) {
  $line = "{0:HH:mm:ss} {1}" -f (Get-Date), $m
  $line | Add-Content $log
  $line
}

$session  = New-Object -ComObject Microsoft.Update.Session
$searcher = $session.CreateUpdateSearcher()
$target   = $null

for ($i = 1; $i -le 40 -and -not $target; $i++) {
  $r      = $searcher.Search('IsInstalled=0 and IsHidden=0')
  $target = $r.Updates | Where-Object { $_.KBArticleIDs -contains $KB } | Select-Object -First 1

  if (-not $target) {
    L "scan ${i}: KB$KB not offered yet, waiting 60 s"
    Start-Sleep 60
  }
}

if (-not $target) {
  L "KB$KB was never offered"
  return
}

L ("offered: " + $target.Title)

$coll = New-Object -ComObject Microsoft.Update.UpdateColl
[void]$coll.Add($target)

$dl = $session.CreateUpdateDownloader()
$dl.Updates = $coll
$dr = $dl.Download()
L "download result code $($dr.ResultCode)"

$in = $session.CreateUpdateInstaller()
$in.Updates = $coll
$ir = $in.Install()
L "install result code $($ir.ResultCode), reboot required: $($ir.RebootRequired)"

L 'DONE'
```

Result code 2 means succeeded. Then restart, wait, and verify as in [Installing on the client](client-install.md).
