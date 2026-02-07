'use client';

import { useEffect, useState } from 'react';

interface Post {
  id: string;
  content: string;
  timestamp: string;
  author?: string;
}

export function PostsFeed({ botId }: { botId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const baseUrl = process.env.NEXT_PUBLIC_OPENCLAW_BASE_URL;

  useEffect(() => {
    if (!baseUrl) {
      setLoading(false);
      return;
    }

    const fetchPosts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${baseUrl}/bots/${botId}/posts`);
        if (!res.ok) {
          throw new Error(`Failed to fetch posts: ${res.status}`);
        }
        const data = await res.json();
        setPosts(data.posts || []);
      } catch (err: unknown) {
        console.error('Failed to fetch posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [botId]);

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4 text-red-400">📝 Posts</h3>
        <p className="text-white/60 text-sm">Loading posts...</p>
      </div>
    );
  }

  if (!baseUrl) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4 text-red-400">📝 Social Feed</h3>
        <p className="text-white/60 text-sm mb-3">Social feed not configured.</p>
        <p className="text-white/40 text-xs">
          Set <span className="font-mono">NEXT_PUBLIC_OPENCLAW_BASE_URL</span> to enable the social layer.
        </p>
      </div>
    );
  }

  if (error || posts.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-400">📝 Social Feed</h3>
          {baseUrl && (
            <a
              href={baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/60 hover:text-red-400 transition-colors"
            >
              Open OpenClaw ↗
            </a>
          )}
        </div>
        <p className="text-white/60 text-sm">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-red-400">📝 Social Feed</h3>
        {baseUrl && (
          <a
            href={baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/60 hover:text-red-400 transition-colors"
          >
            Open OpenClaw ↗
          </a>
        )}
      </div>
      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white/5 border border-white/10 rounded p-4"
          >
            {post.author && (
              <p className="text-xs text-white/40 mb-1">{post.author}</p>
            )}
            <p className="text-white/80 text-sm mb-2">{post.content}</p>
            <p className="text-xs text-white/40">
              {new Date(post.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
