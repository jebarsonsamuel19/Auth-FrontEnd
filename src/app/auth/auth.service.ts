import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = 'http://localhost:8080/api/auth';

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {}

  // Helper methods for headers
  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })
    };
  }

  private getFormHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // ==================== AUTHENTICATION ====================
  signup(data: any): Observable<any> {
    return this.http.post(`${this.api}/register`, {
      username: data.username,
      email: data.email,
      phoneNumber: data.phoneNumber,
      password: data.password,
      fullName: data.fullName
    });
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.api}/login`, data).pipe(timeout(5000));
  }

  sendOtp(data: any): Observable<any> {
    return this.http.post(`${this.api}/send-otp`, data);
  }

  verifyOtp(data: any): Observable<any> {
    return this.http.post(`${this.api}/verify-otp`, data);
  }

  logout() {
    this.tokenService.removeToken();
  }

  // ==================== PASSWORD RESET ====================
  forgotPassword(data: any): Observable<any> {
    return this.http.post(`${this.api}/forgot-password`, data);
  }

  resetPassword(data: {
    userId: string;
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
    temporaryPassword: string;
  }): Observable<any> {
    return this.http.post(`${this.api}/reset-password`, data);
  }

  // ==================== FINGERPRINT - Username-less Login ====================
  
  /**
   * Check if fingerprint login is available (any user has registered)
   * GET /fingerprint/available
   */
  isFingerprintAvailable(): Observable<any> {
    return this.http.get(`${this.api}/fingerprint/available`);
  }

  /**
   * Begin username-less fingerprint login (no username required)
   * POST /fingerprint/login/begin
   */
  beginFingerprintLogin(): Observable<any> {
    return this.http.post(`${this.api}/fingerprint/login/begin`, {});
  }

  /**
   * Complete fingerprint login
   * POST /fingerprint/login/complete
   */
  completeFingerprintLogin(data: {
    challengeId: string;
    credentialId: string;
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
  }): Observable<any> {
    const params = new URLSearchParams();
    params.set('challengeId', data.challengeId);
    params.set('credentialId', data.credentialId);
    params.set('clientDataJSON', data.clientDataJSON);
    params.set('authenticatorData', data.authenticatorData);
    params.set('signature', data.signature);
    
    return this.http.post(`${this.api}/fingerprint/login/complete`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  // ==================== FINGERPRINT - Registration ====================

  /**
   * Begin fingerprint registration (requires user to be logged in)
   * POST /fingerprint/register/begin?userId=xxx
   */
  beginFingerprintRegistration(userId: string): Observable<any> {
    // This endpoint should be public (no auth required for getting options)
    return this.http.post(`${this.api}/fingerprint/register/begin?userId=${userId}`, {});
  }

  /**
   * Complete fingerprint registration - REQUIRES AUTH
   * POST /fingerprint/register/complete
   */
  completeFingerprintRegistration(data: {
    challengeId: string;
    credentialId: string;
    clientDataJSON: string;
    attestationObject: string;
    label?: string;
    userId: string;
  }): Observable<any> {
    const params = new URLSearchParams();
    params.set('challengeId', data.challengeId);
    params.set('credentialId', data.credentialId);
    params.set('clientDataJSON', data.clientDataJSON);
    params.set('attestationObject', data.attestationObject);
    if (data.label) params.set('label', data.label);
    params.set('userId', data.userId);
    
    // ✅ This requires authentication token
    return this.http.post(`${this.api}/fingerprint/register/complete`, params.toString(), this.getFormHeaders());
  }

  // ==================== CREDENTIAL MANAGEMENT ====================

  /**
   * Get all user credentials - REQUIRES AUTH
   * GET /credentials/list?userId=xxx
   */
  getUserCredentials(userId: string): Observable<any> {
    return this.http.get(`${this.api}/credentials/list?userId=${userId}`, this.getAuthHeaders());
  }

  /**
   * Delete a credential - REQUIRES AUTH
   * DELETE /credentials/{credentialId}?userId=xxx
   */
  deleteCredential(userId: string, credentialId: string): Observable<any> {
    return this.http.delete(`${this.api}/credentials/${credentialId}?userId=${userId}`, this.getAuthHeaders());
  }


  // Add to AuthService

// ==================== USB/NFC SECURITY KEY - USERNAME-LESS ====================

/**
 * Check if any security key is registered (for showing login button)
 * GET /security-key/available
 */
isSecurityKeyAvailable(): Observable<any> {
  return this.http.get(`${this.api}/security-key/available`);
}

/**
 * Begin username-less security key login (no username required)
 * POST /security-key/login/begin
 */
beginSecurityKeyUsernameLessLogin(): Observable<any> {
  return this.http.post(`${this.api}/security-key/login/begin`, {});
}

/**
 * Complete username-less security key login
 * POST /security-key/login/complete
 */
completeSecurityKeyUsernameLessLogin(data: {
  challengeId: string;
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
}): Observable<any> {
  const params = new URLSearchParams();
  params.set('challengeId', data.challengeId);
  params.set('credentialId', data.credentialId);
  params.set('clientDataJSON', data.clientDataJSON);
  params.set('authenticatorData', data.authenticatorData);
  params.set('signature', data.signature);
  
  return this.http.post(`${this.api}/security-key/login/complete`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
}

/**
 * Register security key with resident key support (for username-less login)
 * POST /security-key/register/begin?userId=xxx&type=usb
 */
beginSecurityKeyRegistration(userId: string, type: string): Observable<any> {
  return this.http.post(`${this.api}/security-key/register/begin?userId=${userId}&type=${type}`, {});
}

/**
 * Complete security key registration - REQUIRES AUTH
 * POST /security-key/register/complete
 */
completeSecurityKeyRegistration(data: {
  challengeId: string;
  credentialId: string;
  clientDataJSON: string;
  attestationObject: string;
  type: string;
  label?: string;
}): Observable<any> {
  const params = new URLSearchParams();
  params.set('challengeId', data.challengeId);
  params.set('credentialId', data.credentialId);
  params.set('clientDataJSON', data.clientDataJSON);
  params.set('attestationObject', data.attestationObject);
  params.set('type', data.type);
  if (data.label) params.set('label', data.label);
  
  const token = localStorage.getItem('token');
  return this.http.post(`${this.api}/security-key/register/complete`, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${token}`
    }
  });
}
}