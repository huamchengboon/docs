---
hide:
  - toc
---

# Ignition

Guides for Inductive Automation Ignition, each written from a working lab: what was built, the exact steps, and what went wrong along the way.
{ .lead }

<div class="grid cards guide-cards" markdown>

-   :material-shield-key:{ .lg .middle } **Windows SSO for Ignition Perspective**

    ---

    Domain users open a Perspective page and are signed in silently with their Windows logon. AD FS speaks OpenID Connect to Ignition and does the Kerberos part.

    <span class="tag">Ignition 8.3</span> <span class="tag">AD FS</span> <span class="tag">OIDC</span> <span class="tag">Kerberos</span>

    [:octicons-arrow-right-24: Overview](windows-sso/index.md){ .card-main }
    [Build steps](windows-sso/build/step-01.md) ·
    [Troubleshooting](windows-sso/troubleshooting.md) ·
    [Verification checklist](windows-sso/verification.md)

-   :material-database-clock:{ .lg .middle } **TimescaleDB with Ignition**

    ---

    Use PostgreSQL with TimescaleDB as the Tag Historian database, with automatic compression and retention, on Windows or Ubuntu. Includes the Ignition driver and provider settings, maintenance queries and a migration outline from SQL Server.

    <span class="tag">PostgreSQL</span> <span class="tag">TimescaleDB</span> <span class="tag">Historian</span> <span class="tag">Windows</span> <span class="tag">Ubuntu</span>

    [:octicons-arrow-right-24: Overview](timescaledb/index.md){ .card-main }
    [Ignition setup](timescaledb/ignition-setup.md) ·
    [Hypertable setup](timescaledb/hypertable.md) ·
    [Maintenance](timescaledb/maintenance.md)

</div>

## At a glance

| Guide | What you end up with | Size | Status |
| --- | --- | --- | --- |
| [Windows SSO for Perspective](windows-sso/index.md) | Silent Windows sign-in to Perspective, with AD groups as Ignition roles | 11 build steps, troubleshooting, rebuild script | <span class="pill ok">Working, 2 Oct 2026</span> |
| [TimescaleDB with Ignition](timescaledb/index.md) | Ignition storing history in PostgreSQL with TimescaleDB, compressed and pruned automatically | 9 pages, two PDFs | <span class="pill warn">Tested on TimescaleDB 2.13, Ignition 8.1</span> |
