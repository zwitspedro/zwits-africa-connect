import { z } from 'zod';

export const driverSubmissionSchema = z.object({
  identity: z.string().trim().min(5).max(40),
  licence: z.string().trim().min(3).max(40),
}).strict();
export const driverReviewSchema = z.object({
  application: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  reason: z.string().trim().min(3).max(500),
}).strict();