# Step 10: Designer (and the “Perspective is missing” fix)

Install the Designer Launcher and tell it not to break Chromium on an administrator account.
{ .lead }

1. On the Gateway home page (or inductiveautomation.com) get `designerlauncher.exe` (~59 MB, signed by Inductive Automation). Run it **interactively** (the `-q` quiet switch just waited for the GUI). Shortcuts appear on the Public Desktop and Start menu.
2. Launcher → **Add Designer → Manual** → `https://ignition.example.local:8043` → **Add Designer**. A certificate dialog (“Import Untrusted Certificate”) shows `ignition.example.local`, issuer `example-CA`, valid — click **Trust Certificate**.
3. Tile ⋮ → **Manage** → **JVM Arguments** → `-Dignition.chromium.switch.do-not-de-elevate` → OK. (Per gateway entry; default settings do not apply.)
4. Select the tile → **Open Designer** → sign in with the **Gateway admin** → open `SSOTest`.

!!! danger "The problem this solves"

    Perspective’s Designer workspace uses an embedded Chromium (JxBrowser). Chromium 138+ *de-elevates* itself and restarts when started by an administrator; JxBrowser does not support that restart, so Chromium exits with code 0. Symptoms: the Project Browser shows Vision but **no Perspective node**; *Tools → Console* shows `ERROR designer.JxBrowserUtil -- Failed to start Browser Engine` … `ChromiumProcessStartupFailureException: Process exit code: 0` and `Web Browser Component can not start!`. Nothing is logged by Defender or the Windows event log, and clearing `~\.ignition\cache\resources\jxbrowser` does not help. With the JVM flag the console shows `Starting up Perspective module` with no error and the Perspective node appears (Gateway Events, Session Events, Styles, Views).

The trial timer (2 hours, resettable by restarting the Gateway or via the Activate Ignition dialog) applies to the Designer as well.
