# Step 8: Ignition identity provider

Make Ignition trust AD FS and turn its claims into Ignition users.
{ .lead }

## 8.1 Create the OpenID Connect provider

Gateway web page → **Platform → Security → Identity Providers → Create Identity Provider**.

1. Type: **OpenID Connect 1.0** → Next. Name: `ADFS`.
2. Under *Import Provider Metadata* choose **From URL** and enter `https://adfs.example.local/adfs/.well-known/openid-configuration` → **Import**. You must see **IMPORT COMPLETE**; it fills the authorization, token, logout, keys and user-info URLs and the issuer.
3. **Client ID**: `ignition-perspective`. **Client Secret → Embedded** → paste the secret from `C:\adfs-setup\ignition-client-secret.txt`.
4. **Scope**: add four values — `openid`, `profile`, `email`, `allatclaims` (click *Add Value*, type, then click the green save icon on that row; Enter alone does not commit it). The authorize URL will show `openid` repeated because Ignition always adds it — harmless.
5. Leave the rest as imported (response mode `form_post`, signing algorithm RS256, “Use JSON Web Key URL” on). **Create Identity Provider**.

!!! tip "Check Ignition’s redirect URI"

    At the top of the form Ignition prints *“The redirect URI for this Ignition Gateway is …/data/federate/callback/oidc”*. It must equal the URI registered in AD FS (Step 4) **exactly**, including `https`, host and port. If you change the Gateway’s public address or port, update AD FS too.

## 8.2 Map claims to users

Identity Providers list → the **⋮ menu on `ADFS` → User Attribute Mapping**. All use Type **direct**, Source **ID Token Claims**:

| Ignition attribute | Path (claim) | Why |
| --- | --- | --- |
| ID | `sub` | Stable unique id. Keep the default. |
| Username | `unique_name` | The default was `sub` — an unreadable string. `unique_name` = sAMAccountName (`ssotest`). |
| Email | `email` | From the AD `mail` attribute. |
| Roles | `role` | One entry per AD group. |

The Designer cannot enumerate roles from an external IdP (see Step 10 notes), so groups are used through these claims, not through an Ignition user source.

## 8.3 Test the provider before building anything on it

⋮ menu → **Test Login**. Ignition redirects to AD FS and, on success, shows **ADFS Test Results** with three tabs: *Idp Response Data* (the raw claims), *Mapped User Attributes* and *Security Level Grants*.

!!! success "Expect"

    in the ID token: `aud: ignition-perspective`, `iss: https://adfs.example.local/adfs`, `upn`, `unique_name`, `email`, `role`. Mapped attributes: `userName = ssotest`, `email = ssotest@example.local`.

!!! note "Test Login runs in your current browser."

    A normal domain Edge signs in silently. The embedded browser panes used by some tools cannot negotiate Windows authentication; they stop on a blank AD FS page (`…/oauth2/authorize/wia`) or show the password form.
