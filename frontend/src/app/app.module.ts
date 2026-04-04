import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Features
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { WorkspaceComponent } from './features/workspace/workspace.component';
import { ChatPanelComponent } from './features/workspace/chat-panel/chat-panel.component';
import { CanvasViewerComponent } from './features/workspace/canvas-viewer/canvas-viewer.component';

// Shared components
import { ScreenCardComponent } from './shared/components/screen-card/screen-card.component';
import { LoadingIndicatorComponent } from './shared/components/loading-indicator/loading-indicator.component';
import { IframePreviewComponent } from './shared/components/iframe-preview/iframe-preview.component';

// Interceptors & Guards
import { ErrorInterceptor } from './core/interceptors/error.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    OnboardingComponent,
    WorkspaceComponent,
    ChatPanelComponent,
    CanvasViewerComponent,
    ScreenCardComponent,
    LoadingIndicatorComponent,
    IframePreviewComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
