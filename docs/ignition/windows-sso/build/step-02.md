# Step 2: Certificates

Two server certificates from your CA: one for AD FS, one for Ignition. The two are created differently on purpose.
{ .lead }

!!! note "Why two different methods?"

    The built-in **WebServer** template is *machine-only* and its private key is *not exportable*. That is perfect for AD FS (the key stays in the Windows store). Ignition, however, is a Java application and needs the key as a file — so its key and request are created with Ignition’s own `keytool`, and the CA only signs it.

## 2.1 Let the server request from the WebServer template

The first attempt failed with `CERTSRV_E_TEMPLATE_DENIED` because `Get-Certificate … -CertStoreLocation Cert:\LocalMachine\My` enrolls as the **computer account**, and that account was not allowed to enroll. Grant **Domain Controllers** (the group the DC’s computer account is in) the *Enroll* right. The last line verifies the template is published on the CA.

```powershell title="PS> elevated, Enterprise Admin"
Import-Module ActiveDirectory

$cfg = (Get-ADRootDSE).configurationNamingContext
$dn  = "CN=WebServer,CN=Certificate Templates,CN=Public Key Services,CN=Services,$cfg"

dsacls $dn /G "EXAMPLE\Domain Controllers:CA;Enroll"

certutil -CATemplates | Select-String WebServer
```

!!! warning "Note"

    Granting Enroll on a CA template is a PKI permission change. In this lab “Domain Admins” already had Enroll (it was granted twice by mistake, which is harmless). Remove duplicates in `certtmpl.msc → WebServer → Security` if you want it tidy. Do *not* “fix” the problem by enabling `EDITF_ATTRIBUTESUBJECTALTNAME2` on the CA — that is a well-known privilege-escalation hole.

## 2.2 AD FS certificate (machine store)

AD FS requires the certificate subject **and** a SAN equal to the federation service name. `certauth.adfs…` is only needed for certificate authentication; it is harmless to include.

```powershell title="PS>"
Get-Certificate -Template WebServer `
  -DnsName 'adfs.example.local','certauth.adfs.example.local' `
  -SubjectName 'CN=adfs.example.local' `
  -CertStoreLocation Cert:\LocalMachine\My

Get-ChildItem Cert:\LocalMachine\My | Where Subject -eq 'CN=adfs.example.local' |
  Select Subject,Thumbprint,NotAfter,HasPrivateKey,DnsNameList | fl
```

Write the **thumbprint** down — `Install-AdfsFarm` in Step 3 needs it (here `A1B2C3D4E5F60718293A4B5C6D7E8F9012345678`).

## 2.3 Export the CA certificate (clients and Ignition need it)

```powershell title="PS>"
$ca = Get-ChildItem Cert:\LocalMachine\My | Where Subject -like 'CN=example-CA*' | Select -First 1
Export-Certificate -Cert $ca -FilePath C:\adfs-setup\example-ca.cer -Type CERT
```

!!! tip "Gotcha"

    `certutil -ca.cert file.cer` fails inside PowerShell with “Expected no more than 1 args” because the dot is parsed as a member access. Use `Export-Certificate` as above, or quote it: `certutil '-ca.cert' file.cer`.

## 2.4 Ignition certificate (key made by keytool, signed by the CA)

Do this **after** Ignition is installed (Step 7), because it uses Ignition’s bundled Java `keytool`. It is listed here so all certificate work is in one place.

### a) Create the key pair and CSR with a SAN

The last command must show the SAN in the request.

```powershell title="PS>"
$kt = 'C:\Program Files\Inductive Automation\Ignition\lib\runtime\jre-win\bin\keytool.exe'
$d  = 'C:\adfs-setup\ign'
New-Item -ItemType Directory -Force $d | Out-Null

$pw = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 24 | % {[char]$_})
Set-Content "$d\keystore-password.txt" $pw -Encoding ASCII
icacls "$d\keystore-password.txt" /inheritance:r /grant:r "Administrators:F" "SYSTEM:F" | Out-Null

& $kt -genkeypair -alias ignition -keyalg RSA -keysize 2048 -sigalg SHA256withRSA -validity 730 `
  -dname "CN=ignition.example.local, O=Example, OU=IT, C=US" `
  -ext "SAN=dns:ignition.example.local" -ext "EKU=serverAuth" `
  -keystore "$d\ignition.p12" -storetype PKCS12 -storepass $pw -keypass $pw

& $kt -certreq -alias ignition -keystore "$d\ignition.p12" -storetype PKCS12 -storepass $pw `
  -ext "SAN=dns:ignition.example.local" -file "$d\ignition.csr"

certutil -dump "$d\ignition.csr" | Select-String 'DNS Name'
```

!!! warning "Why not Ignition’s own “Create CSR” wizard?"

    It produced a request with an *empty* Subject Alternative Name. The CA signed it, but Edge/Chrome reject a certificate with no SAN (`ERR_CERT_COMMON_NAME_INVALID`). Always check the CSR with `certutil -dump` before submitting.

### b) Submit it to the CA as the computer account

The template is machine-only, so a request submitted as *you* fails with “This type of certificate can be issued only to a computer”. A one-shot scheduled task running as `SYSTEM` submits as the computer account:

```powershell title="PS>"
$cmd = 'certreq -submit -f -q -config "DC01.example.local\example-CA" ' +
       '-attrib "CertificateTemplate:WebServer" C:\adfs-setup\ign\ignition.csr C:\adfs-setup\ign\ignition-signed.cer'

$a = New-ScheduledTaskAction -Execute cmd.exe -Argument "/c $cmd"
$p = New-ScheduledTaskPrincipal -UserId SYSTEM -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName TmpCsr -Action $a -Principal $p -Force | Out-Null

Start-ScheduledTask TmpCsr
Start-Sleep 10
Unregister-ScheduledTask TmpCsr -Confirm:$false

certutil -dump C:\adfs-setup\ign\ignition-signed.cer | Select-String 'DNS Name|NotAfter'
```

### c) Put the signed certificate (and CA) into the keystore

The final list should show one `PrivateKeyEntry` and one `trustedCertEntry`.

```powershell title="PS>"
$pw = (Get-Content "$d\keystore-password.txt").Trim()

& $kt -importcert -noprompt -trustcacerts -alias example-ca `
  -file C:\adfs-setup\example-ca.cer `
  -keystore "$d\ignition.p12" -storetype PKCS12 -storepass $pw

& $kt -importcert -noprompt -trustcacerts -alias ignition `
  -file "$d\ignition-signed.cer" `
  -keystore "$d\ignition.p12" -storetype PKCS12 -storepass $pw

& $kt -list -keystore "$d\ignition.p12" -storetype PKCS12 -storepass $pw
```

### d) Convert to the three PEM files Ignition’s SSL wizard wants

Ignition 8.3’s “I have all the items” path wants the key as **PKCS#8 PEM**, plus the server certificate and the CA certificate as PEM. There is no `openssl` on the server, so .NET’s CNG API does the conversion (Windows PowerShell 5.1):

```powershell title="PS>"
Add-Type -AssemblyName System.Security

$flags = [Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable
$col   = New-Object Security.Cryptography.X509Certificates.X509Certificate2Collection
$col.Import("$d\ignition.p12", $pw, $flags)

$cert = $col | Where HasPrivateKey | Select -First 1
$rsa  = [Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
$blob = $rsa.Key.Export([Security.Cryptography.CngKeyBlobFormat]::Pkcs8PrivateBlob)

function ToPem($b,$label){
  "-----BEGIN $label-----`n" +
  [Convert]::ToBase64String($b,'InsertLineBreaks') +
  "`n-----END $label-----`n"
}

$ascii = [Text.Encoding]::ASCII
[IO.File]::WriteAllText("$d\ignition-key.pem",  (ToPem $blob 'PRIVATE KEY'),       $ascii)
[IO.File]::WriteAllText("$d\ignition-cert.pem", (ToPem $cert.RawData 'CERTIFICATE'), $ascii)

$caCert = New-Object Security.Cryptography.X509Certificates.X509Certificate2 'C:\adfs-setup\example-ca.cer'
[IO.File]::WriteAllText("$d\example-ca.pem",  (ToPem $caCert.RawData 'CERTIFICATE'), $ascii)

icacls "$d\ignition-key.pem" /inheritance:r /grant:r "Administrators:F" "SYSTEM:F" | Out-Null
```

!!! danger "Protect the key"

    `ignition-key.pem` and `ignition.p12` are the Gateway’s private key. In this lab the key text was pasted into Ignition via the browser and also appeared in the working notes; treat that key as **exposed** and regenerate it (repeat 2.4) before using this for anything real. Delete the files from `C:\adfs-setup\ign` afterwards — Ignition keeps its own copy.
