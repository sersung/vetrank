import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'VetRank <noreply@vetrank.com.br>';
const SUPPORT = 'calefi@csvet.com.br';
const SITE_URL = 'https://www.vetrank.com.br';

// ─── Base HTML Template ────────────────────────────────────────────────────
function baseTemplate(content: string, preheader = '') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VetRank</title>
</head>
<body style="margin:0;padding:0;background:#0d1a14;font-family:'Inter',Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1a14;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#0f2318;border-radius:16px 16px 0 0;padding:28px 40px;border-bottom:1px solid #1e3a2a;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:24px;font-weight:700;color:#22c55e;letter-spacing:-0.5px;">⚡ VetRank</span>
                </td>
                <td align="right">
                  <span style="font-size:12px;color:#4ade80;background:#14532d;padding:4px 10px;border-radius:20px;">Medicina Veterinária</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#111f17;padding:40px;border-radius:0 0 16px 16px;">
            ${content}
            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;padding-top:24px;border-top:1px solid #1e3a2a;">
              <tr>
                <td align="center">
                  <p style="color:#4b7a5e;font-size:12px;margin:0 0 8px;">
                    VetRank — Plataforma Gamificada de Estudos para Veterinária
                  </p>
                  <p style="color:#4b7a5e;font-size:12px;margin:0 0 8px;">
                    Suporte: <a href="mailto:${SUPPORT}" style="color:#22c55e;">${SUPPORT}</a>
                  </p>
                  <p style="color:#4b7a5e;font-size:11px;margin:0;">
                    <a href="${SITE_URL}/privacy" style="color:#4b7a5e;">Política de Privacidade</a> · 
                    <a href="${SITE_URL}/terms" style="color:#4b7a5e;">Termos de Uso</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;margin:24px 0;">${text}</a>`;
}

// ─── Email Templates ───────────────────────────────────────────────────────

export function trialExpiringTemplate(name: string, daysLeft: number) {
  const urgency = daysLeft <= 1 ? '🚨 Último dia!' : `⏰ ${daysLeft} dias restantes`;
  const content = `
    <h1 style="color:#f0fdf4;font-size:26px;font-weight:700;margin:0 0 8px;">${urgency}</h1>
    <p style="color:#86efac;font-size:16px;margin:0 0 24px;">Seu trial gratuito do VetRank está prestes a expirar.</p>
    <p style="color:#d1fae5;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Olá, <strong style="color:#4ade80;">${name}</strong>! 👋
    </p>
    <p style="color:#d1fae5;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Seu período de trial gratuito de 30 dias termina em <strong style="color:#fbbf24;">${daysLeft === 1 ? 'hoje' : `${daysLeft} dias`}</strong>. 
      Não perca acesso ao banco completo de <strong>5.661 questões</strong>, simulados ilimitados e ranking.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border-radius:12px;padding:20px;margin:24px 0;">
      <tr>
        <td>
          <p style="color:#4ade80;font-size:14px;font-weight:600;margin:0 0 12px;">✅ O que você perde sem o Premium:</p>
          <p style="color:#d1fae5;font-size:14px;margin:4px 0;">• Banco completo de 5.661 questões ENADE</p>
          <p style="color:#d1fae5;font-size:14px;margin:4px 0;">• Simulados ilimitados com timer</p>
          <p style="color:#d1fae5;font-size:14px;margin:4px 0;">• Ranking semanal, mensal e geral</p>
          <p style="color:#d1fae5;font-size:14px;margin:4px 0;">• Explicações com IA (Gemini)</p>
          <p style="color:#d1fae5;font-size:14px;margin:4px 0;">• Badges e gamificação completa</p>
        </td>
      </tr>
    </table>
    <p style="color:#d1fae5;font-size:15px;margin:0 0 8px;">
      Assine o plano anual por apenas <strong style="color:#4ade80;">R$299/ano</strong> (equivale a R$24,90/mês) e economize 37% em relação ao mensal.
    </p>
    ${btn('Assinar Agora — R$299/ano', `${SITE_URL}/pricing`)}
    <p style="color:#4b7a5e;font-size:13px;margin:8px 0 0;">
      Dúvidas? Responda este email ou entre em contato: <a href="mailto:${SUPPORT}" style="color:#22c55e;">${SUPPORT}</a>
    </p>
  `;
  return baseTemplate(content, `Seu trial VetRank expira em ${daysLeft === 1 ? 'hoje' : `${daysLeft} dias`} — assine para continuar`);
}

export function premiumExpiringTemplate(name: string, daysLeft: number) {
  const content = `
    <h1 style="color:#f0fdf4;font-size:26px;font-weight:700;margin:0 0 8px;">⏰ Renovação em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}</h1>
    <p style="color:#86efac;font-size:16px;margin:0 0 24px;">Sua assinatura Premium VetRank está próxima do vencimento.</p>
    <p style="color:#d1fae5;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Olá, <strong style="color:#4ade80;">${name}</strong>! 👋
    </p>
    <p style="color:#d1fae5;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Sua assinatura Premium vence em <strong style="color:#fbbf24;">${daysLeft === 1 ? 'amanhã' : `${daysLeft} dias`}</strong>. 
      Renove agora para manter acesso ininterrupto a todos os recursos.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2318;border-radius:12px;padding:20px;margin:24px 0;">
      <tr>
        <td>
          <p style="color:#4ade80;font-size:14px;font-weight:600;margin:0 0 8px;">🏆 Seu progresso até agora:</p>
          <p style="color:#d1fae5;font-size:14px;margin:4px 0;">Continue de onde parou — seu XP, badges e histórico são mantidos.</p>
        </td>
      </tr>
    </table>
    ${btn('Renovar Assinatura', `${SITE_URL}/pricing`)}
    <p style="color:#4b7a5e;font-size:13px;margin:8px 0 0;">
      Precisa de ajuda? <a href="mailto:${SUPPORT}" style="color:#22c55e;">${SUPPORT}</a>
    </p>
  `;
  return baseTemplate(content, `Sua assinatura VetRank vence em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`);
}

export function newsletterTemplate(subject: string, body: string) {
  const content = `
    <h1 style="color:#f0fdf4;font-size:26px;font-weight:700;margin:0 0 24px;">${subject}</h1>
    <div style="color:#d1fae5;font-size:15px;line-height:1.8;">
      ${body.split('\n').map(p => p.trim() ? `<p style="margin:0 0 16px;">${p}</p>` : '').join('')}
    </div>
    ${btn('Acessar VetRank', SITE_URL)}
    <p style="color:#4b7a5e;font-size:13px;margin:16px 0 0;">
      Você está recebendo este email por ser usuário do VetRank.<br/>
      Dúvidas: <a href="mailto:${SUPPORT}" style="color:#22c55e;">${SUPPORT}</a>
    </p>
  `;
  return baseTemplate(content, subject);
}

// ─── Send Functions ────────────────────────────────────────────────────────

export async function sendTrialExpiringEmail(to: string, name: string, daysLeft: number) {
  const subject = daysLeft <= 1
    ? '🚨 Último dia do seu trial VetRank — assine agora!'
    : `⏰ Seu trial VetRank expira em ${daysLeft} dias`;
  const html = trialExpiringTemplate(name || 'Veterinário(a)', daysLeft);
  return resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendPremiumExpiringEmail(to: string, name: string, daysLeft: number) {
  const subject = daysLeft <= 1
    ? '⏰ Sua assinatura VetRank vence amanhã — renove agora'
    : `⏰ Sua assinatura VetRank vence em ${daysLeft} dias`;
  const html = premiumExpiringTemplate(name || 'Veterinário(a)', daysLeft);
  return resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendNewsletterEmail(to: string, subject: string, body: string) {
  const html = newsletterTemplate(subject, body);
  return resend.emails.send({ from: FROM, to, subject, html });
}
