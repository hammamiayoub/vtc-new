import { supabase } from '../lib/supabase';

export type BlogAudience = 'client' | 'driver';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  image_url: string | null;
  image_path: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  audience?: BlogAudience | null;
  source?: 'admin' | 'auto' | null;
  keyword?: string | null;
}

export interface BlogTopic {
  id: string;
  audience: BlogAudience;
  keyword: string;
  used_at: string | null;
  created_at: string;
}

const BLOG_POST_COLUMNS =
  'id, title, slug, content, image_url, image_path, published, published_at, created_at, updated_at, audience, source, keyword';

const BLOG_IMAGE_BUCKET = 'blog-images';

export function slugifyTitle(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'article';
}

export function excerptFromContent(content: string, max = 180): string {
  const text = content.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export async function fetchPublishedBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(BLOG_POST_COLUMNS)
    .eq('published', true)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

export async function fetchPublishedBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(BLOG_POST_COLUMNS)
    .eq('published', true)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return (data as BlogPost | null) ?? null;
}

export async function fetchAdminBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(BLOG_POST_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

export async function uploadBlogImage(file: File): Promise<{ url: string; path: string }> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    throw new Error('Formats acceptés : JPG, PNG, WEBP ou GIF.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('L’image ne doit pas dépasser 5 Mo.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BLOG_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) throw new Error('Impossible d’envoyer l’image. Réessayez.');

  const { data } = supabase.storage.from(BLOG_IMAGE_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error('Impossible d’obtenir l’adresse de l’image.');

  return { url: data.publicUrl, path };
}

export async function fetchBlogTopics(): Promise<BlogTopic[]> {
  const { data, error } = await supabase
    .from('blog_topics')
    .select('id, audience, keyword, used_at, created_at')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as BlogTopic[];
}

export async function addBlogTopic(audience: BlogAudience, keyword: string): Promise<void> {
  const { error } = await supabase.from('blog_topics').insert({ audience, keyword });
  if (error) {
    if (error.code === '23505') throw new Error('Ce mot-clé est déjà dans la file.');
    throw error;
  }
}

export async function deleteBlogTopic(id: string): Promise<void> {
  const { error } = await supabase.from('blog_topics').delete().eq('id', id).is('used_at', null);
  if (error) throw error;
}

export async function deleteBlogImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from(BLOG_IMAGE_BUCKET).remove([path]);
}
