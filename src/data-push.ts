import { Capacitor } from '@capacitor/core';
import type { PlatformData, PushTokenRecord } from './types';

export function upsertPushToken(data: PlatformData, userId: string, token: string): PlatformData {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return data;
  }

  const nextRecord: PushTokenRecord = {
    token: trimmedToken,
    platform: Capacitor.getPlatform(),
    updatedAt: new Date().toISOString()
  };
  const currentTokens = data.pushTokens[userId] ?? [];
  const nextTokens = [nextRecord, ...currentTokens.filter((record) => record.token !== trimmedToken)].slice(0, 5);

  return {
    ...data,
    pushTokens: {
      ...data.pushTokens,
      [userId]: nextTokens
    }
  };
}
