import { z } from 'zod';

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss yyyy-MM-dd sein')
  .refine((value) => {
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return (
      date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
    );
  }, 'Ungültiges Kalenderdatum');

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Uhrzeit muss HH:mm sein')
  .refine((value) => {
    const [h, m] = value.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }, 'Ungültige Uhrzeit');

const holidaySchema = z.object({
  date: dateKeySchema,
  name: z.string().min(1).max(200),
  countryCode: z.string().max(20).optional(),
  weekday: z.string().max(40).optional(),
});

const overrideSchema = z.object({
  date: dateKeySchema,
  service: z.enum(['open', 'closed']),
  reason: z.string().max(300).optional(),
});

export const generateIcsRequestSchema = z
  .object({
    pickupDay: z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']),
    eventName: z.string().min(1).max(120),
    holidays: z.array(holidaySchema).max(500),
    startDate: dateKeySchema,
    endDate: dateKeySchema,
    reminder: z.number().int().min(0).max(168).optional().default(0),
    timeType: z.enum(['allday', 'specific', 'range']).optional().default('allday'),
    specificTime: timeSchema.optional().default('08:00'),
    startTime: timeSchema.optional().default('08:00'),
    endTime: timeSchema.optional().default('09:00'),
    selectedYear: z.number().int().min(2000).max(2100),
    holidayPolicy: z
      .enum(['ma48-vienna', 'generic', 'custom'])
      .optional()
      .default('ma48-vienna'),
    country: z.enum(['AT', 'DE']).optional(),
    timezone: z.string().max(64).optional(),
    serviceOverrides: z.array(overrideSchema).max(100).optional().default([]),
    isBioWaste: z.boolean().optional().default(false),
    bioReferenceDate: dateKeySchema.optional().nullable(),
    winterStartMonth: z.number().int().min(1).max(12).optional().default(10),
    winterStartDay: z.number().int().min(1).max(31).optional().default(1),
    winterEndMonth: z.number().int().min(1).max(12).optional().default(3),
    winterEndDay: z.number().int().min(1).max(31).optional().default(31),
    dateRangeMode: z.enum(['future', 'full-year']).optional().default('future'),
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate muss vor endDate liegen',
        path: ['startDate'],
      });
    }
    if (data.timeType === 'range' && data.startTime >= data.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Startzeit muss vor Endzeit liegen',
        path: ['startTime'],
      });
    }
    if (data.isBioWaste && !data.bioReferenceDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Biotonne erfordert bioReferenceDate',
        path: ['bioReferenceDate'],
      });
    }
  });

export const holidaysQuerySchema = z.object({
  country: z
    .string()
    .transform((v) => v.toUpperCase())
    .pipe(z.enum(['AT', 'DE'])),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const fetchIcsQuerySchema = z.object({
  url: z.string().url().max(2000),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export function formatZodError(error) {
  return {
    error: 'Validierungsfehler',
    details: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}
