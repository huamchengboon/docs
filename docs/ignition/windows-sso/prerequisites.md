# Prerequisites and decisions

Check these before you start. The reasons are what you will need when something is different in your environment.
{ .lead }

<div class="grid cards" markdown>

-   **Needed**

    ---

    - An AD domain, a DNS zone for it, and an **Enterprise Root/Sub CA** (AD CS) whose certificate is trusted by all domain machines (automatic for an Enterprise CA).
    - An elevated **Windows PowerShell 5.1** session as a domain admin (an un-elevated admin token gives *Access denied* for DNS/CA/AD FS commands).
    - The **Ignition 8.3 Windows installer** and the **Designer Launcher** (both from inductiveautomation.com; the download page needs a registration form).
    - Clients that are **domain-joined**, use your DNS, and where the user logs in with a domain account.
    - Accurate time everywhere (Kerberos tolerates only ~5 min skew).

-   **Decisions made here**

    ---

    - **OIDC, not SAML.** Ignition supports both; OIDC needs no extra signing-certificate handling.
    - **Use host names, never IPs.** Kerberos and the intranet-zone rule only work with a DNS name (`adfs.…`, `ignition.…`).
    - **Ignition on 8043.** AD FS must own 443 on its host, so the one-server lab puts Ignition on 8043 and Windows Admin Center on 6443.
    - **gMSA** as the AD FS service account (no password to manage).
    - **Server certs from your own CA**, with SAN — modern browsers and Java both require SAN.
    - No Ignition “user source” for SSO: in 8.3 an external IdP maps claims to users and roles directly.

-   **Ports**

    ---

    | Port | Used by |
    | --- | --- |
    | 443/tcp | AD FS (HTTPS, WIA) |
    | 8043/tcp | Ignition HTTPS (opened in firewall) |
    | 8088/tcp | Ignition HTTP — left closed |
    | 8060/tcp | Ignition Gateway Network |
    | 6443/tcp | Windows Admin Center (moved) |
    | 53, 88, 389, 636… | DNS, Kerberos, LDAP (domain controller roles) |

</div>

!!! note "Convention in this guide"

    `PS>` blocks are Windows PowerShell 5.1, run **elevated**, on the server unless stated. Replace the values from [Values used in this build](values.md). Anything that contains a password is stored to a file with a restrictive ACL — it is never typed into a command line you will keep.
