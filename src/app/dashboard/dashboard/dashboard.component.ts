import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../auth/auth.service';
import { finalize, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  // Fingerprint properties
  showFingerprintOption = false;
  hasExistingFingerprint = false;
  
  // Security Key properties
  showSecurityKeyOption = false;
  hasExistingSecurityKey = false;
  selectedKeyType: string = 'usb'; // 'usb' or 'nfc'
  showSecurityKeySection = false;
  
  // Common properties
  isLoading = false;
  userId: string = '';
  checkingStatus = true;

  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = localStorage.getItem('userId') || '';
    console.log('=== Dashboard Init ===');
    console.log('UserId from localStorage:', this.userId);
    
    // Check if token exists
    const token = localStorage.getItem('token');
    if (!token) {
      this.toastr.error('Please login again');
      this.router.navigate(['/login']);
      return;
    }
    
    if (this.userId) {
      this.checkUserCredentials();
    } else {
      console.log('No userId found, cannot check credentials');
      this.checkingStatus = false;
      this.showFingerprintOption = false;
      this.showSecurityKeyOption = false;
    }
  }

  checkUserCredentials() {
    console.log('Calling getUserCredentials for userId:', this.userId);
    
    this.authService.getUserCredentials(this.userId).subscribe({
      next: (res: any) => {
        console.log('Full response:', res);
        
        // Check for fingerprint credentials
        const fingerprints = res.credentials?.filter((c: any) => 
          c.deviceType === 'FINGERPRINT'
        ) || [];
        
        // Check for security key credentials
        const securityKeys = res.credentials?.filter((c: any) => 
          c.deviceType === 'USB_KEY' || c.deviceType === 'NFC_KEY'
        ) || [];
        
        const fingerprintCount = fingerprints.length;
        const securityKeyCount = securityKeys.length;
        
        console.log('Fingerprint count:', fingerprintCount);
        console.log('Security key count:', securityKeyCount);
        
        this.hasExistingFingerprint = fingerprintCount > 0;
        this.showFingerprintOption = !this.hasExistingFingerprint;
        
        this.hasExistingSecurityKey = securityKeyCount > 0;
        this.showSecurityKeyOption = !this.hasExistingSecurityKey;
        this.showSecurityKeySection = true;
        
        this.checkingStatus = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error checking credentials:', err);
        if (err.status === 401) {
          this.toastr.error('Session expired. Please login again.');
          this.logout();
        } else {
          this.showFingerprintOption = true;
          this.showSecurityKeyOption = true;
        }
        this.checkingStatus = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== FINGERPRINT METHODS ====================

  async registerFingerprint() {
    console.log('Register fingerprint called');
    
    const token = localStorage.getItem('token');
    if (!token) {
      this.toastr.error('Please login again to register fingerprint');
      this.logout();
      return;
    }
    
    if (!this.userId) {
      this.toastr.error('User ID not found. Please login again.');
      return;
    }

    if (!this.isFingerprintSupported()) {
      this.toastr.warning('Fingerprint not supported in this browser');
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      console.log('Step 1: Getting registration options for userId:', this.userId);
      
      const options = await firstValueFrom(
        this.authService.beginFingerprintRegistration(this.userId)
      );
      
      console.log('Registration options received:', options);
      
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: this.base64ToArrayBuffer(options.challenge),
          rp: options.rp,
          user: {
            id: this.base64ToArrayBuffer(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout,
          attestation: options.attestation
        }
      }) as PublicKeyCredential;
      
      const response = credential.response as AuthenticatorAttestationResponse;
      
      console.log('Step 3: Completing registration with auth token');
      
      const result = await firstValueFrom(
        this.authService.completeFingerprintRegistration({
          challengeId: options.challengeId,
          credentialId: this.arrayBufferToBase64(credential.rawId),
          clientDataJSON: this.arrayBufferToBase64(response.clientDataJSON),
          attestationObject: this.arrayBufferToBase64(response.attestationObject),
          label: 'My Fingerprint',
          userId: this.userId
        })
      );
      
      console.log('Registration result:', result);
      
      if (result.success) {
        this.toastr.success('Fingerprint registered! Next time you can login with just your fingerprint.');
        this.showFingerprintOption = false;
        this.hasExistingFingerprint = true;
        this.cdr.detectChanges();
      }
      
    } catch (error: any) {
      console.error('Fingerprint registration failed:', error);
      if (error.status === 401) {
        this.toastr.error('Session expired. Please login again.');
        this.logout();
      } else if (error.name === 'NotAllowedError') {
        this.toastr.warning('Fingerprint registration cancelled');
      } else if (error.name === 'InvalidStateError') {
        this.toastr.warning('Fingerprint already registered on this device');
      } else {
        this.toastr.error(error?.error?.message || 'Fingerprint registration failed');
      }
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ==================== USB SECURITY KEY METHODS ====================

  async registerUSBKey() {
    console.log('Register USB key called');
    
    const token = localStorage.getItem('token');
    if (!token) {
      this.toastr.error('Please login again to register security key');
      this.logout();
      return;
    }
    
    if (!this.userId) {
      this.toastr.error('User ID not found. Please login again.');
      return;
    }

    if (!this.isSecurityKeySupported()) {
      this.toastr.warning('Security key not supported in this browser. Please use Chrome, Edge, or Firefox.');
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      console.log('Step 1: Getting USB key registration options for userId:', this.userId);
      
      // Step 1: Get registration options
      const options = await firstValueFrom(
        this.authService.beginSecurityKeyRegistration(this.userId, 'usb')
      );
      
      console.log('Registration options received:', options);
      
      // Step 2: Browser shows prompt to insert USB key
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: this.base64ToArrayBuffer(options.challenge),
          rp: options.rp,
          user: {
            id: this.base64ToArrayBuffer(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout,
          attestation: options.attestation
        }
      }) as PublicKeyCredential;
      
      const response = credential.response as AuthenticatorAttestationResponse;
      
      console.log('Step 3: Completing USB key registration with auth token');
      
      // Step 3: Complete registration
      const result = await firstValueFrom(
        this.authService.completeSecurityKeyRegistration({
          challengeId: options.challengeId,
          credentialId: this.arrayBufferToBase64(credential.rawId),
          clientDataJSON: this.arrayBufferToBase64(response.clientDataJSON),
          attestationObject: this.arrayBufferToBase64(response.attestationObject),
          type: 'usb',
          label: 'USB Security Key (YubiKey)'
        })
      );
      
      console.log('Registration result:', result);
      
      if (result.success) {
        this.toastr.success('USB security key registered! Next time just insert and touch to login.');
        this.showSecurityKeyOption = false;
        this.hasExistingSecurityKey = true;
        this.cdr.detectChanges();
      }
      
    } catch (error: any) {
      console.error('USB key registration failed:', error);
      if (error.status === 401) {
        this.toastr.error('Session expired. Please login again.');
        this.logout();
      } else if (error.name === 'NotAllowedError') {
        this.toastr.warning('USB key registration cancelled');
      } else if (error.name === 'InvalidStateError') {
        this.toastr.warning('This USB key is already registered');
      } else if (error.message?.includes('not found')) {
        this.toastr.warning('No USB key detected. Please insert your security key and try again.');
      } else {
        this.toastr.error(error?.error?.message || 'USB key registration failed');
      }
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async registerNFCKey() {
    console.log('Register NFC key called');
    
    const token = localStorage.getItem('token');
    if (!token) {
      this.toastr.error('Please login again to register NFC key');
      this.logout();
      return;
    }
    
    if (!this.userId) {
      this.toastr.error('User ID not found. Please login again.');
      return;
    }

    if (!this.isSecurityKeySupported()) {
      this.toastr.warning('NFC key not supported in this browser');
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      console.log('Step 1: Getting NFC key registration options for userId:', this.userId);
      
      const options = await firstValueFrom(
        this.authService.beginSecurityKeyRegistration(this.userId, 'nfc')
      );
      
      console.log('Registration options received:', options);
      
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: this.base64ToArrayBuffer(options.challenge),
          rp: options.rp,
          user: {
            id: this.base64ToArrayBuffer(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout,
          attestation: options.attestation
        }
      }) as PublicKeyCredential;
      
      const response = credential.response as AuthenticatorAttestationResponse;
      
      const result = await firstValueFrom(
        this.authService.completeSecurityKeyRegistration({
          challengeId: options.challengeId,
          credentialId: this.arrayBufferToBase64(credential.rawId),
          clientDataJSON: this.arrayBufferToBase64(response.clientDataJSON),
          attestationObject: this.arrayBufferToBase64(response.attestationObject),
          type: 'nfc',
          label: 'NFC Security Key'
        })
      );
      
      if (result.success) {
        this.toastr.success('NFC security key registered! Next time just tap to login.');
        this.showSecurityKeyOption = false;
        this.hasExistingSecurityKey = true;
        this.cdr.detectChanges();
      }
      
    } catch (error: any) {
      console.error('NFC key registration failed:', error);
      this.toastr.error(error?.error?.message || 'NFC key registration failed');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ==================== HELPER METHODS ====================

  isFingerprintSupported(): boolean {
    const supported = window.isSecureContext &&
      'PublicKeyCredential' in window &&
      'credentials' in navigator;
    
    console.log('Fingerprint support check:', supported);
    return supported;
  }

  isSecurityKeySupported(): boolean {
    const supported = window.isSecureContext &&
      'PublicKeyCredential' in window &&
      'credentials' in navigator;
    
    console.log('Security key support check:', supported);
    return supported;
  }

  base64ToArrayBuffer(base64: string): ArrayBuffer {
    try {
      const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (e) {
      console.error('Base64 decode error:', e);
      return new ArrayBuffer(0);
    }
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

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    this.toastr.success('Logged out successfully');
    this.router.navigate(['/login']);
  }
}