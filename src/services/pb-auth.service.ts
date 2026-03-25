import type PocketBase from 'pocketbase';

import type {
  AuthResult,
  AuthChangeEvent,
  AuthCollectionName,
  AuthRecord,
  AuthSession,
  EmailChangeConfirmInput,
  OtpRequestInput,
  OtpRequestResult,
  OtpVerifyInput,
  PasswordLoginInput,
  PasswordResetConfirmInput,
  RegisterUserInput,
} from '../types/pb-auth.types';
import { CollectionRecordMap } from '../types/pb-collections.types';

type AuthResponse<TCollection extends AuthCollectionName> = {
  token: string;
  record: AuthRecord<TCollection>;
};

export class PocketBaseAuthService<TCollection extends AuthCollectionName = 'users'> {
  constructor(
    private readonly client: PocketBase,
    private readonly collectionName: TCollection = 'users' as TCollection,
  ) { }

  private collection() {
    return this.client.collection(this.collectionName);
  }

  get session(): AuthSession<TCollection> {
    return {
      token: this.client.authStore.token,
      user: (this.client.authStore.record as AuthRecord<TCollection> | null) ?? null,
      isValid: this.client.authStore.isValid,
    };
  }

  get currentUser(): AuthRecord<TCollection> | null {
    return (this.client.authStore.record as AuthRecord<TCollection> | null) ?? null;
  }

  get token(): string {
    return this.client.authStore.token;
  }

  isAuthenticated(): boolean {
    return this.client.authStore.isValid;
  }

  requireUser(): AuthRecord<TCollection> {
    const user = this.currentUser;

    if (!user) {
      throw new Error('No authenticated user is available in the auth store.');
    }

    return user;
  }

  async login(input: PasswordLoginInput): Promise<AuthSession<TCollection>> {
    await this.collection().authWithPassword<AuthResponse<TCollection>>(
      input.identity,
      input.password,
    );

    return this.session;
  }

  async loginWithPassword(input: PasswordLoginInput): Promise<AuthResult<TCollection>> {
    try {
      const session = await this.login(input);
      return {
        status: 'authenticated',
        session,
      };
    } catch (error) {
      const mfaId =
        error &&
          typeof error === 'object' &&
          'response' in error &&
          error.response &&
          typeof error.response === 'object' &&
          'mfaId' in error.response
          ? String(error.response.mfaId)
          : '';

      if (mfaId) {
        return {
          status: 'mfa_required',
          challenge: { mfaId },
        };
      }

      throw error;
    }
  }

  async loginWithOAuth2(provider: string): Promise<void> {
    await this.collection().authWithOAuth2({ provider });
    const authData = await this.collection().authWithOAuth2({ provider });
    const user = authData.record;

    if (!user.username) {
      await this.collection().update(user.id, {
        username: generateUsername(user.email),
      });
    }
  }


  async refresh(): Promise<AuthSession<TCollection>> {
    if (!this.client.authStore.token) {
      throw new Error('Cannot refresh auth without an existing token.');
    }

    await this.collection().authRefresh<AuthResponse<TCollection>>();
    return this.session;
  }

  logout(): void {
    this.client.authStore.clear();
  }

  async register(input: RegisterUserInput): Promise<CollectionRecordMap['users']> {
    return this.client.collection('users').create<CollectionRecordMap['users']>(input);
  }

  async requestOtp(input: OtpRequestInput): Promise<OtpRequestResult> {
    return this.collection().requestOTP(input.email);
  }

  async verifyOtp(input: OtpVerifyInput): Promise<AuthSession<TCollection>> {
    await this.collection().authWithOTP(input.otpId, input.password);
    return this.session;
  }

  async requestVerification(email?: string): Promise<boolean> {
    const targetEmail = email ?? this.requireUser().email;

    if (!targetEmail) {
      throw new Error('Verification email is missing.');
    }

    return this.collection().requestVerification(targetEmail);
  }

  async confirmVerification(token: string): Promise<boolean> {
    return this.collection().confirmVerification(token);
  }

  async requestPasswordReset(email: string): Promise<boolean> {
    return this.collection().requestPasswordReset(email);
  }

  async confirmPasswordReset(input: PasswordResetConfirmInput): Promise<boolean> {
    return this.collection().confirmPasswordReset(
      input.token,
      input.password,
      input.passwordConfirm,
    );
  }

  async requestEmailChange(newEmail: string): Promise<boolean> {
    return this.collection().requestEmailChange(newEmail);
  }

  async confirmEmailChange(input: EmailChangeConfirmInput): Promise<boolean> {
    return this.collection().confirmEmailChange(input.token, input.password);
  }

  loadFromCookie(cookieHeader: string): void {
    this.client.authStore.loadFromCookie(cookieHeader);
  }

  exportToCookie(options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | 'Strict' | 'Lax' | 'None';
    path?: string;
    domain?: string;
    expires?: Date;
    maxAge?: number;
  }): string {
    return this.client.authStore.exportToCookie(options);
  }

  clearCookie(): string {
    this.client.authStore.clear();
    return this.client.authStore.exportToCookie({ maxAge: -1 });
  }

  onAuthChange(
    listener: (event: AuthChangeEvent<TCollection>) => void,
    fireImmediately = true,
  ): () => void {
    return this.client.authStore.onChange(
      (token, record) => {
        listener({
          token,
          user: (record as AuthRecord<TCollection> | null) ?? null,
          isValid: this.client.authStore.isValid,
        });
      },
      fireImmediately,
    );
  }
}

export function createAuthService<TCollection extends AuthCollectionName = 'users'>(
  client: PocketBase,
  collectionName: TCollection = 'users' as TCollection,
): PocketBaseAuthService<TCollection> {
  return new PocketBaseAuthService(client, collectionName);
}

function generateUsername(email: string) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = Math.floor(1000 + Math.random() * 9000); // 4 digit
  return `${base}${random}`;
}