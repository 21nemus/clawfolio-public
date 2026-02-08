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
      <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/5 p-5">
        <h3 className="text-sm font-medium mb-3 text-white/50">Social Feed</h3>
        <p className="text-white/40 text-xs">Loading...</p>
      </div>
    );
  }

  if (!baseUrl) {
    return (
      <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/5 p-5">
        <h3 className="text-sm font-medium mb-3 text-white/50">Social Feed</h3>
        <p className="text-white/40 text-xs">Social not configured by operator.</p>
      </div>
    );
  }

  if (error || posts.length === 0) {
    return (
      <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white/50">Social Feed</h3>
          {baseUrl && (
            <a
              href={baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/40 hover:text-red-400 transition-colors"
            >
              OpenClaw ↗
            </a>
          )}
        </div>
        <p className="text-white/40 text-xs">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/50">Social Feed</h3>
        {baseUrl && (
          <a
            href={baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 hover:text-red-400 transition-colors"
          >
            OpenClaw ↗
          </a>
        )}
      </div>
      <div className="space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white/[0.03] border border-white/5 rounded-lg p-3"
          >
            {post.author && (
              <p className="text-xs text-white/30 mb-1">{post.author}</p>
            )}
            <p className="text-white/70 text-xs mb-2 leading-relaxed">{post.content}</p>
            <p className="text-xs text-white/30">
              {new Date(post.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
