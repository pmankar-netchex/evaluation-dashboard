import { z } from 'zod';

// Message validation with length limits
export const messageSchema = z.object({
  content: z.string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message too long (max 5000 characters)")
    .trim()
    .refine(
      (val) => val.length > 0,
      { message: "Message must contain non-whitespace characters" }
    ),
});

// Evaluation notes with sanitization
export const evaluationNotesSchema = z.string()
  .max(2000, "Notes too long (max 2000 characters)")
  .optional()
  .transform(val => val?.trim());

// Enhanced evaluation schema
export const evaluationSchema = z.object({
  transcript_id: z.string().uuid("Invalid transcript ID").optional(),
  chat_session_id: z.string().uuid("Invalid chat session ID").optional(),
  evaluation_type: z.enum(['case_comparison', 'custom_chat']).default('case_comparison'),
  winner: z.enum(['sierra', 'agentforce', 'tie', 'both_poor']).optional(),
  scores: z.object({
    resolution: z.object({
      af: z.number().int().min(1).max(5).optional(),
      sierra: z.number().int().min(1).max(5),
    }).optional(),
    empathy: z.object({
      af: z.number().int().min(1).max(5).optional(),
      sierra: z.number().int().min(1).max(5),
    }).optional(),
    efficiency: z.object({
      af: z.number().int().min(1).max(5).optional(),
      sierra: z.number().int().min(1).max(5),
    }).optional(),
    accuracy: z.object({
      af: z.number().int().min(1).max(5).optional(),
      sierra: z.number().int().min(1).max(5),
    }).optional(),
  }),
  notes: evaluationNotesSchema,
  time_spent_seconds: z.number().int().min(0).max(86400).optional(), // Max 24 hours
}).refine(
  (data) => {
    // Must have either transcript_id or chat_session_id, not both
    return (data.transcript_id && !data.chat_session_id) || 
           (!data.transcript_id && data.chat_session_id);
  },
  { message: "Must provide either transcript_id or chat_session_id" }
);

// Case number validation
export const caseNumberSchema = z.string()
  .regex(/^[A-Za-z0-9-_]+$/, "Invalid case number format")
  .min(1)
  .max(100);

// Session ID validation
export const sessionIdSchema = z.string().uuid("Invalid session ID");

// Chat session evaluation schema
export const chatEvaluationSchema = z.object({
  chat_session_id: z.string().uuid("Invalid chat session ID"),
  scores: z.object({
    resolution: z.number().int().min(1).max(5),
    empathy: z.number().int().min(1).max(5),
    efficiency: z.number().int().min(1).max(5),
    accuracy: z.number().int().min(1).max(5),
  }),
  notes: evaluationNotesSchema,
  time_spent_seconds: z.number().int().min(0).max(86400).optional(),
});

