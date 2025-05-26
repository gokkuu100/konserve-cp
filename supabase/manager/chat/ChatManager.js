import { supabase } from '../../config/supabaseConfig';

class ChatManager {
  constructor() {
    this.messageSubscription = null;
  }

  async fetchMessagesByConstituency(constituency) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          text,
          created_at,
          user_id,
          sender_name,
          avatar_url,
          constituency
        `)
        .eq('constituency', constituency)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return { data: null, error };
    }
  }

  async sendMessage(messageData) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error sending message:', error);
      return { data: null, error };
    }
  }

  startPolling(callback, interval = 3000, constituency) {
    if (this.pollingInterval) {
      this.stopPolling();
    }
    
    this.lastFetchTimestamp = new Date().toISOString();
    
    this.pollingInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id,
            text,
            created_at,
            user_id,
            sender_name,
            avatar_url,
            constituency
          `)
          .eq('constituency', constituency)
          .gt('created_at', this.lastFetchTimestamp)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          this.lastFetchTimestamp = data[data.length - 1].created_at;
          
          data.forEach(newMessage => {
            callback(newMessage);
          });
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, interval);
    
    return () => this.stopPolling();
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  subscribeToMessages(callback, constituency) {
    return this.startPolling(callback, 3000, constituency);
  }

  unsubscribeFromMessages() {
    this.stopPolling();
  }
}

export default new ChatManager(); 