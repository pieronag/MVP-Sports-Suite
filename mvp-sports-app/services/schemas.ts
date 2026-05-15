import { z } from 'zod';

export const bookingSchema = z.object({
  tenantId: z.string().min(1),
  courtId: z.string().min(1),
  clientName: z.string().min(1),
  date: z.any(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  totalPrice: z.number().nonnegative(),
  status: z.enum(['confirmed', 'cancelled', 'active', 'completed', 'past']),
  paymentStatus: z.enum(['paid', 'pending', 'partial']),
  source: z.enum(['mobile_app', 'manual_dashboard']).or(z.string()),
})
  .passthrough();

export type BookingDoc = z.infer<typeof bookingSchema>;

export const tenantSchema = z.object({
  name: z.string().min(1),
})
  .passthrough();

export type TenantDoc = z.infer<typeof tenantSchema>;

export const courtSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1),
  sport: z.string().optional(),
})
  .passthrough();

export type CourtDoc = z.infer<typeof courtSchema>;

