import { z } from 'zod';
import { ApplicantData } from '../types/ipc';

// Validation schemas
// Updated to support all OpenAI API key formats (old and new)
// New format: sk-proj-[base64 characters] or sk-[variable length alphanumeric]
export const apiKeySchema = z.string()
  .min(20, 'API key too short')
  .startsWith('sk-', 'API key must start with "sk-"')
  .refine(
    (key) => /^sk-[a-zA-Z0-9_\-+/=]{20,}$/.test(key),
    'Invalid OpenAI API key format'
  );

export const applicantDataSchema = z.object({
  beneficiaryName: z.string().max(100).default(''),
  beneficiaryNationality: z.string().max(50).default(''),
  currentLocation: z.string().max(100).default(''),
  petitionerName: z.string().max(100).default(''),
  petitionerType: z.string().default('Corporation'),
  petitionerState: z.string().max(50).default(''),
  petitionerAddress: z.string().max(200).default(''),
  visaType: z.string().default('default-h1b'),
  industry: z.string().default('Technology'),
  complexity: z.string().default('Moderate'),
  priorityDate: z.string().default(''),
  filingDate: z.string().default(''),
  caseNumber: z.string().max(50).default(''),
  attorneyName: z.string().max(100).default(''),
  additionalInfo: z.string().max(5000).default(''),
  llmProvider: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
  llmModel: z.string().default('gpt-4'),
  templateVariant: z.string().default('Standard'),
  customFields: z.array(z.object({
    id: z.number(),
    label: z.string().max(50),
    value: z.string().max(200)
  })).default([])
});

export const filePathSchema = z.string().max(500);

export const generateRequestSchema = z.object({
  section: z.object({
    id: z.number(),
    title: z.string().max(200),
    prompt: z.string().max(5000),
    documents: z.array(z.any())
  }),
  applicantData: applicantDataSchema,
  selectedDocuments: z.array(z.any()),
  llmModel: z.string(),
  systemPrompt: z.string().max(10000).optional()
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function sanitizeApplicantData(data: ApplicantData): ApplicantData {
  return {
    ...data,
    beneficiaryName: sanitizeString(data.beneficiaryName),
    beneficiaryNationality: sanitizeString(data.beneficiaryNationality),
    currentLocation: sanitizeString(data.currentLocation),
    petitionerName: sanitizeString(data.petitionerName),
    petitionerAddress: sanitizeString(data.petitionerAddress),
    caseNumber: sanitizeString(data.caseNumber),
    attorneyName: sanitizeString(data.attorneyName),
    additionalInfo: sanitizeString(data.additionalInfo),
    customFields: data.customFields.map(field => ({
      ...field,
      label: sanitizeString(field.label),
      value: sanitizeString(field.value)
    }))
  };
}