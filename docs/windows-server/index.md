---
hide:
  - toc
---

# Windows Server

Guides for Windows Server roles and operations, each written from a working lab: what was built, the exact steps, and what went wrong along the way.
{ .lead }

<div class="grid cards guide-cards" markdown>

-   :material-shield-check:{ .lg .middle } **Offline Symantec Endpoint Protection**

    ---

    Install the manager beside an offline WSUS lab, enroll a Windows client, and carry antivirus definitions across the network boundary.

    <span class="tag">SEPM 14.4</span> <span class="tag">Windows Server 2025</span> <span class="tag">Air-gapped</span>

    [:octicons-arrow-right-24: Open the guide](offline-sepm/index.md){ .card-main }
    [Deploy a client](offline-sepm/client.md) ·
    [Offline definitions](offline-sepm/updates.md) ·
    [Verify](offline-sepm/verification.md)

-   :material-microsoft-windows:{ .lg .middle } **Offline WSUS runbook**

    ---

    Patch an air-gapped Windows 11 estate through an offline WSUS server, with a removable drive as the only link to the internet-connected WSUS. Includes patching the WSUS server itself.

    <span class="tag">WSUS</span> <span class="tag">Windows Server 2025</span> <span class="tag">Windows 11 25H2</span> <span class="tag">Air-gapped</span>

    [:octicons-arrow-right-24: Overview](offline-wsus/index.md){ .card-main }
    [Monthly routine](offline-wsus/monthly-routine.md) ·
    [Fixing problems](offline-wsus/troubleshooting.md) ·
    [Script library](offline-wsus/scripts.md)

-   :material-calendar-sync:{ .lg .middle } **Every month, in short**

    ---

    Sync online, check the size, take a checkpoint, approve, download, verify, export the catalog, carry the new files, verify, import, trim, approve offline, test on one client, then roll out.

    [:octicons-arrow-right-24: Monthly routine](offline-wsus/monthly-routine.md){ .card-main }
    [Installing on the client](offline-wsus/client-install.md) ·
    [Cleanup and retention](offline-wsus/cleanup.md)

</div>

## At a glance

| Guide | What you end up with | Size | Status |
| --- | --- | --- | --- |
| [Offline Symantec Endpoint Protection](offline-sepm/index.md) | A manager and one managed Windows 11 client, with antivirus definitions transferred offline | 5 pages | <span class="pill ok">Lab tested 30 Oct 2026</span> |
| [Offline WSUS runbook](offline-wsus/index.md) | An offline WSUS that patches Windows 11 clients and itself, refreshed from an online WSUS each month | 13 pages, 28 annotated screenshots, 10 scripts | <span class="pill ok">Validated 27 to 29 Oct 2026</span> |
