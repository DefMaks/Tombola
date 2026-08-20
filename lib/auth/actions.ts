import { toast } from 'sonner';

/**
 * Standardize DRC phone numbers to strict E.164 format (+243XXXXXXXXX)
 * Example inputs: "0820000000", "820000000", "243820000000", "+243820000000"
 * Output: "+243820000000"
 */
export function formatDRCPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '').trim();

  if (cleaned.startsWith('+243')) {
    return cleaned;
  }
  if (cleaned.startsWith('243')) {
    return '+' + cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '+243' + cleaned.slice(1);
  }
  if (/^[897]/.test(cleaned)) {
    return '+243' + cleaned;
  }
  if (!cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  return cleaned;
}

/**
 * Send SMS OTP using Twilio SMS gateway or simulation fallback
 */
export async function sendPhoneOtp(rawPhone: string) {
  const formattedPhone = formatDRCPhone(rawPhone);
  if (!formattedPhone || formattedPhone.length < 12) {
    throw new Error('Veuillez entrer un numéro RDC valide (ex: 0820000000 ou +243820000000)');
  }

  const response = await fetch('/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone_number: formattedPhone,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Impossible d\'envoyer le code OTP par SMS');
  }

  return {
    success: true,
    phone: formattedPhone,
    otpCode: data.otpCode,
    simulated: !!data.simulated,
    message: data.message || 'Code OTP envoyé par SMS',
  };
}

/**
 * Verify OTP and authenticate / register user with optional password
 */
export async function signInWithPhoneOtp(rawPhone: string, otpCode: string, fullName?: string, password?: string) {
  const formattedPhone = formatDRCPhone(rawPhone);
  const cleanCode = String(otpCode || '').trim();

  if (!cleanCode || cleanCode.length < 4) {
    throw new Error('Veuillez entrer le code de vérification à 6 chiffres');
  }

  const res = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: formattedPhone,
      otpCode: cleanCode,
      fullName: fullName || 'Participant Punchy',
      password: password || undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Code OTP invalide ou expiré');
  }

  // Store authenticated phone in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_phone', formattedPhone);
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
  }

  return {
    success: true,
    phone: formattedPhone,
    user: data.user,
    token: data.token,
  };
}

/**
 * Sign in using phone number + password
 */
export async function signInWithPassword(rawPhone: string, password: string) {
  const formattedPhone = formatDRCPhone(rawPhone);

  if (!formattedPhone || formattedPhone.length < 12) {
    throw new Error('Veuillez entrer un numéro RDC valide (ex: 0820000000)');
  }
  if (!password) {
    throw new Error('Veuillez entrer votre mot de passe');
  }

  const res = await fetch('/api/auth/signin-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: formattedPhone,
      password: password,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Identifiants incorrects');
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('user_phone', formattedPhone);
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
  }

  return {
    success: true,
    phone: formattedPhone,
    user: data.user,
    token: data.token,
  };
}

/**
 * Sign out current user
 */
export function signOut() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user_phone');
    localStorage.removeItem('auth_token');
  }
}

/**
 * Retrieve current user phone from localStorage
 */
export function getCurrentUserPhone(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('user_phone') || '';
}
