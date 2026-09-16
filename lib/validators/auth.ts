import { z } from 'zod';

export const signUpSchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});
