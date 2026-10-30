# Step 9: Project, login rule, and the page

A Perspective project that requires login through `ADFS` and shows who signed in.
{ .lead }

## 9.1 Create the project and choose the IdP

1. Gateway page → **Platform → System → Projects → Create Project**. Name `SSOTest` → Create. (The project appears under `data\projects\SSOTest`.)
2. Row ⋮ → **Edit** → *Security Settings → Identity Provider* = `ADFS` → Save. (Also settable in the Designer, below.)

## 9.2 Require login (Designer — see Step 10 first)

In the Designer: **Project → Project Properties**.

- **Project → General → Security Settings:** Identity Provider `ADFS`; tick *Automatically redirect users to the IdP if authentication is required*; User Source `default` (the Designer insists on one — it is only used for Designer/Vision, not for the SSO login).
- **Perspective → Permissions:** in *Security Levels* **untick “Public”** and **tick “Authenticated”**. This is what makes the page ask for a login. Save the project (<kbd>Ctrl</kbd>+<kbd>S</kbd>).

!!! note "Harmless error"

    After *OK* the Designer may pop up *“Can’t get roles from the gateway.”* It tries to read roles from the IdP’s user source, which an external IdP cannot supply. The settings are still written (`com.inductiveautomation.perspective\session-permissions` and `ignition\global-props` change on disk).

## 9.3 The view

Perspective → **Views → Main** (a coordinate container). It contains seven labels bound with expressions to the session’s auth properties:

| Label | Expression / content |
| --- | --- |
| Heading | static text “SIGNED IN WITH WINDOWS SSO (AD FS)” |
| Welcome | `"Welcome, " + {session.props.auth.user.userName}` |
| UsernameRow | `"Username: " + {session.props.auth.user.userName}` |
| EmailRow | `"Email: " + {session.props.auth.user.email}` |
| RolesRow | binding `{session.props.auth.user.roles}` + a **script transform** that joins the group names (see [Appendix B](../appendix/view-script.md)) |
| IdpRow | `"Identity provider: " + {session.props.auth.idp}` |
| AuthRow | `"Authenticated: " + toStr({session.props.auth.authenticated})` |

!!! danger "Container mode matters"

    The root container must be in **fixed** pixel mode. In `percent` mode (the default in a hand-written file) x=30, width=640 are read as *percent*, so everything is drawn far outside the screen: the page text exists in the DOM but the canvas looks blank — in the Designer and in the browser.

**Page configuration:** map `/` to `Main` (Perspective → Page Configuration). The final URL is:

```powershell title="URL"
https://ignition.example.local:8043/data/perspective/client/SSOTest
```

On first visit, Perspective shows *“You must log in to continue — Continue to log in”*. One click sends the browser to AD FS; with a domain browser it returns signed in with no prompt. (That one landing click is Perspective’s own behaviour for a non-interactive redirect.)

!!! tip "Editing without the Designer"

    The project is plain files under `C:\Program Files\Inductive Automation\Ignition\data\projects\SSOTest`. A hand-edited `view.json` is picked up after *Platform → Projects → Scan File System* or a service restart. Rules learned: every `resource.json` needs a `"files": [ … ]` array; script bodies in `view.json` need a leading TAB on every line; close the Designer first or it may overwrite your change.
