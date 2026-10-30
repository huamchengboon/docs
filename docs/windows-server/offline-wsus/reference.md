# Reference values

| Item | Value in our lab |
| --- | --- |
| Offline network | Hyper-V internal switch `OfflineNet`, `10.0.0.0/24`, no NAT and no gateway |
| Offline WSUS | `10.0.0.10`, port 8530, content at `C:\WSUS\WsusContent` |
| Online WSUS | Content at `C:\WsusContent`, manual sync, foreground download priority on |
| Client policy | `WUServer` and `WUStatusServer` = `http://10.0.0.10:8530`, `UseWUServer` = 1, `DoNotConnectToWindowsUpdateInternetLocations` = 1 |
| Carry archive per month | 5.25 GB (June), 5.42 GB (July), 5.34 GB (August), 13.4 GB the first time. Server 2025 August: 3.89 GB |
| Catalog export | always complete. About 86 MB in the first runs, 3.1 MB after trimming to 12 months (181 updates) |
| Typical timings | Download 1.5 min to 8 min, each copy hop about 1.5 min, hash check about 1 min, client install about 15 min, wait after restart 20 to 25 min. Server 2025 update: download from its own WSUS 10 min, install 16 min, two restarts, sign-in screen within 9 min of the restart command |
| Build numbers | March 26200.8037, April 26200.8246, May 26200.8457, June 26200.8655, July 26200.8875, August 26200.9168. Server 2025: original 26100.1, August 2026 26100.33296 |
| Update IDs | April KB5083769: `85961d5c-6c88-47e6-b6ce-07c1d8dd0cb7`<br>May KB5089549: `a8f81155-2519-4821-8f73-74283c5bd00b`<br>June KB5094126: `d5b11ba8-f08e-4fcb-97f8-5f5b1c6e226b`<br>July KB5101650: `99751b16-0794-4995-925d-9840365e1133`<br>August KB5121003 (Windows 11 25H2 x64): `8e007475-a729-445f-96ec-eae1299f3f93`<br>August KB5120233 (Server 2025 x64): `37b7fb30-903d-480a-b672-1b8960239fe3` |
| Update install result | History `code=2` and `hr=0x00000000` is success. `code=4` is failure. |
| Logs | WSUS: `C:\Program Files\Update Services\LogFiles\SoftwareDistribution.log`<br>BITS: event log Microsoft-Windows-Bits-Client/Operational<br>Client servicing: `C:\Windows\Logs\CBS\CBS.log` and `C:\Windows\Panther\setuperr.log` |

## Sources we used

- Microsoft: [WSUS database maintenance](https://learn.microsoft.com/en-us/troubleshoot/mem/configmgr/update-management/wsus-automatic-maintenance) and [BITS download failures](https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/cannot-download-file-background-intelligent-transfer-service) (foreground mode and the Range header).
- [Force BITS to download WSUS updates in the foreground](https://www.saotn.org/force-bits-to-download-wsus-updates-in-the-foreground-in-windows-server), for the PowerShell setting.
- [Why Windows 11 cumulative updates are so big](https://oofhours.com/2025/10/16/windows-11-cumulative-updates-how-can-they-possibly-be-that-big/), for the 3 to 4 GB a month WSUS stores.
- [Reports of KB5094126 boot and BitLocker problems](https://www.digitalcitizen.life/windows-11-kb5094126-update-is-causing-boot-bitlocker-and-file-explorer-problems/).
