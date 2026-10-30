# Rollback and safety

- **Test client first.** One client with a checkpoint takes every new month before anyone else. June showed why.
- **Checkpoint before each change.** Take them for both servers before cleanup and for the test client before each update. Delete them once the month is settled, because they grow.
- **Keep approvals narrow.** Approve one update at a time. Unapproving is harmless: an approval is one record, and a declined update can be approved again.
- **Never put the online network on the offline side.** Re-run the isolation checklist after any network change.
- **Treat the removable drive as untrusted.** Scan it before it enters the offline network, and verify hashes after the copy.
- **Passwords stay out of scripts.** Keep lab and server credentials in a protected store, not in shared files.
- **The WSUS server is a client too.** Take a checkpoint before patching it. Restoring that checkpoint later also rolls its update database, approvals and content records back to that moment, so keep it only for as long as you need the rollback.
