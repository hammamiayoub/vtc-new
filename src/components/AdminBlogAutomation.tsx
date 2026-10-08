import React, { useCallback, useEffect, useState } from 'react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import {
  addBlogTopic,
  deleteBlogTopic,
  fetchBlogTopics,
  type BlogAudience,
  type BlogTopic,
} from '../utils/blogPosts';

interface PublishedPost {
  audience: BlogAudience;
  status: 'published' | 'skipped';
  title: string;
  slug: string;
}

const audienceLabel: Record<BlogAudience, string> = {
  client: 'Voyageurs',
  driver: 'Chauffeurs',
};

export const AdminBlogAutomation: React.FC<{ onPublished: () => void }> = ({ onPublished }) => {
  const [topics, setTopics] = useState<BlogTopic[]>([]);
  const [audience, setAudience] = useState<BlogAudience>('client');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadTopics = useCallback(async () => {
    setLoading(true);
    try {
      setTopics(await fetchBlogTopics());
      setError(null);
    } catch (err) {
      console.error(err);
      setError('La file de sujets n’est pas disponible. Appliquez la migration du blog automatique.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  const pending = topics.filter((topic) => !topic.used_at);
  const pendingFor = (value: BlogAudience) => pending.filter((topic) => topic.audience === value);

  const publishToday = async () => {
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('publish-daily-blog', {
        body: {},
      });
      if (invokeError) {
        let detail = 'La publication automatique n’a pas répondu. Vérifiez que la fonction est déployée et que la clé OpenAI est configurée.';
        const context = (invokeError as { context?: Response }).context;
        if (context) {
          try {
            const body = await context.json();
            if (typeof body?.error === 'string' && body.error.trim()) detail = body.error;
          } catch {
            // Le corps d’erreur n’est pas du JSON.
          }
        }
        throw new Error(detail);
      }
      if (!data?.ok) throw new Error(data?.error || 'Publication impossible.');

      const posts = (data.posts ?? []) as PublishedPost[];
      const lines = posts.map((post) => {
        const label = audienceLabel[post.audience];
        return post.status === 'published'
          ? `${label} : « ${post.title} » est en ligne.`
          : `${label} : déjà publié aujourd’hui.`;
      });
      setNotice(lines.join(' '));
      await loadTopics();
      onPublished();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Publication impossible.');
    } finally {
      setPublishing(false);
    }
  };

  const saveTopic = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = keyword.trim();
    if (!value) return;
    setSaving(true);
    setError(null);
    try {
      await addBlogTopic(audience, value);
      setKeyword('');
      await loadTopics();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ajout impossible.');
    } finally {
      setSaving(false);
    }
  };

  const removeTopic = async (topic: BlogTopic) => {
    setError(null);
    try {
      await deleteBlogTopic(topic.id);
      setTopics((current) => current.filter((item) => item.id !== topic.id));
    } catch (err) {
      console.error(err);
      setError('Suppression du sujet impossible.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Publication automatique</h2>
      <p className="text-sm text-gray-600 mt-1 mb-5">
        Chaque jour à 7 h, heure de Tunis, le site publie un article pour les voyageurs et un article pour les chauffeurs.
        Les sujets ci-dessous sont utilisés dans l’ordre. Quand la file est vide, un nouveau sujet est proposé automatiquement.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Button type="button" onClick={() => void publishToday()} disabled={publishing || loading}>
          {publishing ? 'Rédaction en cours…' : 'Publier les articles du jour'}
        </Button>
        <p className="text-sm text-gray-600">
          {loading
            ? 'Chargement des sujets…'
            : `${pendingFor('client').length} sujets voyageurs et ${pendingFor('driver').length} sujets chauffeurs en attente.`}
        </p>
      </div>

      <form onSubmit={saveTopic} className="flex flex-col sm:flex-row gap-3 mb-5">
        <label className="sr-only" htmlFor="blog-topic-audience">Public</label>
        <select
          id="blog-topic-audience"
          value={audience}
          onChange={(event) => setAudience(event.target.value as BlogAudience)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        >
          <option value="client">Voyageurs</option>
          <option value="driver">Chauffeurs</option>
        </select>
        <label className="sr-only" htmlFor="blog-topic-keyword">Mot-clé</label>
        <input
          id="blog-topic-keyword"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Ajouter un mot-clé ou une question"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
        />
        <Button type="submit" variant="outline" disabled={saving || !keyword.trim()}>
          {saving ? 'Ajout…' : 'Ajouter à la file'}
        </Button>
      </form>

      {notice && <p className="text-sm text-green-800 mb-3">{notice}</p>}
      {error && (
        <p className="text-sm text-red-600 mb-3" role="alert">
          {error}
        </p>
      )}

      {!loading && pending.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {(['client', 'driver'] as BlogAudience[]).map((value) => (
            <div key={value}>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{audienceLabel[value]}</h3>
              <ul className="max-h-52 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
                {pendingFor(value).map((topic) => (
                  <li key={topic.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                    <span className="flex-1 text-gray-800">{topic.keyword}</span>
                    <button
                      type="button"
                      onClick={() => void removeTopic(topic)}
                      className="text-xs font-medium text-gray-500 hover:text-red-600"
                    >
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
