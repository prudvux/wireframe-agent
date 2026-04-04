export interface Screen {
  id: string;
  stitch_screen_id: string;
  prompt: string;
  html_url: string;
  image_url: string;
  device_type: string;
  parent_screen_id?: string | null;
  created_at: string;
}
