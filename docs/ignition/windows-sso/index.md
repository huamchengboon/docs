# Windows Single Sign-On for Ignition Perspective

How a domain user opens an Ignition Perspective page and is signed in automatically — no username or password — using Active Directory, AD FS (OpenID Connect) and Kerberos. Complete build record, replication steps and a troubleshooting guide from the working lab.
{ .lead }

<span class="tag">Windows Server 2025</span> <span class="tag">AD DS · AD CS · DNS · AD FS</span> <span class="tag">Ignition 8.3.9 / Perspective 3.3.9</span> <span class="tag">Built 2 Oct 2026</span> <span class="tag">Status: working ✔</span>

!!! warning "Sanitized public copy"

    Host names, IP addresses, the domain and certificate thumbprints in this copy are **placeholders** (`example.local`, `DC01`, `10.0.0.10`, ...). Replace them with your own values ([Values used in this build](values.md) lists them). Nothing here is a real credential.

## Overview

What was built, and the one design decision everything else follows from.
{ .lead }

!!! warning "Key fact: Ignition cannot do Kerberos / &quot;Windows login&quot; by itself."

    The old “SSO Enabled” option of the Active Directory user source was disabled in Ignition 8.1.17 for a security vulnerability and is deprecated. The supported way to get silent Windows sign-in is to put an **external identity provider (IdP)** in front of Ignition. Here that IdP is **AD FS**, speaking **OpenID Connect**. AD FS is the component that actually performs the Windows (Kerberos) authentication; Ignition only trusts the token AD FS returns.

## What you end up with

- An AD domain controller that also hosts DNS, an Enterprise Certificate Authority and AD FS.
- Two TLS certificates issued by your own CA: one for AD FS, one for Ignition (both with the right Subject Alternative Names).
- An Ignition 8.3 Gateway on HTTPS (port 8043) using that certificate and trusting your CA.
- An OIDC client in AD FS for Ignition, and an `ADFS` identity provider in Ignition mapped to AD attributes.
- A Perspective project that **requires authentication** and shows who is signed in.
- A Group Policy that makes domain browsers send Windows credentials to AD FS automatically.

## Architecture

<div class="diagram" markdown="0">
<svg class="diagram" viewBox="0 0 920 360" role="img" aria-label="Architecture diagram">
    <defs><marker id="ar" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" style="color:var(--accent)"/></marker></defs>
    <rect class="boxB" x="20" y="130" width="190" height="110" rx="12"/>
    <text class="dt" x="115" y="165" text-anchor="middle">Client PC</text>
    <text class="ds" x="115" y="186" text-anchor="middle">domain-joined, Edge/Chrome</text>
    <text class="ds" x="115" y="204" text-anchor="middle">signed in as EXAMPLE\user</text>
    <text class="ds" x="115" y="222" text-anchor="middle">GPO: AD FS = Intranet zone</text>
    <rect class="boxA" x="365" y="20" width="230" height="110" rx="12"/>
    <text class="dt" x="480" y="52" text-anchor="middle">Ignition Gateway 8.3</text>
    <text class="ds" x="480" y="73" text-anchor="middle">https://ignition.example.local:8043</text>
    <text class="ds" x="480" y="91" text-anchor="middle">Perspective project “SSOTest”</text>
    <text class="ds" x="480" y="109" text-anchor="middle">IdP “ADFS” (OIDC client)</text>
    <rect class="boxC" x="365" y="230" width="230" height="110" rx="12"/>
    <text class="dt" x="480" y="262" text-anchor="middle">AD FS (federation service)</text>
    <text class="ds" x="480" y="283" text-anchor="middle">https://adfs.example.local</text>
    <text class="ds" x="480" y="301" text-anchor="middle">gMSA EXAMPLE\adfs-svc$</text>
    <text class="ds" x="480" y="319" text-anchor="middle">Windows Integrated Auth (Kerberos)</text>
    <rect class="box" x="710" y="20" width="190" height="90" rx="12"/>
    <text class="dt" x="805" y="52" text-anchor="middle">DNS server</text>
    <text class="ds" x="805" y="73" text-anchor="middle">adfs / ignition → DC IP</text>
    <text class="ds" x="805" y="91" text-anchor="middle">(AD-integrated zone)</text>
    <rect class="box" x="710" y="140" width="190" height="90" rx="12"/>
    <text class="dt" x="805" y="172" text-anchor="middle">AD CS (example-CA)</text>
    <text class="ds" x="805" y="193" text-anchor="middle">issues both TLS certificates</text>
    <rect class="box" x="710" y="250" width="190" height="90" rx="12"/>
    <text class="dt" x="805" y="282" text-anchor="middle">AD DS / KDC</text>
    <text class="ds" x="805" y="303" text-anchor="middle">users, groups, Kerberos tickets</text>
    <path class="lnA" d="M210 170 C 300 140, 300 80, 365 75" marker-end="url(#ar)"/>
    <text class="ds" x="268" y="104" text-anchor="middle">① open page</text>
    <path class="lnA" d="M365 100 C 300 150, 300 260, 365 280" marker-end="url(#ar)"/>
    <text class="ds" x="296" y="205" text-anchor="middle">② redirect</text>
    <path class="lnA" d="M210 205 C 300 250, 300 290, 365 295" marker-end="url(#ar)"/>
    <text class="ds" x="268" y="276" text-anchor="middle">③ Kerberos ticket</text>
    <path class="ln" d="M595 300 L710 295" marker-end="url(#ar)"/>
    <path class="ln" d="M595 60 L710 60"/>
    <path class="ln" d="M595 270 C 650 230, 650 200, 710 190"/>
    <text class="ds" x="652" y="318" text-anchor="middle">verify ticket,</text><text class="ds" x="652" y="333" text-anchor="middle">read groups</text>
  </svg>
</div>

Everything in this lab (DC, CA, DNS, AD FS, Ignition) runs on **one** server, `DC01`. That is fine for a lab; see [Production notes](production.md) for how to split it.
