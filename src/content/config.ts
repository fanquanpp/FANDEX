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
