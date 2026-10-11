import { useState } from 'react';
import type { AuthError, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Loader2, Shield, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordStrength, isPasswordStrong } from '@/components/PasswordStrength';
import { supabase } from '@/integrations/supabase/client';

interface ChangePasswordCardProps {
  user: User | null;
}

/** True when the account has an email/password identity (not OAuth only). */
const hasPasswordIdentity = (user: User): boolean => {
  const identities = user.identities ?? [];
  if (identities.length > 0) {
    return identities.some((identity) => identity.provider === 'email');
  }
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [];
  if (providers.length > 0) return providers.includes('email');
  const provider = user.app_metadata?.provider as string | undefined;
  return !provider || provider === 'email';
};

const oauthProviderLabel = (user: User): string => {
  const provider =
    user.identities?.find((identity) => identity.provider !== 'email')?.provider ??
    (user.app_metadata?.provider as string | undefined) ??
    '';
  if (!provider || provider === 'google') return 'Google';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

const needsReauthentication = (error: AuthError): boolean =>
  error.code === 'reauthentication_needed' ||
  error.code === 'reauth_nonce_missing' ||
  /reauthenticat/i.test(error.message);

const describeUpdateError = (error: AuthError): string => {
  if (error.code === 'weak_password') {
    return 'That password is too weak. Use at least 8 characters with a mix of letters, numbers and symbols.';
  }
  if (error.code === 'same_password') {
    return 'Your new password must be different from your current password.';
  }
  if (error.code === 'reauthentication_not_valid' || error.code === 'otp_expired') {
    return 'That verification code is invalid or has expired. Request a new code and try again.';
  }
  if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return error.message || 'Could not update your password. Please try again.';
};

export const ChangePasswordCard = ({ user }: ChangePasswordCardProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nonce, setNonce] = useState('');
  const [awaitingNonce, setAwaitingNonce] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setNonce('');
    setAwaitingNonce(false);
    setErrorMessage(null);
  };

  if (!user) return null;

  const passwordless = !hasPasswordIdentity(user);

  // OAuth-only accounts set a first password through the same recovery email
  // the sign-in page's "Forgot password" uses. Sending it from here keeps the
  // user on this page: /auth redirects signed-in users to their dashboard.
  const sendSetPasswordLink = async () => {
    if (!user.email) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setErrorMessage(describeUpdateError(error));
        return;
      }
      setLinkSent(true);
      toast.success(`We emailed a link to ${user.email} to set your password.`);
    } catch {
      setErrorMessage('Could not send the email. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyUpdate = async (withNonce?: string): Promise<boolean> => {
    const { error } = await supabase.auth.updateUser(
      withNonce ? { password: newPassword, nonce: withNonce } : { password: newPassword }
    );
    if (!error) return true;

    if (!withNonce && needsReauthentication(error)) {
      const { error: reauthError } = await supabase.auth.reauthenticate();
      if (reauthError) {
        setErrorMessage(describeUpdateError(reauthError));
        return false;
      }
      setAwaitingNonce(true);
      setErrorMessage(null);
      toast.info(`We emailed a verification code to ${user.email}. Enter it below to finish.`);
      return false;
    }

    setErrorMessage(describeUpdateError(error));
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (awaitingNonce) {
      if (!nonce.trim()) {
        setErrorMessage('Enter the verification code from your email.');
        return;
      }
      setIsSaving(true);
      try {
        if (await applyUpdate(nonce.trim())) {
          toast.success('Password updated');
          reset();
        }
      } catch {
        setErrorMessage('Could not update your password. Please try again.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!currentPassword) {
      setErrorMessage('Enter your current password.');
      return;
    }
    if (!isPasswordStrong(newPassword)) {
      setErrorMessage('Please choose a stronger new password.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage('Your new password must be different from your current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('The new passwords do not match.');
      return;
    }
    if (!user.email) {
      setErrorMessage('Your account has no email address. Contact support to change your password.');
      return;
    }

    setIsSaving(true);
    try {
      // Confirm the current password before allowing a change.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setErrorMessage(
          signInError.code === 'invalid_credentials' || /invalid login credentials/i.test(signInError.message)
            ? 'Current password is incorrect.'
            : describeUpdateError(signInError)
        );
        return;
      }

      if (await applyUpdate()) {
        toast.success('Password updated');
        reset();
      }
    } catch {
      setErrorMessage('Could not update your password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security
        </CardTitle>
        <CardDescription>Manage your account security</CardDescription>
      </CardHeader>
      <CardContent>
        {passwordless ? (
          <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/50 text-sm">
            <div className="flex items-start gap-3">
              <KeyRound className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <p className="text-muted-foreground">
                {linkSent
                  ? `Check ${user.email} for a link to set your password.`
                  : `You sign in with ${oauthProviderLabel(user)}. To also sign in with a password, we will email you a link to set one.`}
              </p>
            </div>
            {errorMessage && <p className="text-sm text-destructive" role="alert">{errorMessage}</p>}
            {!linkSent && user.email && (
              <Button type="button" variant="outline" className="w-fit" onClick={sendSetPasswordLink} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Email me a link to set a password
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <h3 className="text-sm font-medium">Change password</h3>

            {!awaitingNonce ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">New password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSaving}
                  />
                  {newPassword && <PasswordStrength password={newPassword} />}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm new password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSaving}
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reauth_nonce">Verification code</Label>
                <Input
                  id="reauth_nonce"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={nonce}
                  onChange={(e) => setNonce(e.target.value)}
                  disabled={isSaving}
                  placeholder="Code from your email"
                />
                <p className="text-xs text-muted-foreground">
                  For your security we sent a code to {user.email}. Enter it to confirm the change.
                </p>
              </div>
            )}

            {errorMessage && (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {awaitingNonce && (
                <Button type="button" variant="ghost" onClick={reset} disabled={isSaving}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {awaitingNonce ? 'Confirm and update' : 'Update password'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
