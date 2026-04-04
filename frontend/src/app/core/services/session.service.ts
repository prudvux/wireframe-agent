import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SessionState {
  authenticated: boolean;
  defaultProjectId: string | null;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private state$ = new BehaviorSubject<SessionState>({
    authenticated: false,
    defaultProjectId: null,
  });

  get session$(): Observable<SessionState> {
    return this.state$.asObservable();
  }

  get snapshot(): SessionState {
    return this.state$.value;
  }

  setAuthenticated(defaultProjectId: string | null): void {
    this.state$.next({ authenticated: true, defaultProjectId });
  }

  clearSession(): void {
    this.state$.next({ authenticated: false, defaultProjectId: null });
  }

  get defaultProjectId(): string | null {
    return this.state$.value.defaultProjectId;
  }

  get isAuthenticated(): boolean {
    return this.state$.value.authenticated;
  }
}
