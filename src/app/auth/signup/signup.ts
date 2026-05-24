import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrls: ['./signup.css']
})
export class Signup implements OnInit {

  @Output() signupSuccess = new EventEmitter<void>();
  @Output() switchToLoginEvent = new EventEmitter<void>();

  isLoading = false;
  showSignupPassword = false;
  showConfirmPassword = false;
  signupForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm() {
    this.signupForm = this.fb.group({
      fullName: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      countryCode: ['+91'],
      phoneNumber: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]{10}$/)
        ]
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6)
        ]
      ],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(form: AbstractControl) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  getPasswordStrength(): number {
    const password = this.signupForm.get('password')?.value || '';
    let strength = 0;
    
    if (password.length >= 6) strength += 30;
    if (password.length >= 8) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 15;
    
    return Math.min(strength, 100);
  }

  getStrengthClass(): string {
    const strength = this.getPasswordStrength();
    if (strength < 40) return 'weak';
    if (strength < 70) return 'medium';
    return 'strong';
  }

  getStrengthLabel(): string {
    const strength = this.getPasswordStrength();
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Medium';
    return 'Strong';
  }

  toggleSignupPassword() {
    this.showSignupPassword = !this.showSignupPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  allowOnlyNumbers(event: any) {
    const input = event.target.value;
    event.target.value = input.replace(/[^0-9]/g, '');
    this.signupForm.get('phoneNumber')?.setValue(event.target.value);
  }

  switchToLogin(event: Event) {
    this.router.navigate(['/login']);
    event.preventDefault();
    this.switchToLoginEvent.emit();
  }

  signup() {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const formData = {
      ...this.signupForm.value,
      phoneNumber: this.signupForm.value.countryCode + this.signupForm.value.phoneNumber
    };

    this.authService.signup(formData)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success(
            'Account created successfully! Please login.',
            'Welcome!',
            { timeOut: 5000, progressBar: true }
          );
          this.resetForm();
          this.signupSuccess.emit();
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.toastr.error(
            err?.error?.message || 'Signup failed. Please try again.',
            'Error',
            { timeOut: 5000, progressBar: true }
          );
        }
      });
  }

  resetForm() {
    this.signupForm.reset({
      countryCode: '+91',
      acceptTerms: false
    });
  }
}