/**
 * FitMe Gmail relay — sends FitMe emails from the Gmail account that owns this script.
 *
 * Why: Render Free blocks outbound SMTP (25/465/587), so the backend posts JSON over HTTPS here instead.
 *
 * Setup (signed in as the FitMe sender Gmail account at https://script.google.com):
 *   1. New project, paste this file.
 *   2. Project Settings → Script properties → add RELAY_SECRET = <long random string>.
 *   3. Deploy → New deployment → Web app; Execute as: Me; Who has access: Anyone → authorize.
 *   4. On Render set MAIL_RELAY_URL = the /exec URL and MAIL_RELAY_SECRET = the same secret.
 * Quota: ~100 recipients/day on a free Gmail account.
 */
function doPost(e) {
  try {
    var secret = PropertiesService.getScriptProperties().getProperty('RELAY_SECRET');
    var body = JSON.parse(e.postData.contents);
    if (!secret || body.secret !== secret) return json({ ok: false, error: 'unauthorized' });
    if (!body.to || !body.subject) return json({ ok: false, error: 'missing to/subject' });
    MailApp.sendEmail({
      to: body.to,
      subject: body.subject,
      body: body.text || '',
      htmlBody: body.html || undefined,
      name: body.fromName || 'FitMe AI'
    });
    return json({ ok: true, remaining: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
