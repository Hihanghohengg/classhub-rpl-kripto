import { supabase } from './supabase.js';

export async function sendPushNotification({
  title,
  body,
  url = '/',
  type = 'general',
  targetUserIds = null,
  excludeUserId = null
}) {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        title,
        body,
        url,
        type,
        targetUserIds,
        excludeUserId
      }
    });

    if (error) {
      console.error('Push notification error:', error.message);

      return {
        success: false,
        error: error.message
      };
    }

    console.log('Push notification result:', data);

    return data;
  } catch (error) {
    console.error('Push notification failed:', error);

    return {
      success: false,
      error: error.message || 'Gagal mengirim push notification.'
    };
  }
}
