# Patching the WSUS server

The offline WSUS server is a Windows Server too, and it needs security updates. It cannot reach Microsoft, so it gets them the same way as the clients: from its own WSUS, through the same monthly routine. We did this once, in the lab, to see whether the server survives it. It did.

!!! warning "What you are risking"

    The update restarts WSUS and its database, and the server restarts twice. While it is down, no client can scan or download. Patch the WSUS server in a quiet window, after the clients, and take a checkpoint or a backup first.

## 13.1 Before you start

- Check the server's own build. Ours was the original release, 26100.1, with no updates and no Windows Update policy, so the August update had to bring it all the way up in one step. Run `winver` or the check in [Installing on the client](client-install.md) on the server.
- Keep at least 30 GB free on C:. Our free space fell from 29.6 GB to 13.3 GB while the update installed.
- The Server 2025 product must be ticked on the online server, so the update is in the catalog. If you trimmed it away earlier, bring it back as described in [Fixing problems](troubleshooting.md), entry "A product's updates are missing after the trim".
- If you keep the Server product, set `$keep` in script 8 so the trim does not decline the Server updates.

## 13.2 Get the update onto the offline server

This is the monthly routine from [Monthly routine](monthly-routine.md), with the Server 2025 update in place of the Windows 11 one.

1. **Find and approve the Server update <span class="tag gui">GUI</span>**

    *Online server, WSUS console*

    Click **Updates**, then **All Updates**, set Approval to **Unapproved** and search for the KB number. The title reads *YYYY-MM Cumulative Update for Microsoft server operating system version 24H2 for x64-based Systems*. Approve that one only, for **All Computers**. Ignore the arm64 and .NET entries unless you need them.

2. **Download, verify, export <span class="tag cli">CLI</span>**

    *Online server*

    Watch the download with script 4, check the hashes with script 5, then export the catalog as in [Monthly routine](monthly-routine.md). Our Server update was 4 GB of downloads. Most of the large files were already on the offline server from the Windows 11 months, so only 12 new files (3.89 GB) had to be carried.

3. **Carry, extract, import, approve <span class="tag cli">CLI</span>**

    *Removable drive, offline server*

    Use script 6 for the archive and script 7 on the offline server, then import the catalog, then approve the update on the offline server with script 9. Content first, catalog second, as before. In the lab the offline catalog went from 157 to 181 updates and matched the online server exactly.

## 13.3 Point the server at itself

A WSUS server is not a client of its own WSUS unless you set it. We pointed ours at itself with the same four policy values as a client in [One-time build (4.6)](build.md), using the server's own address, and also set `NoAutoUpdate` to 1 so it does not install anything on its own.

```powershell title="powershell on the offline WSUS server, as administrator"
$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate'
New-Item $k -Force | Out-Null; New-Item "$k\AU" -Force | Out-Null
Set-ItemProperty $k WUServer       'http://10.0.0.10:8530'
Set-ItemProperty $k WUStatusServer 'http://10.0.0.10:8530'
Set-ItemProperty "$k\AU" UseWUServer  1 -Type DWord
Set-ItemProperty "$k\AU" NoAutoUpdate 1 -Type DWord
Restart-Service wuauserv
```

The server then appears in the WSUS console under **Computers**, next to the clients. The update was not offered during our first 6 minutes of scanning after the approval and the reset, and appeared a few minutes later. Rescan once a minute until it shows up, as for a client.

## 13.4 Install the update

Take a checkpoint of the server first. Then install exactly as on a client. Sign in on the server as an administrator, open an elevated PowerShell window as described in [Installing on the client](client-install.md), and run script 10 with `$KB` set to the Server update's KB number.

1. **Run the install**

    Run the script and leave the window open. The download from the server's own WSUS took about 10 minutes and the install about 16 minutes for us. The window ends with `install result code 2` and `rebootRequired=True`, then `DONE`.

2. **Restart and leave it alone <span class="tag gui">GUI</span>**

    Click Start, the power button, then **Restart**. It restarts twice. In the lab it came back after about 2 minutes, restarted again about 3 minutes later, and was at the sign-in screen when we looked 9 minutes after the restart command. Do not sign in until it has been quiet for a few minutes.

## 13.5 Check that the server and WSUS still work

Do not stop at the build number. Check all of these, on the server and from a client.

```powershell title="powershell on the offline WSUS server"
$cv = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
"Build: $($cv.CurrentBuildNumber).$($cv.UBR)"                       # Server 2025 August 2026 = 26100.33296
Get-Service WsusService, W3SVC, 'MSSQL$MICROSOFT##WID' | Format-Table Name, Status
$w = Get-WsusServer
"WSUS API ok, updates: " + @($w.GetUpdates((New-Object Microsoft.UpdateServices.Administration.UpdateScope))).Count
(Invoke-WebRequest http://localhost:8530/ClientWebService/client.asmx -UseBasicParsing).StatusCode   # expect 200
```

Then run the scan from [Installing on the client](client-install.md) on a client. In the lab, the server reported build 26100.33296, the update history showed `code=2`, the WSUS service, IIS and the database were running, the API returned the same 181 updates and 6 approved, the web service answered HTTP 200, and the Windows 11 client scanned the patched server with nothing offered.

!!! note "What we did not check"

    We did not time the console or the database before and after. Reindex SUSDB with script 8 after a server patch if the console feels slow. We removed the checkpoint after the checks. If you restore one, the database goes back to that moment, so re-run the import and approvals you did since.
