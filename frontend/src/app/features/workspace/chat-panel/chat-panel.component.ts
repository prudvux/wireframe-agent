import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { ScreenSelectionService } from '../../../core/services/screen-selection.service';
import { Screen } from '../../../shared/models/screen.model';
import { ChatMessage } from '../../../shared/models/chat-message.model';

@Component({
  selector: 'app-chat-panel',
  standalone: false,
  templateUrl: './chat-panel.component.html',
  styleUrls: ['./chat-panel.component.scss'],
})
export class ChatPanelComponent implements OnChanges, AfterViewChecked {
  @Input() messages: ChatMessage[] = [];
  @Input() projectId: string = '';
  @Output() screenGenerated = new EventEmitter<{ screen: Screen; message: ChatMessage }>();
  @Output() messageAdded = new EventEmitter<ChatMessage>();
  @Output() screensAdded = new EventEmitter<Screen[]>();

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;
  @ViewChild('promptInput') promptInput!: ElementRef;

  prompt: string = '';
  generating: boolean = false;
  errorMessage: string = '';
  selectedScreen: Screen | null = null;
  mode: 'design' | 'edit' = 'design';
  deviceType: string = 'DESKTOP';

  private shouldScrollToBottom = false;

  constructor(
    private api: ApiService,
    private screenSelection: ScreenSelectionService
  ) {
    this.screenSelection.selection$.subscribe(screen => {
      this.selectedScreen = screen;
      if (!screen) {
        this.mode = 'design';
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) {
      this.shouldScrollToBottom = true;
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  }

  setMode(mode: 'design' | 'edit'): void {
    this.mode = mode;
  }

  onPromptKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.submit();
    }
  }

  submit(): void {
    const text = this.prompt.trim();
    if (!text || this.generating) return;

    this.errorMessage = '';
    this.generating = true;

    // Add user message immediately
    const userMsg: ChatMessage = { role: 'user', content: text };
    this.messageAdded.emit(userMsg);

    // Add loading system message
    const loadingMsg: ChatMessage = { role: 'system', content: '', loading: true };
    this.messageAdded.emit(loadingMsg);

    this.prompt = '';

    if (this.mode === 'edit' && this.selectedScreen) {
      this.api.editScreen(text, this.selectedScreen.id, this.projectId).subscribe({
        next: res => {
          this.generating = false;
          this.removeLoadingMessage();
          this.screenGenerated.emit({ screen: res.screen, message: res.chat_message });
          this.screenSelection.selectScreen(res.screen);
        },
        error: err => {
          this.generating = false;
          this.removeLoadingMessage();
          this.errorMessage = err.message || 'Failed to edit screen.';
        }
      });
    } else {
      this.api.generateScreen(text, this.projectId, this.deviceType).subscribe({
        next: res => {
          this.generating = false;
          this.removeLoadingMessage();
          this.screenGenerated.emit({ screen: res.screen, message: res.chat_message });
          this.screenSelection.selectScreen(res.screen);
        },
        error: err => {
          this.generating = false;
          this.removeLoadingMessage();
          this.errorMessage = err.message || 'Failed to generate screen.';
        }
      });
    }
  }

  private removeLoadingMessage(): void {
    // The loading message will be replaced by the actual response via parent
    // We emit an event to remove it — parent handles message array
    this.messageAdded.emit({ role: 'system', content: '__remove_loading__' });
  }

  generateVariants(): void {
    if (!this.selectedScreen || !this.prompt.trim()) return;
    this.generating = true;
    this.errorMessage = '';
    const text = this.prompt.trim();
    this.prompt = '';

    const userMsg: ChatMessage = { role: 'user', content: `Generate variants: ${text}` };
    this.messageAdded.emit(userMsg);

    this.api.generateVariants(text, this.selectedScreen.id, this.projectId).subscribe({
      next: res => {
        this.generating = false;
        this.screensAdded.emit(res.screens);
        const sysMsg: ChatMessage = {
          role: 'system',
          content: `Generated ${res.screens.length} variant(s).`,
        };
        this.messageAdded.emit(sysMsg);
      },
      error: err => {
        this.generating = false;
        this.errorMessage = err.message || 'Failed to generate variants.';
      }
    });
  }

  clearError(): void {
    this.errorMessage = '';
  }
}
