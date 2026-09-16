import { describe, expect, it } from 'vitest';
import { decideAccess, isPublicPath } from './access-control';

const ORIGIN = 'https://opslens.example.com';

describe('isPublicPath', () => {
  it('treats the marketing page, login, signup, and password reset as public', () => {
    expect(isPublicPath('/')).toBe(true);
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/signup')).toBe(true);
    expect(isPublicPath('/forgot-password')).toBe(true);
    expect(isPublicPath('/reset-password')).toBe(true);
  });

  it('treats the privacy policy and terms as public', () => {
    expect(isPublicPath('/privacy')).toBe(true);
    expect(isPublicPath('/terms')).toBe(true);
  });

  it('treats every other path as protected by default', () => {
    expect(isPublicPath('/overview')).toBe(false);
    expect(isPublicPath('/issues')).toBe(false);
    expect(isPublicPath('/issues/some-id')).toBe(false);
    expect(isPublicPath('/api/uploads')).toBe(false);
    // A route added in a later phase and never registered here must still
    // be protected — that's the whole point of deny-by-default.
    expect(isPublicPath('/some-brand-new-route-nobody-remembered')).toBe(false);
  });

  it('allows the Auth.js internal routes and the Workflow SDK callback', () => {
    expect(isPublicPath('/api/auth/session')).toBe(true);
    expect(isPublicPath('/.well-known/workflow/v1/flow')).toBe(true);
  });
});

describe('decideAccess', () => {
  it('redirects an unauthenticated request for a protected page to /login with a callbackUrl', () => {
    const decision = decideAccess('/overview', false, ORIGIN);
    expect(decision.type).toBe('redirect');
    if (decision.type !== 'redirect') throw new Error('unreachable');
    const location = new URL(decision.url);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('callbackUrl')).toBe('/overview');
  });

  it('returns a 401 JSON envelope for an unauthenticated protected API call, not a redirect', () => {
    const decision = decideAccess('/api/uploads', false, ORIGIN);
    expect(decision).toEqual({
      type: 'json',
      status: 401,
      body: {
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' },
      },
    });
  });

  it('lets an authenticated request through to a protected page', () => {
    expect(decideAccess('/overview', true, ORIGIN)).toEqual({ type: 'next' });
  });

  it('sends an already-authenticated user away from /login to /overview', () => {
    const decision = decideAccess('/login', true, ORIGIN);
    expect(decision.type).toBe('redirect');
    if (decision.type !== 'redirect') throw new Error('unreachable');
    expect(new URL(decision.url).pathname).toBe('/overview');
  });

  it('lets an unauthenticated request through to a public page', () => {
    expect(decideAccess('/login', false, ORIGIN)).toEqual({ type: 'next' });
  });

  it('never redirects an authenticated API call under a public prefix (e.g. /api/auth/*)', () => {
    expect(decideAccess('/api/auth/session', true, ORIGIN)).toEqual({
      type: 'next',
    });
  });

  it('lets an authenticated user view the privacy policy or terms without redirecting to /overview', () => {
    expect(decideAccess('/privacy', true, ORIGIN)).toEqual({ type: 'next' });
    expect(decideAccess('/terms', true, ORIGIN)).toEqual({ type: 'next' });
  });

  it('lets an unauthenticated user view the privacy policy or terms', () => {
    expect(decideAccess('/privacy', false, ORIGIN)).toEqual({ type: 'next' });
    expect(decideAccess('/terms', false, ORIGIN)).toEqual({ type: 'next' });
  });
});
