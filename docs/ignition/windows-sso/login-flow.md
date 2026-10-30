# How a login works

Understanding this sequence makes every problem below easy to place.
{ .lead }

1. The user opens `https://ignition.example.local:8043/data/perspective/client/SSOTest`. The project requires the **Authenticated** security level, so Perspective shows *“You must log in to continue”* → **Continue to log in**.
2. Ignition redirects the browser to AD FS: `/adfs/oauth2/authorize/` with `client_id=ignition-perspective`, the redirect URI and scopes `openid profile email allatclaims`.
3. AD FS answers with its **Windows-integrated** endpoint `/adfs/oauth2/authorize/wia`. That only works silently if (a) the browser considers AD FS an **intranet** site, (b) the browser is allowed to use Negotiate/Kerberos to that host, and (c) AD FS accepts that browser’s User-Agent for WIA.
4. The browser requests a Kerberos service ticket for `host/adfs.example.local` (the SPN on the gMSA) using the user’s Windows logon, and presents it. AD FS validates it with AD.
5. AD FS builds the token using the **issuance transform rules** (UPN, e-mail, sAMAccountName as `unique_name`, AD groups as `role`) and sends the browser back to the Ignition redirect URI with an authorization code (form post).
6. Ignition’s Gateway — server to server — calls AD FS’s token endpoint (needs the client secret and must trust the AD FS certificate), validates the signed ID token, and applies **User Attribute Mapping**.
7. The Perspective session now has `session.props.auth.user.userName`, `.email`, `.roles` and the view renders them.

!!! tip "Where each failure shows up"

    Steps 1–2 failing = Ignition/IdP config. Step 3 stuck on a password form = browser/GPO/User-Agent/SPN. Step 6 failing = Ignition cannot reach or trust AD FS (DNS, CA trust, secret). That mapping is how the Troubleshooting section is organised.
