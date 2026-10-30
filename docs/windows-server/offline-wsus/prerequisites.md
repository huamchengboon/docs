# Before you start

## What you need

- Two Windows Server 2025 machines with Desktop Experience, one with internet access (online) and one on the isolated network (offline). Both run the WSUS role with the Windows Internal Database (WID).
- At least one test client on Windows 11 25H2, ideally a virtual machine with checkpoints, plus your real clients.
- A removable drive large enough for one month's carry (plan 10 GB) and a policy for scanning it.
- Administrator access to both servers, and a way to run PowerShell on them.

## Disk space

| Item | Size | Note |
| --- | --- | --- |
| Shared base files (`.wim`, one `.msu`) | about 8.4 GB | Downloaded once, reused every month. |
| Each monthly CU, new files only | 4.9 to 5.4 GB | June 5.25 GB, July 5.42 GB. |
| Carry archive while copying | same again | Delete it afterwards. The online server needs room for the files and the archive together. |
| Three months kept | about 24 GB | 8.4 GB shared plus about 5 GB per month. |
| Server 2025 CU for the WSUS server itself | about 3.9 GB new | Shares the large base files with the Windows 11 months. Patching the server from its original build took its free space on C: from 29.6 GB down to 13.3 GB while the update installed, so keep at least 30 GB free before you start. |

Give each server at least 100 GB for content and keep 40 GB free before starting a month. Our lab servers ran at 24 to 48 GB free and that was enough, but only after deleting old carry archives.

## Isolation checklist

Do not trust the design, test it. On the offline side confirm all of these before putting any data on it:

- The offline network has no gateway and no NAT.
- From the offline server, a connection to any online address fails.
- The host or router between the two networks has IP forwarding off.
