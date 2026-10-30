# Production and security notes

What is fine for a lab, and what should change before real use.
{ .lead }

<div class="grid cards" markdown>

-   **Architecture**

    ---

    - Put **AD FS**, the **CA**, **WSUS**, **Ignition** and Windows Admin Center on **separate servers**; keep the DC for AD/DNS only. Microsoft advises against a CA or AD FS on a domain controller.
    - Run AD FS on ≥2 nodes behind a load balancer; use a SQL back end if you need more than a few nodes. Publish via a proxy (Web Application Proxy / reverse proxy) only if you need external access.
    - Use a CA hierarchy (offline root + issuing CA) and publish **HTTP** CDP/AIA so every client can validate.

-   **Secrets & keys**

    ---

    - The Ignition private key was displayed in the build session → **regenerate** the Ignition certificate and key.
    - Plain-text files in `C:\adfs-setup` (`ignition-client-secret.txt`, `ssotest-password.txt`, `ign\*.pem/.p12/password`, scripts and logs) must be moved to a vault or deleted; keep only what you need.
    - Store the client secret using Ignition’s *Secret Providers* instead of “Embedded”. Rotate it on a schedule.
    - Replace the lab test user; use named domain groups and map them to **Security Levels**/roles.

-   **Operations**

    ---

    - Certificate expiries: AD FS service cert **2028-10-01**, Ignition cert **2028-10-01**, AD FS token-signing/decrypting **2027-10-02** (self-managed, auto-rollover on). Calendar them.
    - After renewing the AD FS cert: `Set-AdfsSslCertificate -Thumbprint …` on every node, restart `adfssrv`.
    - Back up AD FS (system state / WID), the CA (database + key), and an Ignition Gateway backup (Platform → Backup & Restore).
    - Re-apply the Java CA import and Designer JVM flag after Ignition upgrades.
    - Enable *Force Secure Redirect* and keep 8088 closed; consider disabling HTTP completely.
    - Licence Ignition (trial resets every 2 h).

</div>

!!! warning "Not covered"

    Multi-factor authentication, single logout, device registration / Workplace Join, SAML, and non-Windows/non-domain clients (those fall back to the AD FS forms login). AD FS can add MFA providers; Ignition then simply receives the same token.
