'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { 
  renderIntroduction, 
  renderStrategy, 
  renderUpdate, 
  renderTokenLaunch,
  type TemplateVars 
} from '@/lib/moltbook/templates';
import { loadConfig } from '@/lib/config';

const appConfig = loadConfig();

interface MoltbookPostPanelProps {
  botId: bigint;
  botAccountAddress: `0x${string}`;
  creatorAddress: `0x${string}`;
  lifecycleLabel: string;
  botMetadata?: Record<string, unknown> | null;
  botToken?: `0x${string}`;
  creationTxHash?: `0x${string}`;
  isCreator: boolean;
}

type PostType = 'introduction' | 'strategy' | 'update' | 'token_launch';

export function MoltbookPostPanel({
  botId,
  botAccountAddress,
  creatorAddress,
  lifecycleLabel,
  botMetadata,
  botToken,
  creationTxHash,
  isCreator,
}: MoltbookPostPanelProps) {
  const { address } = useAccount();
  
  const [activePostType, setActivePostType] = useState<PostType | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/b5d49497-3c0d-4821-bca6-8ae27b698a6c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      runId: 'debug1',
      hypothesisId: 'H3',
      location: 'web/src/components/actions/MoltbookPostPanel.tsx:55',
      message: 'MoltbookPostPanel render check',
      data: {
        isCreator,
        moltbookEnabled: appConfig.moltbookEnabled,
        addressConnected: !!address,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  // Only show if creator is connected and Moltbook is enabled
  if (!isCreator || !appConfig.moltbookEnabled) {
    return null;
  }

  const buildTemplateVars = (): TemplateVars => {
    const agentName = (botMetadata?.name as string) || `Bot #${botId}`;
    const strategyPrompt = (botMetadata?.strategyPrompt as string) || 'Strategy details not provided';
    const tokenAddress = botToken;
    const tokenSymbol = (botMetadata?.tokenSymbol as string) || undefined;
    const proofLinkTx = creationTxHash 
      ? `${appConfig.explorerTxUrlPrefix}${creationTxHash}`
      : undefined;
    const proofLinkBotAccount = `${appConfig.explorerAddressUrlPrefix}${botAccountAddress}`;

    return {
      agentName,
      strategyPrompt,
      tokenAddress,
      tokenSymbol,
      lifecycleLabel,
      botId: botId.toString(),
      botAccountAddress,
      creatorAddress,
      proofLinkTx,
      proofLinkBotAccount,
      recentAction: 'Recently deployed and configured',
      nextSteps: 'Monitoring market conditions for opportunities',
    };
  };

  const handleGeneratePost = (type: PostType) => {
    setError('');
    setSuccess('');
    setActivePostType(type);

    const vars = buildTemplateVars();
    let generated: { title: string; content: string };

    try {
      switch (type) {
        case 'introduction':
          generated = renderIntroduction(vars);
          break;
        case 'strategy':
          generated = renderStrategy(vars);
          break;
        case 'update':
          generated = renderUpdate(vars);
          break;
        case 'token_launch':
          if (!botToken) {
            setError('Token not launched yet');
            return;
          }
          generated = renderTokenLaunch(vars);
          break;
        default:
          return;
      }

      setTitle(generated.title);
      setContent(generated.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate post');
    }
  };

  const handlePublish = async () => {
    if (!title || !content) {
      setError('Title and content are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setRetryAfter(null);

    try {
      const response = await fetch('/api/moltbook/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          submolt: appConfig.moltbookSubmolt,
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        // Rate limited
        setRetryAfter(data.retry_after_minutes || 30);
        setError(data.message || 'Rate limit exceeded');
        return;
      }

      if (!response.ok) {
        setError(data.error || `Failed to publish: ${response.status}`);
        return;
      }

      // Success
      setSuccess('Published to Moltbook successfully! 🎉');
      setActivePostType(null);
      setTitle('');
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setActivePostType(null);
    setTitle('');
    setContent('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
      <h3 className="text-lg font-semibold mb-4 text-red-400">📝 Moltbook Publishing</h3>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 text-sm">
          {error}
          {retryAfter && (
            <div className="mt-2 text-xs">
              ⏱️ You can post again in {retryAfter} minutes
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded p-3 text-green-400 text-sm">
          {success}
        </div>
      )}

      {!activePostType ? (
        <div className="space-y-3">
          <p className="text-white/60 text-sm mb-4">
            Generate and publish social posts about your bot to Moltbook
          </p>
          
          <button
            onClick={() => handleGeneratePost('introduction')}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-3 rounded transition-colors text-left"
          >
            <div className="font-semibold">🤖 Publish Introduction</div>
            <div className="text-xs text-white/60 mt-1">
              Introduce your bot to the Moltbook community
            </div>
          </button>

          <button
            onClick={() => handleGeneratePost('strategy')}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-3 rounded transition-colors text-left"
          >
            <div className="font-semibold">📊 Publish Strategy</div>
            <div className="text-xs text-white/60 mt-1">
              Share detailed strategy disclosure
            </div>
          </button>

          <button
            onClick={() => handleGeneratePost('update')}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-3 rounded transition-colors text-left"
          >
            <div className="font-semibold">🔄 Publish Update</div>
            <div className="text-xs text-white/60 mt-1">
              Share recent activity and next steps
            </div>
          </button>

          {botToken && (
            <button
              onClick={() => handleGeneratePost('token_launch')}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-3 rounded transition-colors text-left"
            >
              <div className="font-semibold">🚀 Publish Token Launch</div>
              <div className="text-xs text-white/60 mt-1">
                Announce your Nad.fun token
              </div>
            </button>
          )}

          <div className="mt-4 text-xs text-white/40 border-t border-white/10 pt-3">
            ⚠️ Rate limit: 1 post per 30 minutes
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/80 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-red-400/50"
              maxLength={200}
            />
            <div className="text-xs text-white/40 mt-1">{title.length}/200</div>
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-red-400/50 font-mono text-sm"
              rows={12}
              maxLength={5000}
            />
            <div className="text-xs text-white/40 mt-1">{content.length}/5000</div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePublish}
              disabled={loading || !title || !content}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded transition-colors"
            >
              {loading ? 'Publishing...' : '🚀 Publish to Moltbook'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="text-xs text-white/40">
            Preview and edit the content above before publishing. All posts include verifiable onchain proofs.
          </div>
        </div>
      )}
    </div>
  );
}
