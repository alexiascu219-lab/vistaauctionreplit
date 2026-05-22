/**
 * Vista Auction - HR Portal & Application Sync
 * Optimized V2
 */

// CONFIGURATION
// REPLACE 'YOUR_GOOGLE_SHEET_ID' WITH THE ACTUAL ID FROM YOUR BROWSER URL
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID'; // e.g., "1BxiMVs0XRA5nLRd-..."
const SHEET_NAME = 'Applications';

function doPost(e) {
    // 1. Lock Service for Concurrency (Simultaneous submissions)
    var lock = LockService.getScriptLock();
    try {
        // Wait for up to 10 seconds for other processes to finish.
        lock.waitLock(10000);
    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: 'Server busy, please try again.'
        })).setMimeType(ContentService.MimeType.JSON);
    }

    try {
        var data = JSON.parse(e.postData.contents);
        var action = data.action;

        // --- ACTION: SEND EMAIL (Generic) ---
        // Universal email sender for HR Portal & System Notifications
        if (action === 'send_email') {
            MailApp.sendEmail({
                to: data.to,
                subject: data.subject,
                htmlBody: data.htmlBody,
                name: "Vista Auction HR" // Sender Name
            });
            return ContentService.createTextOutput(JSON.stringify({ status: 'success', sent: true }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // --- ACTION: SEND REPLY (HR Portal Legacy) ---
        if (action === 'send_reply') {
            MailApp.sendEmail({
                to: data.to,
                subject: data.subject,
                htmlBody: data.htmlBody
            });
            return ContentService.createTextOutput(JSON.stringify({ status: 'success', sent: true }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // --- ACTION: NEW APPLICATION (Sync from Website) ---
        if (action === 'new_application') {
            var ss = SpreadsheetApp.openById(SHEET_ID);
            var sheet = ss.getSheetByName(SHEET_NAME);

            // Auto-create sheet if missing
            if (!sheet) {
                sheet = ss.insertSheet(SHEET_NAME);
                // Create Headers
                sheet.appendRow([
                    "Timestamp", "Full Name", "Email", "Phone", "Position",
                    "Job Type", "Shift", "Location", "Status",
                    "Work Auth", "Reference", "Experience", "Why Vista?"
                ]);
                sheet.setFrozenRows(1);
            }

            // Prepare Row Data (Robust Mapping)
            var details = data.details || {};

            sheet.appendRow([
                new Date(), // Timestamp
                data.full_name,
                data.email,
                data.phone,
                data.position,
                details.jobType || "",
                details.shift || "",
                details.location || "",
                "New", // Initial Status
                details.workAuth || "",
                data.referring_employee || details.howHeard || "",
                data.previous_experience || "",
                details.interest || ""
            ]);

            return ContentService.createTextOutput(JSON.stringify({ status: 'success', row_added: true }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // --- ACTION: CONTACT FORM (Legacy) ---
        // If no action specified, assume contact form logic
        var recipient = "hr@vistaauction.com";
        var subject = "New Contact Inquiry: " + (data.subject || "No Subject");
        var body = "Name: " + data.name + "\n" +
            "Email: " + data.email + "\n" +
            "Message: \n" + data.message;

        MailApp.sendEmail(recipient, subject, body);

        return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}
