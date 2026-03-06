const nodemailer = require('nodemailer');
const pool = require('../config/db');

const milestones = [100, 500, 1000, 5000, 10000];

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const maybeNotifyMilestones = async (linkId) => {
  const countResult = await pool.query(
    'SELECT COUNT(*)::INT AS clicks FROM analytics WHERE link_id = $1',
    [linkId]
  );
  const clickCount = countResult.rows[0]?.clicks || 0;

  const dueMilestones = milestones.filter((m) => clickCount >= m);
  if (dueMilestones.length === 0) return;

  const linkResult = await pool.query(
    `SELECT l.title, l.slug, u.artist_name, COALESCE(u.notification_email, u.email) AS email
     FROM links l
     JOIN users u ON u.id = l.user_id
     WHERE l.id = $1
     LIMIT 1`,
    [linkId]
  );
  if (linkResult.rows.length === 0) return;

  const link = linkResult.rows[0];
  const transport = getTransporter();

  for (const milestone of dueMilestones) {
    const insertResult = await pool.query(
      `INSERT INTO milestone_notifications (link_id, milestone_clicks, email_sent)
       VALUES ($1, $2, false)
       ON CONFLICT (link_id, milestone_clicks) DO NOTHING
       RETURNING id`,
      [linkId, milestone]
    );

    if (insertResult.rows.length === 0) {
      continue;
    }

    if (transport && link.email) {
      try {
        await transport.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: link.email,
          subject: `Milestone reached: ${milestone} clicks`,
          text: `Hi ${link.artist_name}, your smartlink "${link.title}" (${link.slug}) reached ${milestone} clicks.`,
        });

        await pool.query(
          `UPDATE milestone_notifications
           SET email_sent = true
           WHERE link_id = $1 AND milestone_clicks = $2`,
          [linkId, milestone]
        );
      } catch (error) {
        // Keep row with email_sent=false for retry by background jobs later.
      }
    }
  }
};

module.exports = {
  maybeNotifyMilestones,
};
