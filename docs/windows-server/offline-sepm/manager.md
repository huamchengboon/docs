# Install and configure the manager

This procedure describes the choices made in the lab. Check [Broadcom's release and system requirements](https://knowledge.broadcom.com/external/article/154575/release-versions-notes-new-fixes-and-sys.html) for your exact manager build, operating system, database, storage and license before building another system.

## Before installation

1. Obtain the appropriate manager installation package and client package through an authorized Broadcom account or your organization's approved repository. Keep its license entitlement information with your internal records.
2. On the isolated server, verify the chosen installation drive has sufficient space for the manager, database and future content. The lab used a separate 100 GB data volume. Leave space on the system drive for prerequisites and operations too; this is a lab observation, not a sizing recommendation.
3. Confirm name resolution between the server and client, record the server's fixed address, and verify the isolation controls and any firewall rules. Plan a backup or VM checkpoint and recovery procedure before changing an existing WSUS server.
4. Verify the installer's publisher signature and compare its hash with a trusted Broadcom value when available. In the lab, both the manager `Setup.exe` and MSI showed a valid Symantec signature. That did not verify every file in the archive.

!!! warning "Sharing the WSUS server"

    Co-hosting was a lab choice, not a general production recommendation. SEPM, its SQL database, WSUS and Windows all need CPU, memory and disk resources. Broadcom [recommends a server without a critical role](https://knowledge.broadcom.com/external/article/177535/best-practices-for-symantec-endpoint-pro.html). Check supportability, sizing, port use and recovery together before combining roles in production.

## Install and run the configuration wizard

1. Extract the authorized manager package and run its `Setup.exe` as an administrator. Choose the intended installation location. In this lab, the application was installed to a custom directory on the data volume.

    <figure markdown="span">
      ![Older SEPM installer showing the destination folder selection](https://higherlogicdownload.s3.amazonaws.com/BROADCOM/SymantecInlineImages/article-3671461-files_Screenshot_4.png){ loading=lazy }
      <figcaption>Example destination-folder screen from an older SEPM 14 MP1 installation. Your screen and default path may differ. Source: <a href="https://community.broadcom.com/symantecenterprise/viewdocument/how-to-install-sepm-14-mp1-with-emb?CommunityKey=1ecf5f55-9545-44d6-b0f4-4e4a7f5f5e68&amp;tab=librarydocuments">Broadcom community walkthrough by IN007</a>.</figcaption>
    </figure>
2. When the **Management Server Configuration Wizard** opens, select **Default configuration for new installation (fewer than 500 clients)**. The lab wizard installed a separate SQL Server Express instance automatically.

    <figure markdown="span">
      ![Older SEPM wizard showing configuration type choices](https://higherlogicdownload.s3.amazonaws.com/BROADCOM/SymantecInlineImages/article-3671461-files_Screenshot_9.png){ loading=lazy }
      <figcaption>Example configuration-type screen from SEPM 14 MP1. Source: <a href="https://community.broadcom.com/symantecenterprise/viewdocument/how-to-install-sepm-14-mp1-with-emb?CommunityKey=1ecf5f55-9545-44d6-b0f4-4e4a7f5f5e68&amp;tab=librarydocuments">Broadcom community walkthrough by IN007</a>.</figcaption>
    </figure>

    The source example uses the older embedded database; the 14.4 lab used SQL Server Express. Follow the instructions for your own version rather than the older database choices.
3. Create the manager administrator account. Supply a strong password and store it in your approved password manager. The wizard notes that this initial password is also used for the database; changing the administrator password later does not automatically change the database password.
4. Enter an email address. The lab used a non-deliverable placeholder and left the mail server unconfigured; password reset emails and notifications therefore cannot be delivered. Configure a reachable internal mail service if those capabilities are required.
5. Set and securely record the **default client password**. It controls protected actions such as uninstalling or stopping the client. Do not place it in an exported guide.
6. Leave partner information blank if it does not apply. The lab disabled optional server data collection because the network is isolated.
7. Continue and let the wizard install SQL Server Express and initialize the database. Select **Finish** once it reports **Configuration completed**.
8. Open the management console and sign in as the manager administrator. In this lab the web console opened on HTTPS port **8446**. Record your own address and certificate details privately.

    <figure markdown="span">
      ![SEPM web console displaying Clients and Default Group](img/client-updated.png){ loading=lazy }
      <figcaption>The configured manager console in the lab. The client shown here was added and updated in the later steps.</figcaption>
    </figure>

    The original lab installation wizard was not captured; the external examples above are from an older release and show similar screens. They load from the source site and require internet access.

!!! tip "Check before proceeding"

    Confirm that the manager and its SQL Express service are running, the console opens, and WSUS still starts. The manager installation alone does not install the SEP protection client on the server.

## Record internally

Keep the manager build, license expiry, server name and address, installation and database paths, management ports, administrator recovery method, service account details and backup location in a protected operations record. Do not reuse the lab's placeholder email or test passwords in production.
