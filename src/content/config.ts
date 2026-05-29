import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    module: z.string(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    order: z.number().default(0),
    created: z.coerce.date().optional(),
    updated: z.coerce.date().optional(),
    author: z.string().default('fanquanpp'),
    description: z.string().optional(),
    readingTime: z.number().optional(),
    related: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
    quiz: z
      .array(
        z.union([
          z.object({
            type: z.literal('fill'),
            question: z.string(),
            answer: z.string(),
            hint: z.string().optional(),
          }),
          z.object({
            type: z.literal('choice'),
            question: z.string(),
            options: z.array(z.string()),
            answer: z.number(),
            explanation: z.string().optional(),
          }),
          z.object({
            type: z.literal('fix'),
            question: z.string(),
            code: z.string().optional(),
            answer: z.string(),
            explanation: z.string().optional(),
          }),
        ])
      )
      .default([]),
  }),
});

const glossary = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    module: z.string(),
    updated: z.coerce.date().optional(),
  }),
});

export const collections = { docs, glossary };
