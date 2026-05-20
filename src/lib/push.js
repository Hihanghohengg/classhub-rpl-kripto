import { supabase } from './supabase.js';

export async function sendPushNotification({
  title,
  body,
  url = '/',
  type = 'general',
  excludeUserId = null
}) {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: {
      title,
      body,
      url,
      type,
      excludeUserId
    }
  });

  if (error) {
    console.error('Push notification error:', error.message);
    return { success: false, error: error.message };
  }

  return data;
}
