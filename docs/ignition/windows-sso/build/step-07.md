# Step 7: Ignition install + HTTPS

Install, commission, enable HTTPS with the certificate from Step 2.4, and make Ignition’s Java trust your CA.
{ .lead }

## 7.1 Install

1. Download **Ignition 8.3 Windows 64-bit** (`ignition-8.3.9-windows-64-installer.exe`, ~2 GB) from inductiveautomation.com → *Download Ignition*. The page asks for registration details, so do this in a browser yourself.
2. Check the signature: `Get-AuthenticodeSignature .\ignition-8.3.9-windows-64-installer.exe` → signer *Inductive Automation, LLC*, status *Valid*.
3. Run the installer **interactively**: Typical install, accept the licence, keep the defaults (service name `Ignition`, HTTP 8088, HTTPS 8043, Gateway Network 8060).

!!! warning "Silent install did nothing"

    `--mode unattended --unattendedmodeui none` returned exit code 0 after ~20 s but installed nothing (no service, no folder). Use the GUI installer.

## 7.2 Commission the Gateway

Open `http://localhost:8088/` on the server. Until commissioning finishes, `/StatusPing` returns `{"state":"RUNNING","details":"COMMISSIONING"}` and HTTPS (8043) is **not** listening. In the wizard accept the licence and **create the Gateway admin user** (choose a strong password yourself — it is the Designer/config login, *not* the SSO user). Answer the Quick Start prompt with “No thanks” for a clean system. The Gateway then starts (`StatusPing` → `RUNNING`).

```powershell title="PS>"
Get-Service Ignition
(Invoke-WebRequest http://localhost:8088/StatusPing -UseBasicParsing).Content
Get-NetTCPConnection -State Listen | Where LocalPort -in 8088,8060,8043     # 8043 only after SSL is set up
```

## 7.3 Turn on HTTPS with your certificate

Log in at `http://localhost:8088/app/…` → **Network → Web Server** (left menu) → **Setup SSL / TLS**. Choose **“Yes — I have all the items above”**, then:

1. **Private key** — click *Manually Enter Data* (or upload) and provide `ignition-key.pem` (PKCS#8, no password). **Next**.
2. **Server certificate** — provide `ignition-cert.pem`. Ignition shows subject `ignition.example.local`, issuer `example-CA` and the dates. **Next**.
3. **CA certificate** — provide `example-ca.pem` (root). **Add SSL / TLS**.
4. Ignition restarts its web server and redirects the browser to `https://localhost:8043/…?ca_signed_success=true`. HTTPS port stays 8043.

!!! warning "Wizard traps"

    - If you first tried the “No → create CSR” path, the wizard remembers that key and shows `Generated with previous CSR` at the key step. The later certificate then fails with *“Unable to find a private key which matches the public key from the server certificate”*. Click **Reset Step** → Confirm, then supply the right key.
    - When text is pasted programmatically the **Next** button can stay disabled until a real key press happens in the box (e.g. type a space and delete it).
    - 8043 will not listen until this wizard completes — a missing 8043 is not a firewall problem.

## 7.4 Make Ignition’s Java trust your CA

The Gateway is a TLS *client* when it fetches AD FS’s discovery document and calls the token endpoint. Java does not use the Windows trust store, so import the CA into the JRE that ships with Ignition and restart:

```powershell title="PS>"
$kt = 'C:\Program Files\Inductive Automation\Ignition\lib\runtime\jre-win\bin\keytool.exe'
$cacerts = 'C:\Program Files\Inductive Automation\Ignition\lib\runtime\jre-win\lib\security\cacerts'
Copy-Item $cacerts C:\adfs-setup\cacerts.bak -Force
& $kt -importcert -noprompt -trustcacerts -alias example-ca -file C:\adfs-setup\example-ca.cer -keystore $cacerts -storepass changeit
Restart-Service Ignition
```

!!! note "Upgrades"

    An Ignition upgrade can replace its bundled JRE and drop this import — redo it after upgrades. The keytool “use -cacerts option” warning is harmless.

## 7.5 Verify HTTPS

```powershell title="PS>"
$tcp = New-Object Net.Sockets.TcpClient('ignition.example.local',8043)
$ssl = New-Object Net.Security.SslStream($tcp.GetStream(),$false)
$ssl.AuthenticateAsClient('ignition.example.local')
"TLS: $($ssl.SslProtocol)"
$c = New-Object Security.Cryptography.X509Certificates.X509Certificate2($ssl.RemoteCertificate)
$c.Subject; $c.Issuer; $c.NotAfter
$chain = New-Object Security.Cryptography.X509Certificates.X509Chain; $chain.ChainPolicy.RevocationMode='NoCheck'
"Chain valid: $($chain.Build($c))"
```

Expected: TLS 1.3, subject `CN=ignition.example.local`, issuer `CN=example-CA`, chain valid `True`.
