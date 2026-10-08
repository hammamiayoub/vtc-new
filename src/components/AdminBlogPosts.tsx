import React, { useCallback, useEffect, useState } from 'react';
import { FileText, ImagePlus, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { AdminBlogAutomation } from './AdminBlogAutomation';
import {
  deleteBlogImage,
  excerptFromContent,
  fetchAdminBlogPosts,
  slugifyTitle,
  uploadBlogImage,
  type BlogPost,
} from '../utils/blogPosts';

interface ArticleForm {
  title: string;
  content: string;
  published: boolean;
  imageFile: File | null;
  imagePreview: string | null;
}

const emptyForm = (): ArticleForm => ({
  title: '',
  content: '',
  published: true,
  imageFile: null,
  imagePreview: null,
});

export const AdminBlogPosts: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<ArticleForm>(emptyForm);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await fetchAdminBlogPosts());
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les articles. Vérifiez que la migration blog est appliquée.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const resetForm = () => {
    if (form.imagePreview && form.imageFile) URL.revokeObjectURL(form.imagePreview);
    setForm(emptyForm());
    setEditing(null);
  };

  const startEdit = (post: BlogPost) => {
    if (form.imagePreview && form.imageFile) URL.revokeObjectURL(form.imagePreview);
    setEditing(post);
    setForm({
      title: post.title,
      content: post.content,
      published: post.published,
      imageFile: null,
      imagePreview: post.image_url,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onImageChange = (file: File | null) => {
    if (form.imagePreview && form.imageFile) URL.revokeObjectURL(form.imagePreview);
    setForm((current) => ({
      ...current,
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : editing?.image_url ?? null,
    }));
  };

  const savePost = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      setError('Le titre et le texte sont obligatoires.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let imageUrl = editing?.image_url ?? null;
      let imagePath = editing?.image_path ?? null;

      if (form.imageFile) {
        const uploaded = await uploadBlogImage(form.imageFile);
        if (editing?.image_path && editing.image_path !== uploaded.path) {
          await deleteBlogImage(editing.image_path);
        }
        imageUrl = uploaded.url;
        imagePath = uploaded.path;
      }

      const now = new Date().toISOString();
      const publishedAt = form.published
        ? editing?.published_at ?? now
        : null;

      if (editing) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            title,
            content,
            image_url: imageUrl,
            image_path: imagePath,
            published: form.published,
            published_at: publishedAt,
            updated_at: now,
          })
          .eq('id', editing.id);
        if (updateError) throw updateError;
      } else {
        let slug = slugifyTitle(title);
        const { data: existing } = await supabase
          .from('blog_posts')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        if (existing) slug = `${slug}-${Date.now().toString().slice(-4)}`;

        const { error: insertError } = await supabase.from('blog_posts').insert({
          title,
          slug,
          content,
          image_url: imageUrl,
          image_path: imagePath,
          published: form.published,
          published_at: publishedAt,
          updated_at: now,
        });
        if (insertError) throw insertError;
      }

      resetForm();
      await loadPosts();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const removePost = async (post: BlogPost) => {
    if (!window.confirm(`Supprimer l’article « ${post.title} » ?`)) return;
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('blog_posts').delete().eq('id', post.id);
      if (deleteError) throw deleteError;
      await deleteBlogImage(post.image_path);
      if (editing?.id === post.id) resetForm();
      await loadPosts();
    } catch (err) {
      console.error(err);
      setError('Suppression impossible.');
    }
  };

  return (
    <div className="space-y-6">
      <AdminBlogAutomation onPublished={() => void loadPosts()} />
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {editing ? 'Modifier l’article' : 'Nouvel article'}
        </h2>
        <p className="text-sm text-gray-600 mt-1 mb-5">
          Les articles publiés apparaissent dans le menu Blog du site. Les brouillons restent visibles uniquement ici.
        </p>

        <form onSubmit={savePost} className="space-y-4">
          <div>
            <label htmlFor="blog-title" className="block text-sm font-medium text-gray-700 mb-1">
              Titre
            </label>
            <input
              id="blog-title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
              placeholder="Titre de l’article"
            />
          </div>

          <div>
            <label htmlFor="blog-content" className="block text-sm font-medium text-gray-700 mb-1">
              Texte
            </label>
            <textarea
              id="blog-content"
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
              rows={10}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
              placeholder="Rédigez l’article. Les retours à la ligne sont conservés."
            />
          </div>

          <div>
            <label htmlFor="blog-image" className="block text-sm font-medium text-gray-700 mb-1">
              Image
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <label
                htmlFor="blog-image"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 cursor-pointer hover:bg-gray-50"
              >
                <ImagePlus size={16} />
                Choisir une image
              </label>
              <input
                id="blog-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => onImageChange(event.target.files?.[0] ?? null)}
              />
              {form.imagePreview && (
                <img
                  src={form.imagePreview}
                  alt="Aperçu de l’article"
                  className="h-28 w-44 object-cover rounded-lg border border-gray-200"
                />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">JPG, PNG, WEBP ou GIF, 5 Mo maximum.</p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
              className="rounded border-gray-300"
            />
            Publier sur le blog
          </label>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Articles</h2>
        </div>
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileText size={40} className="text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Aucun article pour le moment.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {posts.map((post) => (
              <li key={post.id} className="p-4 sm:p-5 flex gap-4">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt=""
                    className="w-24 h-16 sm:w-32 sm:h-20 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                  />
                ) : (
                  <div className="w-24 h-16 sm:w-32 sm:h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{post.title}</h3>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        post.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {post.published ? 'Publié' : 'Brouillon'}
                    </span>
                    {post.source === 'auto' && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        Auto · {post.audience === 'driver' ? 'Chauffeurs' : 'Voyageurs'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{excerptFromContent(post.content, 140)}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => startEdit(post)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-black"
                    >
                      <Pencil size={14} />
                      Modifier
                    </button>
                    {post.published && (
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-800 hover:text-black"
                      >
                        Voir
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void removePost(post)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
