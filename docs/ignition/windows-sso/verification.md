# Verification checklist

Run top-to-bottom after a rebuild, or when something “used to work”.
{ .lead }

- [ ] **DNS** — `Resolve-DnsName adfs.example.local` and `ignition.example.local` return the DC IP from the server and from a client.

- [ ] **CA** — `certutil -CATemplates` lists WebServer; `certutil -ping` works.

- [ ] **AD FS cert** — `Get-AdfsSslCertificate` shows the right thumbprint for `adfs…`, `localhost`, `certauth.adfs…`; subject **and** SAN = the service name.

- [ ] **gMSA** — `Test-ADServiceAccount adfs-svc` is `True`; `setspn -L adfs-svc` shows `host/adfs.example.local`; `setspn -X` shows no duplicate.

- [ ] **AD FS service** — `Get-Service adfssrv` Running; discovery URL returns 200.

- [ ] **WIA** — `(Get-AdfsProperties).WIASupportedUserAgents` contains `Mozilla/5.0`.

- [ ] **OIDC client** — `Get-AdfsServerApplication` redirect URI equals Ignition’s; `Get-AdfsApplicationPermission` lists `openid profile email allatclaims`.

- [ ] **GPO** — linked, enabled; client `edge://policy` shows `AuthServerAllowlist`.

- [ ] **Firewall** — client `Test-NetConnection ignition.example.local -Port 8043` → `TcpTestSucceeded True`.

- [ ] **Ignition HTTPS** — valid chain, TLS 1.3 (Step 7.5); CA imported in `cacerts`.

- [ ] **IdP** — Test Login shows the claims and `userName = unique_name`.

- [ ] **Project** — Identity Provider `ADFS`; Perspective permissions = Authenticated only.

- [ ] **End-to-end** — Edge on a domain PC → “Welcome, &lt;user&gt;” with no prompt.
