import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: '../cnt-content/full',
    deferRender: true,
    generateId: ({ entry }) => entry.replace(/[#\\]/g, '-'),
  }),
  schema: z.object({
    title: z.string(),
    module: z.string(),
    category: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    order: z.number().default(0),
    updated: z.coerce.date(),
    author: z.string(),
    description: z.string().optional(),
    related: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
  }),
});

export const collections = { docs };
