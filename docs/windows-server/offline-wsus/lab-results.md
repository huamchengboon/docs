# What the lab proved

We built the whole chain in Hyper-V and pushed six updates through it: five for the Windows 11 client and one for the offline WSUS server itself. The table lists what happened, including the failures.

| Update | Carried | Result |
| --- | --- | --- |
| .NET Framework CU, KB5082417 | 92 MB | <span class="pill ok">Installed</span> First end-to-end test of export, copy, import, approve, install. |
| April 2026 CU, KB5083769 (26200.8246) | 13.3 GB | <span class="pill warn">Second try</span> First install rolled back at restart with 0x800F0922. The retry, left untouched during the restart, worked. The 13.3 GB included about 8 GB of shared files that later months reuse. |
| June 2026 CU, KB5094126 (26200.8655) | 5.25 GB | <span class="pill bad">Client did not boot</span> Installed, then stuck at Automatic Repair after the restart. We restored the checkpoint. Cause not proven, see [Fixing problems](troubleshooting.md). |
| July 2026 CU, KB5101650 (26200.8875) | 5.42 GB | <span class="pill ok">Installed</span> Went from April straight to July, skipping May and June. Client booted normally. |
| August 2026 CU, KB5121003 (26200.9168) | 5.34 GB | <span class="pill ok">Installed</span> Went from July to August. The client's download from the offline server took 5 minutes. After the restart the client reached the sign-in screen in under 3 minutes with no repair screen, and we left it alone for 20 minutes. Build 26200.9168, nothing else offered. |
| August 2026 Server 2025 CU, KB5120233 (26100.33296), installed on the offline WSUS server itself | 3.89 GB, plus the catalog | <span class="pill ok">Installed</span> The server went from its original build 26100.1 to 26100.33296 in one update, restarted twice, and WSUS kept working. The client still scanned it afterwards. See [Patching the WSUS server](server-patching.md). |

!!! success "What this tells you"

    The pipeline works, and skipping months works because the updates are cumulative. It also shows that a monthly update can fail in a way WSUS cannot warn you about. Always test on a disposable client with a checkpoint first.

    August installed cleanly on the same client that had failed on June, which makes the June failure look specific to that update. One good month does not prove that, so the test-client rule stays.

The May update (KB5089549) was downloaded and sized but never installed in the lab.
