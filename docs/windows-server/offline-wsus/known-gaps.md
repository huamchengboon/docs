# Known gaps

These are things this guide cannot promise.

- The cause of the June boot failure is not proven. We never measured the client's EFI partition free space (mounting it failed). August installed cleanly on the same client, but that is one month and does not explain June.
- The cause of the April 0x800F0922 rollback is not proven.
- The BITS stall has a reliable workaround but no root cause. Foreground priority unblocked the stalled July download and the two downloads after it (August and Server 2025) ran without a stall. That is three observations, not a guarantee.
- Deleted update records did not come back after a normal sync, and did not come back through an import from a server that had been trimmed the same way. We did not test an import from an untrimmed server, or a later month's sync after a long gap.
- Patching the WSUS server itself ([Patching the WSUS server](server-patching.md)) was tried once, on one server, with one update. We did not measure whether the update database was slower afterwards, and we did not test restoring the checkpoint.
- The product untick and tick procedure in [Fixing problems](troubleshooting.md) was run in the lab, but the PowerShell version in this guide is a tidied reference version that we did not run in exactly that form. The Products and Classifications screen steps are described, not screenshotted.
- We did not shrink SUSDB, run the full Microsoft SQL maintenance, or test hardware clients.
- The screenshots come from the offline server and the client. The role-install wizard pages after "Select server roles" were not captured because the role was already installed, and the Hyper-V checkpoint settings pages were not captured. Those steps describe the standard Windows screens in words.
- Some GUI steps could not be tried without changing the lab, for example the confirmation box after Decline. The guide says "confirm if asked" for those.
- The lab used one client and one offline server. A larger estate may need approval groups and more disk.
- The client script (script 10) is a reference version rewritten for this guide. The lab version had the same steps but was not saved in this form. In the lab it ran as SYSTEM from a scheduled task, because remote sessions could not install updates. The guide has you run it from an elevated PowerShell window while signed in on the device, and we did not run it that way. Test it on a spare client before relying on it.
- Microsoft's WSUS documents we found describe older WSUS versions. We confirmed the metadata and approval behavior on Windows Server 2025 ourselves.
