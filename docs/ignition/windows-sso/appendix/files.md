# Files and paths

| Path | What it is |
| --- | --- |
| `C:\adfs-setup\step1…step10.ps1 / .log` | The scripts that were run during the build and their transcripts — they include **failed first attempts** (e.g. step 3, 5, 9, 10), so use the commands in this guide, not the scripts, to rebuild. Transcripts (step 1 DNS/KDS/gMSA/cert/role; 2 template permission/WAC; 4 DC enroll; 5–6 farm; 7 app registration; 8 WSL attempt; 9 Ignition certificate; 10 installer). |
| `C:\adfs-setup\example-ca.cer` | The CA certificate (public). Import on clients / Ignition. |
| `C:\adfs-setup\ignition-client-secret.txt` | OIDC client secret (sensitive). |
| `C:\adfs-setup\ssotest-password.txt` | Test user password (sensitive). |
| `C:\adfs-setup\ign\` | Ignition certificate work: `ignition.p12`, `keystore-password.txt`, `ignition-key.pem`, `ignition-cert.pem`, `example-ca.pem`, CSR and signed cert (key material — sensitive). |
| `C:\adfs-setup\appsettings.json.bak`, `cacerts.bak`, `view.json.bak*` | Backups taken before editing WAC settings, the Java trust store and the view. |
| `C:\Program Files\Inductive Automation\Ignition\` | Install dir. `data\gateway.xml` (ports), `data\projects\SSOTest\…` (project), `data\config\resources\core\ignition\identity-provider\…` (IdP config), `logs\wrapper.log`, `lib\runtime\jre-win\…` (bundled Java + `keytool`, `lib\security\cacerts`). |
| `C:\Program Files\WindowsAdminCenter\Service\appsettings.json` | WAC port settings (now 6443). |
| `%USERPROFILE%\.ignition\` | Designer Launcher cache and settings, downloaded Designer modules (including `cache\resources\jxbrowser`), `clientlauncher-data\designer-launcher.json`. |
| GPO `SSO - AD FS Intranet Zone` | Group Policy Management → domain root link. |
| Scheduled task `TmpCsr` | Created and removed during certificate signing; should not exist afterwards. |

!!! note "Not part of the final solution"

    An earlier attempt to run Ignition in Docker (WSL2) failed because the Hyper-V VM had no nested virtualization (`HCS_E_HYPERV_NOT_INSTALLED`) — Ignition was installed natively instead. Ubuntu was downloaded into WSL but no distribution is registered. The earlier Gateway `ignition.example.com` was a different, remote server and is unrelated to this build.
