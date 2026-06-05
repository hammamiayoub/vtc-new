export type ExpoPushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function buildMessage(to: string, payload: ExpoPushPayload) {
  return {
    to,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    priority: 'high',
    channelId: 'bookings',
  };
}

/** Envoie une notification Expo Push à un seul appareil. */
export async function sendExpoPush(
  pushToken: string | null | undefined,
  payload: ExpoPushPayload,
): Promise<boolean> {
  if (!pushToken?.trim()) return false;
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildMessage(pushToken.trim(), payload)),
    });
    if (!response.ok) {
      console.error('[push] Expo error', response.status, await response.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('[push] sendExpoPush failed:', e);
    return false;
  }
}

/** Envoie le même message à plusieurs tokens (lots de 100 max). */
export async function sendExpoPushBatch(
  pushTokens: (string | null | undefined)[],
  payload: ExpoPushPayload,
): Promise<number> {
  const tokens = [...new Set(pushTokens.map((t) => t?.trim()).filter(Boolean))] as string[];
  if (!tokens.length) return 0;

  let sent = 0;
  const chunkSize = 100;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const messages = chunk.map((to) => buildMessage(to, payload));
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      if (response.ok) {
        sent += chunk.length;
      } else {
        console.error('[push] Expo batch error', response.status, await response.text());
      }
    } catch (e) {
      console.error('[push] sendExpoPushBatch failed:', e);
    }
  }
  return sent;
}
