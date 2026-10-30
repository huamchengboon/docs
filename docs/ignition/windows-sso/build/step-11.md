# Step 11: Client PC & the real test

The server’s own browser is a useful smoke test, but the proof is a separate domain-joined PC.
{ .lead }

1. Join the PC to `example.local`; its DNS server must be the DC (`10.0.0.10`). Check: `nslookup adfs.example.local` and `ignition.example.local`.
2. Sign in to Windows as a **domain** user (`ssotest`). Run `gpupdate /force` and sign out/in once so the user and computer policy are applied.
3. Make sure the CA is trusted. Domain-joined machines get an Enterprise CA’s root automatically; verify with `certutil -verify -urlfetch` or just open `https://adfs.example.local` — no certificate warning.
4. Open **Edge** → `https://ignition.example.local:8043/data/perspective/client/SSOTest` → click **Continue to log in**.
5. You should land on **Welcome, ssotest** with **no username/password prompt**.

!!! success "Observed result in this lab"

    Edge on the DC (signed in as `EXAMPLE\Administrator`) opened the page and showed **Welcome, Administrator**, *Roles: Domain Admins, Domain Users, Schema Admins, Enterprise Admins, Group Policy Creator Owners*, *Identity provider: ADFS*, *Authenticated: true* — with no prompt. A *separate* domain-joined PC was **not** tested during the build; do that test.

!!! tip "Seeing the Kerberos ticket"

    After a successful sign-in run `klist` on the client: there should be a service ticket for `host/adfs.example.local` (client = the user, server = `adfs-svc$`). If there is none, it fell back to NTLM or a form.
