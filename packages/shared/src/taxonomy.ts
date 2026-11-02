import { z } from "zod";
import taxonomyJson from "../../../docs/taxonomy.json";

const genreSchema = z.object({
  slug: z.string(),
  name_he: z.string(),
});

const categorySchema = z.object({
  slug: z.string(),
  name_he: z.string(),
  is_active: z.boolean(),
  genres: z.array(genreSchema),
});

const tagSchema = z.object({
  slug: z.string(),
  name_he: z.string(),
});

const regionSchema = z.object({
  slug: z.string(),
  name_he: z.string(),
});

const timeFilterSchema = z.object({
  slug: z.string(),
  name_he: z.string(),
  rule: z.string().optional(),
});

export const taxonomySchema = z.object({
  categories: z.array(categorySchema),
  tags: z.array(tagSchema),
  regions: z.array(regionSchema),
  time_filters: z.array(timeFilterSchema),
});

export type Taxonomy = z.infer<typeof taxonomySchema>;
export type TaxonomyCategory = z.infer<typeof categorySchema>;
export type TaxonomyGenre = z.infer<typeof genreSchema>;
export type TaxonomyRegion = z.infer<typeof regionSchema>;

export const taxonomy: Taxonomy = taxonomySchema.parse(taxonomyJson);

export const activeCategories = taxonomy.categories.filter((c) => c.is_active);

export const allGenres: Array<TaxonomyGenre & { categorySlug: string }> = taxonomy.categories.flatMap(
  (category) => category.genres.map((genre) => ({ ...genre, categorySlug: category.slug })),
);

export const regions = taxonomy.regions;
