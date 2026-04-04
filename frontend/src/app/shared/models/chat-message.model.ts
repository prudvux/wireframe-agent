export interface ChatMessage {
  id?: string;
  role: 'user' | 'system';
  content: string;
  screen_id?: string | null;
  screen?: { image_url: string; prompt: string } | null;
  loading?: boolean;
  created_at?: string;
}
