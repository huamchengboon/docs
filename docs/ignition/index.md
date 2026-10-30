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

    Install PostgreSQL and the TimescaleDB extension, then use it as an Ignition database for historian data, with automatic data retention.

    <span class="tag">PostgreSQL</span> <span class="tag">TimescaleDB</span> <span class="tag">Historian</span>

    [:octicons-arrow-right-24: Open the guide](timescaledb/index.md){ .card-main }
    [Setup PDF](timescaledb/TimescaleDB%20+%20Ignition%20Setup.pdf) ·
    [Documentation PDF](timescaledb/TimescaleDB%20Documentation.pdf)

</div>

## At a glance

| Guide | What you end up with | Size | Status |
| --- | --- | --- | --- |
| [Windows SSO for Perspective](windows-sso/index.md) | Silent Windows sign-in to Perspective, with AD groups as Ignition roles | 11 build steps, troubleshooting, rebuild script | <span class="pill ok">Working, 2 Oct 2026</span> |
| [TimescaleDB with Ignition](timescaledb/index.md) | Ignition storing history in PostgreSQL with TimescaleDB | One page and two PDFs | <span class="pill warn">May be outdated</span> |
