# Values used in this build

Everything below is a placeholder you will replace when you replicate this in another domain. Keep the same *roles*, change the *values*.
{ .lead }

| Item | Value in this lab | Notes |
| --- | --- | --- |
| Operating system | Windows Server 2025 Standard (build 26100), Hyper-V VM, 7 GB RAM | Server 2025 disables RC4 for Kerberos by default — matters for the gMSA (see Step 3). |
| AD domain / NetBIOS | `example.local` / `EXAMPLE` | Forest and domain level Windows2025. |
| Server (DC + CA + AD FS + Ignition) | `DC01`, IPv4 `10.0.0.10` | Second adapter has only a 169.254 link-local address — ignore it. |
| Enterprise CA | `example-CA` (config: `DC01.example.local\example-CA`) | Template used for both server certs: **WebServer**. |
| AD FS service name | `adfs.example.local` (display “Example SSO”) | Must match the certificate subject *and* SAN. Cannot be changed after install without rebuilding the farm. |
| AD FS service account | gMSA `EXAMPLE\adfs-svc$` | SPN `host/adfs.example.local` is registered on it automatically. |
| AD FS database | Windows Internal Database (WID) | Default for a one-node farm. |
| AD FS service certificate | CN=`adfs.example.local`, SAN adfs + `certauth.adfs.example.local`, thumbprint `A1B2C3D4E5F60718293A4B5C6D7E8F9012345678`, expires 2028-10-01 | In `LocalMachine\My`. |
| Ignition | 8.3.9, service `Ignition`, install dir `C:\Program Files\Inductive Automation\Ignition` | Trial mode (2 h timer, resettable) unless licensed. |
| Ignition URL | `https://ignition.example.local:8043` | HTTP `8088` stays closed in the firewall; Gateway Network port `8060`. |
| Ignition certificate | CN=`ignition.example.local`, SAN `dns:ignition.example.local`, expires 2028-10-01 | Created with Ignition’s own `keytool` (key must be exportable to PEM). |
| OIDC client (AD FS side) | Application group “Ignition SCADA”, client id `ignition-perspective`, confidential client with secret | Secret is shown once. Stored in `C:\adfs-setup\ignition-client-secret.txt`. |
| Redirect URI | `https://ignition.example.local:8043/data/federate/callback/oidc` | Must match Ignition’s own value character for character. |
| Ignition identity provider | name `ADFS`, type OpenID Connect 1.0 | Imported from `https://adfs.example.local/adfs/.well-known/openid-configuration`. |
| Ignition project | `SSOTest`, view `Main`, URL `/data/perspective/client/SSOTest` | Requires the **Authenticated** security level. |
| Test user | `ssotest@example.local` (sAMAccountName `ssotest`), in Domain Users | Password stored in `C:\adfs-setup\ssotest-password.txt`. |
| Group Policy | `SSO - AD FS Intranet Zone`, linked at the domain root | Intranet-zone mapping + Edge/Chrome `AuthServerAllowlist`. |
| Windows Admin Center | moved from 443 to `6443` | AD FS needs 443. Backup of the old config: `C:\adfs-setup\appsettings.json.bak`. |
| Working folder | `C:\adfs-setup` | Scripts `step1…step10.ps1` + logs, exported certs, backups. See [Appendix C](appendix/files.md). |
