import React, { useState } from 'react';
import { Button } from './Button';
import { JiraConfig } from '../types';
import { Link, Lock, Globe, Mail, Box, ShieldCheck } from 'lucide-react';

interface JiraConnectProps {
  onConnect: (config: JiraConfig) => Promise<boolean>;
  isLoading: boolean;
  onCancel: () => void;
}

export const JiraConnect: React.FC<JiraConnectProps> = ({ onConnect, isLoading, onCancel }) => {
  const [config, setConfig] = useState<JiraConfig>({
    domain: 'https://your-domain.atlassian.net',
    email: '',
    apiToken: '',
    projectKey: '',
    useProxy: true
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onConnect(config);
    } catch (err: any) {
      setError(err.message || "Connection failed. Please check your credentials and internet connection.");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-blue-600 p-6 text-white text-center">
        <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3">
          <Link size={24} />
        </div>
        <h2 className="text-xl font-bold">Connect to Jira</h2>
        <p className="text-blue-100 text-sm mt-1">Import your team and backlog instantly</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 break-words">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Jira Domain URL</label>
          <div className="relative">
            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="url"
              required
              value={config.domain}
              onChange={(e) => setConfig({ ...config, domain: e.target.value })}
              className="pl-9 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://company.atlassian.net"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="email"
              required
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              className="pl-9 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            API Token 
            <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:underline text-xs">(Get Token)</a>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="password"
              required
              value={config.apiToken}
              onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
              className="pl-9 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••••••••••••••••••"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project Key</label>
          <div className="relative">
            <Box className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              required
              value={config.projectKey}
              onChange={(e) => setConfig({ ...config, projectKey: e.target.value })}
              className="pl-9 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="PROJ"
            />
          </div>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="pt-0.5 text-blue-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                 <input
                  type="checkbox"
                  checked={config.useProxy}
                  onChange={(e) => setConfig({ ...config, useProxy: e.target.checked })}
                  className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <span className="text-sm font-medium text-blue-900">Use CORS Proxy</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Required for browser-only connections. If you use a browser extension (e.g. "Allow CORS") or a local proxy, uncheck this.
              </p>
            </div>
          </label>
        </div>

        <div className="pt-2 flex gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? 'Connecting...' : 'Connect Project'}
          </Button>
        </div>
      </form>
    </div>
  );
};