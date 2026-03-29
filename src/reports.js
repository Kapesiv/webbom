import nodemailer from "nodemailer";

function renderClientRow(client) {
  return `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${client.businessName}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${client.plan}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${client.billingStatus}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${client.analytics?.pageViews || 0}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${client.analytics?.leads || client.leads?.length || 0}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${client.lastGenerationAt || "Not yet"}</td>
    </tr>
  `;
}

export function createReportService(database) {
  async function sendAgencyReport(agencyId) {
    const snapshot = database.getAgencySnapshot(agencyId);
    const settings = snapshot.reportSettings;

    if (!settings) {
      const message = "Report settings are not configured.";
      database.recordReportRun(agencyId, {
        status: "failed",
        message,
        recipientCount: 0
      });
      return { mode: "demo", sent: false, message };
    }

    if (
      !settings.smtpHost ||
      !settings.smtpPort ||
      !settings.smtpUser ||
      !settings.smtpPass ||
      !settings.fromEmail ||
      !settings.recipients.length
    ) {
      const message = "SMTP settings are incomplete. Fill host, port, auth, fromEmail and recipients.";
      database.recordReportRun(agencyId, {
        status: "failed",
        message,
        recipientCount: 0
      });
      return { mode: "demo", sent: false, message };
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: Number(settings.smtpPort),
      secure: Boolean(settings.smtpSecure),
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass
      }
    });

    const html = `
      <div style="font-family:Arial,sans-serif;color:#1f1a16;">
        <h2>${snapshot.agency.name} agency report</h2>
        <p>Clients: <strong>${snapshot.summary.totalClients}</strong></p>
        <p>Scheduled: <strong>${snapshot.summary.scheduledClients}</strong></p>
        <p>Paid: <strong>${snapshot.summary.paidClients}</strong></p>
        <p>Generated: <strong>${snapshot.summary.generatedClients}</strong></p>
        <p>Leads: <strong>${snapshot.summary.totalLeads}</strong></p>
        <p>Pending jobs: <strong>${snapshot.summary.pendingJobs}</strong></p>
        <table style="border-collapse:collapse;width:100%;margin-top:16px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;">Client</th>
              <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;">Plan</th>
              <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;">Billing</th>
              <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;">Views</th>
              <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;">Leads</th>
              <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;">Last generation</th>
            </tr>
          </thead>
          <tbody>
            ${snapshot.clients.map(renderClientRow).join("")}
          </tbody>
        </table>
      </div>
    `;

    const text = [
      `${snapshot.agency.name} agency report`,
      `Clients: ${snapshot.summary.totalClients}`,
      `Scheduled: ${snapshot.summary.scheduledClients}`,
      `Paid: ${snapshot.summary.paidClients}`,
      `Generated: ${snapshot.summary.generatedClients}`,
      `Leads: ${snapshot.summary.totalLeads}`,
      `Pending jobs: ${snapshot.summary.pendingJobs}`,
      "",
      ...snapshot.clients.map(
        (client) =>
          `${client.businessName} | ${client.plan} | ${client.billingStatus} | views=${client.analytics?.pageViews || 0} | leads=${client.leads?.length || 0}`
      )
    ].join("\n");

    await transporter.sendMail({
      from: settings.fromEmail,
      to: settings.recipients.join(", "),
      subject: `${snapshot.agency.name} agency report`,
      text,
      html
    });

    database.recordReportRun(agencyId, {
      status: "success",
      message: "Agency report sent.",
      recipientCount: settings.recipients.length
    });

    return {
      mode: "live",
      sent: true,
      recipientCount: settings.recipients.length
    };
  }

  return {
    sendAgencyReport
  };
}
