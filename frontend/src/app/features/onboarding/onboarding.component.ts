import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-onboarding',
  standalone: false,
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
})
export class OnboardingComponent implements OnInit {
  currentStep: Step = 1;

  // Step 1 — OAuth credentials
  accessToken: string = '';
  googleCloudProjectId: string = '';
  step1Loading: boolean = false;
  step1Error: string = '';
  step1Success: boolean = false;

  // Step 2 — Supabase
  supabaseUrl: string = '';
  supabaseAnonKey: string = '';
  step2Loading: boolean = false;
  step2Error: string = '';
  step2Success: boolean = false;

  // Step 3 — Workspace init
  step3Loading: boolean = false;
  step3Error: string = '';

  constructor(
    private api: ApiService,
    private session: SessionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.api.getSessionStatus().subscribe({
      next: status => {
        if (status.authenticated && status.default_project_id) {
          // Fully done — go straight to workspace
          this.session.setAuthenticated(status.default_project_id);
          this.router.navigate(['/workspace']);
        } else if (status.resume_step === 3) {
          // Steps 1 & 2 done but Step 3 failed — jump to Step 3 and retry
          this.currentStep = 3;
          this.initializeWorkspace();
        }
        // Otherwise stay on Step 1
      },
      error: () => {}
    });
  }

  get step1Valid(): boolean {
    return this.accessToken.trim().length > 0 && this.googleCloudProjectId.trim().length > 0;
  }

  validateStitch(): void {
    if (!this.step1Valid) return;
    this.step1Loading = true;
    this.step1Error = '';
    this.step1Success = false;

    this.api.validateStitch(
      this.accessToken.trim(),
      this.googleCloudProjectId.trim()
    ).subscribe({
      next: res => {
        this.step1Loading = false;
        if (res.valid) {
          this.step1Success = true;
          this.currentStep = 2;
        } else {
          this.step1Error = res.error || 'Validation failed. Please check your credentials.';
        }
      },
      error: err => {
        this.step1Loading = false;
        this.step1Error = err.message || 'An error occurred during validation.';
      }
    });
  }

  validateSupabase(): void {
    if (!this.supabaseUrl.trim() || !this.supabaseAnonKey.trim()) return;
    this.step2Loading = true;
    this.step2Error = '';

    this.api.validateSupabase(this.supabaseUrl.trim(), this.supabaseAnonKey.trim()).subscribe({
      next: res => {
        this.step2Loading = false;
        if (res.valid) {
          this.step2Success = true;
          this.currentStep = 3;
          this.initializeWorkspace();
        } else {
          this.step2Error = res.error || 'Unable to connect to Supabase. Check your credentials.';
        }
      },
      error: err => {
        this.step2Loading = false;
        this.step2Error = err.message || 'An error occurred connecting to Supabase.';
      }
    });
  }

  initializeWorkspace(): void {
    this.step3Loading = true;
    this.step3Error = '';

    this.api.initializeWorkspace().subscribe({
      next: res => {
        this.step3Loading = false;
        this.session.setAuthenticated(res.project?.id ?? null);
        this.router.navigate(['/workspace']);
      },
      error: err => {
        this.step3Loading = false;
        const detail = err?.error?.detail;
        this.step3Error = detail || err.message || 'Failed to initialize workspace. Please try again.';
      }
    });
  }

  goBackToStep(step: Step): void {
    this.currentStep = step;
  }
}
