'use client';

import { loadConfig, getConfigIssues } from '@/lib/config';

export function ConfigBanner() {
  const config = loadConfig();
  const issues = getConfigIssues(config);

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-yellow-500">Configuration Warning</p>
            <ul className="mt-1 text-sm text-yellow-400/90 list-disc list-inside">
              {issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-yellow-400/70">
              The app will run in limited mode. Set environment variables to enable full functionality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
