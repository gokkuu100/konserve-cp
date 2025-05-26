import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;

const supabaseUrl = extra?.SUPABASE_URL;
const supabaseKey = extra?.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error("supabaseUrl is required.");
}


export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    enabled: false,
  },
});

export function formatTime(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedHours = h % 12 || 12;
  const formattedMinutes = m < 10 ? `0${m}` : m;
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}