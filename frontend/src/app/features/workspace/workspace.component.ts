import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import { ScreenSelectionService } from '../../core/services/screen-selection.service';
import { Screen } from '../../shared/models/screen.model';
import { ChatMessage } from '../../shared/models/chat-message.model';

@Component({
  selector: 'app-workspace',
  standalone: false,
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss'],
})
export class WorkspaceComponent implements OnInit, OnDestroy {
  screens: Screen[] = [];
  messages: ChatMessage[] = [];
  projectId: string = '';
  loading: boolean = true;
  error: string = '';

  // Expanded preview
  expandedScreen: Screen | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiService,
    private session: SessionService,
    private screenSelection: ScreenSelectionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const pid = this.session.defaultProjectId;
    if (pid) {
      this.projectId = pid;
      this.loadData();
    } else {
      // Session is in-memory only — check backend session cookie
      this.api.getSessionStatus().subscribe({
        next: status => {
          if (status.authenticated && status.default_project_id) {
            this.session.setAuthenticated(status.default_project_id);
            this.projectId = status.default_project_id;
            this.loadData();
          } else {
            this.error = 'No active project found. Please complete onboarding.';
            this.loading = false;
          }
        },
        error: () => {
          this.error = 'No active project found. Please complete onboarding.';
          this.loading = false;
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';

    // Load screens
    this.api.getScreens(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.screens = res.screens;
        this.loading = false;
      },
      error: err => {
        this.error = err.message || 'Failed to load screens.';
        this.loading = false;
      }
    });

    // Load chat history
    this.api.getChatHistory(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.messages = res.messages.map(m => ({
          ...m,
          role: m.role as 'user' | 'system',
        }));
      },
      error: () => { /* non-critical */ }
    });
  }

  onScreenGenerated(payload: { screen: Screen; message: ChatMessage }): void {
    this.screens = [payload.screen, ...this.screens];
    this.messages = [...this.messages, payload.message];
  }

  onMessageAdded(message: ChatMessage): void {
    if (message.content === '__remove_loading__') {
      // Remove the last loading message
      const idx = [...this.messages].reverse().findIndex(m => m.loading);
      if (idx !== -1) {
        const realIdx = this.messages.length - 1 - idx;
        this.messages = this.messages.filter((_, i) => i !== realIdx);
      }
      return;
    }
    this.messages = [...this.messages, message];
  }

  onScreensAdded(newScreens: Screen[]): void {
    this.screens = [...newScreens, ...this.screens];
  }

  onExpandScreen(screen: Screen): void {
    this.expandedScreen = screen;
  }

  closeExpanded(): void {
    this.expandedScreen = null;
  }
}
