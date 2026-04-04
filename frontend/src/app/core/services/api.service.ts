import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Screen } from '../../shared/models/screen.model';
import { Project } from '../../shared/models/project.model';
import { ChatMessage } from '../../shared/models/chat-message.model';

const BASE_URL = 'http://localhost:8003';

export interface StitchValidateResponse {
  valid: boolean;
  projects?: { id: string; title: string }[];
  error?: string;
}

export interface SupabaseValidateResponse {
  valid: boolean;
  tables_provisioned?: boolean;
  error?: string;
}

export interface SessionStatusResponse {
  authenticated: boolean;
  default_project_id?: string;
  resume_step?: number;
}

export interface GenerateResponse {
  screen: Screen;
  chat_message: ChatMessage;
}

export interface ScreensResponse {
  screens: Screen[];
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

export interface VariantsResponse {
  screens: Screen[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Onboarding
  validateStitch(access_token: string, google_cloud_project_id: string): Observable<StitchValidateResponse> {
    return this.http.post<StitchValidateResponse>(`${BASE_URL}/api/onboard/validate-stitch`, {
      access_token,
      google_cloud_project_id,
    }, { withCredentials: true });
  }

  validateSupabase(supabase_url: string, supabase_anon_key: string): Observable<SupabaseValidateResponse> {
    return this.http.post<SupabaseValidateResponse>(`${BASE_URL}/api/onboard/validate-supabase`, {
      supabase_url,
      supabase_anon_key,
    }, { withCredentials: true });
  }

  initializeWorkspace(): Observable<{ project: Project }> {
    return this.http.post<{ project: Project }>(`${BASE_URL}/api/onboard/initialize-workspace`, {}, { withCredentials: true });
  }

  getSessionStatus(): Observable<SessionStatusResponse> {
    return this.http.get<SessionStatusResponse>(`${BASE_URL}/api/onboard/session-status`, { withCredentials: true });
  }

  // Generation
  generateScreen(prompt: string, project_id: string, device_type: string = 'DESKTOP'): Observable<GenerateResponse> {
    return this.http.post<GenerateResponse>(`${BASE_URL}/api/generate`, {
      prompt,
      project_id,
      device_type,
    }, { withCredentials: true });
  }

  editScreen(prompt: string, screen_id: string, project_id: string): Observable<GenerateResponse> {
    return this.http.post<GenerateResponse>(`${BASE_URL}/api/edit`, {
      prompt,
      screen_id,
      project_id,
    }, { withCredentials: true });
  }

  generateVariants(prompt: string, screen_id: string, project_id: string, variant_count: number = 3): Observable<VariantsResponse> {
    return this.http.post<VariantsResponse>(`${BASE_URL}/api/variants`, {
      prompt,
      screen_id,
      project_id,
      variant_count,
    }, { withCredentials: true });
  }

  // Screens & Projects
  getScreens(project_id: string): Observable<ScreensResponse> {
    return this.http.get<ScreensResponse>(`${BASE_URL}/api/screens/${project_id}`, { withCredentials: true });
  }

  getProjects(): Observable<ProjectsResponse> {
    return this.http.get<ProjectsResponse>(`${BASE_URL}/api/projects`, { withCredentials: true });
  }

  getChatHistory(project_id: string): Observable<ChatHistoryResponse> {
    return this.http.get<ChatHistoryResponse>(`${BASE_URL}/api/chat-history/${project_id}`, { withCredentials: true });
  }

  deleteScreen(screen_id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${BASE_URL}/api/screens/${screen_id}`, { withCredentials: true });
  }
}
