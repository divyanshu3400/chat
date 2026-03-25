import type { CollectionRecordMap, RecordId } from './pb-collections.types';

export type AuthCollectionName = 'users' | '_superusers';

export type AuthRecord<TCollection extends AuthCollectionName = 'users'> =
  CollectionRecordMap[TCollection];

export interface AuthSession<TCollection extends AuthCollectionName = 'users'> {
  token: string;
  user: AuthRecord<TCollection> | null;
  isValid: boolean;
}

export interface PasswordLoginInput {
  identity: string;
  password: string;
}

export interface OtpRequestInput {
  email: string;
}

export interface OtpRequestResult {
  otpId: string;
}

export interface OtpVerifyInput {
  otpId: string;
  password: string;
}

export interface MfaChallenge {
  mfaId: string;
}

export type AuthResult<TCollection extends AuthCollectionName = 'users'> =
  | {
    status: 'authenticated';
    session: AuthSession<TCollection>;
  }
  | {
    status: 'mfa_required';
    challenge: MfaChallenge;
  };

export interface RegisterUserInput {
  email: string;
  password: string;
  passwordConfirm: string;
  username: string;
  name?: string;
  emailVisibility?: boolean;
}

export interface PasswordResetConfirmInput {
  token: string;
  password: string;
  passwordConfirm: string;
}

export interface EmailChangeConfirmInput {
  token: string;
  password: string;
}

export interface AuthChangeEvent<TCollection extends AuthCollectionName = 'users'> {
  token: string;
  user: AuthRecord<TCollection> | null;
  isValid: boolean;
}

export interface AuthUserIdentity {
  id: RecordId;
  email?: string | null;
  username?: string | null;
}
