import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { driverSubmissionSchema, driverReviewSchema } from './driver-verification-schema';

export const submitDriverVerification = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => driverSubmissionSchema.parse(input)).handler(async ({ data, context }) => {
    const { data: profile, error: pe } = await context.supabase.from('driver_profiles').select('id_document_url,licence_url,vehicle_doc_url').eq('user_id', context.userId).single();
    if (pe || !profile) throw new Error('Save your profile and documents first');
    for (const path of [profile.id_document_url, profile.licence_url, profile.vehicle_doc_url]) {
      if (!path || path.split('/')[0] !== context.userId) throw new Error('Upload your own verification documents');
      const { data: blob, error } = await context.supabase.storage.from('provider-verification').download(path);
      if (error || !blob || blob.size < 1 || blob.size > 5 * 1024 * 1024) throw new Error('Each document must be valid and no larger than 5 MB');
      const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
      const ascii = (start: number, s: string) => [...s].every((c, i) => bytes[start + i] === c.charCodeAt(0));
      if (!((bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) || (bytes[0] === 137 && ascii(1, 'PNG')) || (ascii(0, 'RIFF') && ascii(8, 'WEBP')) || ascii(0, '%PDF'))) throw new Error('Use a JPG, PNG, WebP or PDF document');
    }
    const { data: result, error } = await context.supabase.rpc('submit_driver_verification', { _identity: data.identity, _licence: data.licence });
    if (error) throw new Error(error.message);
    return result;
  });

export const getDriverApplications = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ profileId: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from('driver_verification_applications').select('*').eq('driver_profile_id', data.profileId).order('submitted_at', { ascending: false }).limit(20);
    if (error) throw new Error('Applications unavailable');
    return rows ?? [];
  });

export const reviewDriverApplication = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => driverReviewSchema.parse(input)).handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('admin_review_driver', { _application: data.application, _status: data.status, _reason: data.reason });
    if (error) throw new Error(error.message);
    return result;
  });

export const signDriverDocument = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ application: z.string().uuid(), key: z.enum(['id','licence','registration']) }).parse(input)).handler(async ({ data, context }) => {
    const { data: allowed, error: re } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (re || !allowed) throw new Error('Forbidden');
    const { data: app, error } = await context.supabase.from('driver_verification_applications').select('document_paths,user_id').eq('id', data.application).single();
    if (error || !app) throw new Error('Application unavailable');
    const paths = app.document_paths as Record<string, unknown>;
    const path = paths[data.key];
    if (typeof path !== 'string' || path.split('/')[0] !== app.user_id) throw new Error('Document unavailable');
    const { data: signed, error: se } = await context.supabase.storage.from('provider-verification').createSignedUrl(path, 300);
    if (se || !signed) throw new Error('Document unavailable');
    return { url: signed.signedUrl };
  });