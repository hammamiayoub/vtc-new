/**
 * Gabarit commun des e-mails TuniDrive (fond clair, logo, pied de page unique).
 * Ce fichier existe à l'identique dans vtc-new et dans TuniDriveMobile : le modifier aux deux endroits.
 *
 * Règles : HTML « e-mail » (tableaux, styles en ligne, 600 px), toutes les valeurs dynamiques sont échappées,
 * le titre reste lisible quand les images sont bloquées (alt + texte).
 */

export const LOGO_URL = 'https://tunidrive.net/new-logo-Tunidrive.jpg';
export const SITE_URL = 'https://tunidrive.net';
export const SUPPORT_EMAIL = 'support@tunidrive.net';
export const FROM_EMAIL = 'TuniDrive <noreply@tunidrive.net>';

export type Tone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

const TONES: Record<Tone, { bg: string; border: string; title: string }> = {
  neutral: { bg: '#F9FAFB', border: '#E5E7EB', title: '#111827' },
  success: { bg: '#F0FDF4', border: '#BBF7D0', title: '#166534' },
  info: { bg: '#EFF6FF', border: '#BFDBFE', title: '#1E40AF' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', title: '#92400E' },
  danger: { bg: '#FEF2F2', border: '#FECACA', title: '#991B1B' },
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Échappe une valeur dynamique avant insertion dans le HTML. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Paragraphe de texte. `html` doit déjà être sûr (utiliser esc() pour les valeurs dynamiques). */
export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">${html}</p>`;
}

export function greeting(name?: string | null): string {
  const clean = (name ?? '').trim();
  return paragraph(clean ? `Bonjour ${esc(clean)},` : 'Bonjour,');
}

/** Liste à puces. Chaque élément est du HTML déjà sûr. */
export function bulletList(items: string[]): string {
  const lis = items
    .map((item) => `<li style="margin:0 0 6px;font-size:15px;line-height:1.5;color:#374151;">${item}</li>`)
    .join('');
  return `<ul style="margin:0 0 16px;padding-left:20px;">${lis}</ul>`;
}

/** Carte d'information : titre + lignes « libellé : valeur » (valeurs échappées ici). */
export function infoCard(
  title: string,
  rows: Array<{ label: string; value?: string | number | null; href?: string }>,
  tone: Tone = 'neutral',
): string {
  const t = TONES[tone];
  const body = rows
    .filter((r) => r.value !== undefined && r.value !== null && String(r.value).trim() !== '')
    .map((r) => {
      const value = esc(r.value);
      const content = r.href
        ? `<a href="${esc(r.href)}" style="color:#111827;text-decoration:underline;">${value}</a>`
        : value;
      return `<tr>
        <td style="padding:6px 12px 6px 0;font-size:13px;color:#6B7280;vertical-align:top;white-space:nowrap;">${esc(r.label)}</td>
        <td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;line-height:1.4;">${content}</td>
      </tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:${t.bg};border:1px solid ${t.border};border-radius:12px;">
    <tr><td style="padding:16px 18px;">
      <div style="margin:0 0 8px;font-size:14px;font-weight:700;color:${t.title};letter-spacing:0.2px;">${esc(title)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${body}</table>
    </td></tr>
  </table>`;
}

/** Encart de message (information importante, avertissement…). `html` doit déjà être sûr. */
export function notice(html: string, tone: Tone = 'info'): string {
  const t = TONES[tone];
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:${t.bg};border:1px solid ${t.border};border-radius:12px;">
    <tr><td style="padding:14px 18px;font-size:14px;line-height:1.6;color:${t.title};">${html}</td></tr>
  </table>`;
}

/** Bouton d'action (compatible Outlook : bgcolor + lien stylé). */
export function button(label: string, url: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;">
    <tr><td align="center" bgcolor="#111827" style="border-radius:10px;">
      <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;font-family:${FONT};">${esc(label)}</a>
    </td></tr>
  </table>`;
}

export interface EmailLayoutOptions {
  /** Titre principal affiché sous le logo. */
  title: string;
  /** Contenu (HTML déjà sûr, assemblé avec les helpers ci-dessus). */
  body: string;
  /** Texte d'aperçu affiché dans la liste de la boîte de réception. */
  preheader?: string;
  /** Mention de pied de page spécifique (ex. « Vous recevez cet e-mail car… »). */
  footnote?: string;
}

/** Document HTML complet. */
export function renderEmail({ title, body, preheader, footnote }: EmailLayoutOptions): string {
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:${FONT};">
  ${pre}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F5F7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:28px 24px 20px;border-bottom:3px solid #111827;">
            <a href="${SITE_URL}" target="_blank" style="text-decoration:none;">
              <img src="${LOGO_URL}" alt="TuniDrive" width="160" style="display:block;width:160px;max-width:100%;height:auto;border:0;margin:0 auto;font-size:22px;font-weight:800;color:#111827;">
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 12px;">
            <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#111827;font-weight:800;">${esc(title)}</h1>
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 28px;background:#F9FAFB;border-top:1px solid #E5E7EB;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#111827;">TuniDrive · Votre chauffeur privé en Tunisie</p>
            <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#6B7280;">
              Une question ? <a href="mailto:${SUPPORT_EMAIL}" style="color:#111827;">${SUPPORT_EMAIL}</a>
              · <a href="${SITE_URL}" style="color:#111827;">tunidrive.net</a>
            </p>
            <p style="margin:0;font-size:11px;line-height:1.6;color:#9CA3AF;">
              ${footnote ? `${esc(footnote)}<br>` : ''}Cet e-mail est envoyé automatiquement, merci de ne pas y répondre.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
