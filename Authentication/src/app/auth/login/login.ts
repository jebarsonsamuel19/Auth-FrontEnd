import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  @Output() switchToSignupEvent = new EventEmitter<void>();
  
  isLoading = false;
  currentStep = 1;
  temporaryToken = '';
  showPassword = false;
  isFingerprintSupported = false;
  showUsernameLessFingerprint = false;
  showSecurityKeyButton = false;
  isSecurityKeySupported = false;

  loginForm!: FormGroup;
  mobileForm!: FormGroup;
  otpForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.checkFingerprintSupport();
    this.checkFingerprintAvailability();
    this.checkSecurityKeySupport();
    this.checkSecurityKeyAvailability();
  }

  initializeForms() {
    this.loginForm = this.fb.group({
      identifier: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.mobileForm = this.fb.group({
      mobileNumber: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]]
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  get l() {
    return this.loginForm.controls;
  }

  get m() {
    return this.mobileForm.controls;
  }

  get o() {
    return this.otpForm.controls;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  switchToSignup(event: Event) {
    this.router.navigate(['/signup']);
    event.preventDefault();
    this.switchToSignupEvent.emit();
  }

  forgotPassword(event: Event) {
    event.preventDefault();
    this.toastr.info('Password reset functionality coming soon');
  }

  goBack() {
    if (this.currentStep === 3) {
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      this.currentStep = 1;
    }
    this.cdr.detectChanges();
  }

login() {
  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }

  this.isLoading = true;

  this.authService.login(this.loginForm.value)
    .pipe(
      finalize(() => {
        this.isLoading = false;
      })
    )
    .subscribe({
      next: (res: any) => {

        console.log('NEXT CALLED', res);

        this.temporaryToken = res?.temporaryToken;

        if (this.temporaryToken) {
          this.currentStep = 2;

          setTimeout(() => {
            this.toastr.success('OTP sent successfully');
          });
        }
      },

      error: (err) => {
        console.error(err);

        setTimeout(() => {
          this.toastr.error(err?.error?.message || 'Login failed');
        });
      }
    });
}
  sendOtp() {
    if (this.mobileForm.invalid) {
      this.mobileForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges(); // Force update loading state

    this.authService.sendOtp({
      temporaryToken: this.temporaryToken,
      mobileNumber: this.mobileForm.value.mobileNumber
    })
    .pipe(
      finalize(() => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      })
    )
    .subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.currentStep = 3;
          this.toastr.success('OTP sent successfully!');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.toastr.error(err?.error?.message || 'OTP send failed');
          this.cdr.detectChanges();
        });
      }
    });
  }

  resendOtp(event: Event) {
    event.preventDefault();
    this.sendOtp();
  }

  verifyOtp() {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges(); // Force update loading state

    this.authService.verifyOtp({
      temporaryToken: this.temporaryToken,
      mobileNumber: this.mobileForm.value.mobileNumber,
      otp: this.otpForm.value.otp
    })
    .pipe(
      finalize(() => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      })
    )
    .subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          localStorage.setItem('token', res.accessToken);
          if (res.refreshToken) {
            localStorage.setItem('refreshToken', res.refreshToken);
          }
          if (res.user && res.user.userId) {
            localStorage.setItem('userId', res.user.userId);
          }
          
          this.toastr.success('Login successful!');
          this.cdr.detectChanges();
          
          // Navigate after a small delay to ensure UI updates
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 500);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.toastr.error(err?.error?.message || 'Invalid OTP');
          this.cdr.detectChanges();
        });
      }
    });
  }

  checkFingerprintSupport() {
    this.isFingerprintSupported = window.isSecureContext &&
      'PublicKeyCredential' in window &&
      'credentials' in navigator;
    this.cdr.detectChanges();
  }

  checkFingerprintAvailability() {
    this.authService.isFingerprintAvailable().subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          this.showUsernameLessFingerprint = res.available;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error checking fingerprint availability:', err);
        this.ngZone.run(() => {
          this.showUsernameLessFingerprint = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  checkSecurityKeySupport() {
    this.isSecurityKeySupported = window.isSecureContext &&
      'PublicKeyCredential' in window &&
      'credentials' in navigator;
    this.cdr.detectChanges();
  }

  checkSecurityKeyAvailability() {
    this.authService.isSecurityKeyAvailable().subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          this.showSecurityKeyButton = res.available && this.isSecurityKeySupported;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error checking security key availability:', err);
        this.ngZone.run(() => {
          this.showSecurityKeyButton = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  async loginWithFingerprint() {
    if (!this.isFingerprintSupported) {
      this.toastr.warning('Fingerprint not supported in this browser');
      return;
    }

    if (!this.showUsernameLessFingerprint) {
      this.toastr.warning('Please register fingerprint in settings first');
      return;
    }

    try {
      this.ngZone.run(() => {
        this.isLoading = true;
        this.cdr.detectChanges();
      });

      const options: any = await firstValueFrom(
        this.authService.beginFingerprintLogin()
      );

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: this.base64ToArrayBuffer(options.challenge),
          rpId: options.rpId,
          userVerification: 'required',
          timeout: options.timeout || 60000,
          allowCredentials: []
        }
      }) as PublicKeyCredential;

      const response = credential.response as AuthenticatorAssertionResponse;

      const result: any = await firstValueFrom(
        this.authService.completeFingerprintLogin({
          challengeId: options.challengeId,
          credentialId: this.arrayBufferToBase64(credential.rawId),
          clientDataJSON: this.arrayBufferToBase64(response.clientDataJSON),
          authenticatorData: this.arrayBufferToBase64(response.authenticatorData),
          signature: this.arrayBufferToBase64(response.signature)
        })
      );

      if (result.success) {
        this.ngZone.run(() => {
          localStorage.setItem('token', result.accessToken);
          if (result.refreshToken) {
            localStorage.setItem('refreshToken', result.refreshToken);
          }
          
          this.toastr.success(`Welcome back, ${result.user.username}!`);
          this.cdr.detectChanges();
          
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 500);
        });
      }
      
    } catch (error: any) {
      this.ngZone.run(() => {
        console.error('Fingerprint login failed:', error);
        if (error.name !== 'NotAllowedError') {
          this.toastr.error(error?.message || 'Fingerprint login failed');
        }
        this.cdr.detectChanges();
      });
    } finally {
      this.ngZone.run(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async loginWithSecurityKey() {
    if (!this.isSecurityKeySupported) {
      this.toastr.warning('Security key not supported in this browser');
      return;
    }

    if (!this.showSecurityKeyButton) {
      this.toastr.warning('Please register a security key in settings first');
      return;
    }

    try {
      this.ngZone.run(() => {
        this.isLoading = true;
        this.cdr.detectChanges();
      });

      const options: any = await firstValueFrom(
        this.authService.beginSecurityKeyUsernameLessLogin()
      );

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: this.base64ToArrayBuffer(options.challenge),
          rpId: options.rpId,
          userVerification: 'preferred',
          timeout: options.timeout || 60000,
          allowCredentials: []
        }
      }) as PublicKeyCredential;

      const response = credential.response as AuthenticatorAssertionResponse;

      const result: any = await firstValueFrom(
        this.authService.completeSecurityKeyUsernameLessLogin({
          challengeId: options.challengeId,
          credentialId: this.arrayBufferToBase64(credential.rawId),
          clientDataJSON: this.arrayBufferToBase64(response.clientDataJSON),
          authenticatorData: this.arrayBufferToBase64(response.authenticatorData),
          signature: this.arrayBufferToBase64(response.signature)
        })
      );

      if (result.success) {
        this.ngZone.run(() => {
          localStorage.setItem('token', result.accessToken);
          if (result.refreshToken) {
            localStorage.setItem('refreshToken', result.refreshToken);
          }
          if (result.user && result.user.userId) {
            localStorage.setItem('userId', result.user.userId);
          }
          
          this.toastr.success(`Welcome back, ${result.user.username}!`);
          this.cdr.detectChanges();
          
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 500);
        });
      }
      
    } catch (error: any) {
      this.ngZone.run(() => {
        console.error('Security key login failed:', error);
        if (error.name !== 'NotAllowedError') {
          this.toastr.error(error?.message || 'Security key login failed');
        }
        this.cdr.detectChanges();
      });
    } finally {
      this.ngZone.run(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    }
  }
}