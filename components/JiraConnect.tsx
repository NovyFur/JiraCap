import React, { useState } from 'react';
import { Button } from './Button';
import { JiraConfig, TeamMember, JiraIssue, Sprint } from '../types';
import { JiraService } from '../services/jiraService';
import { Link, Lock, Globe, Mail, Box, ShieldCheck, FileJson, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface JiraConnectProps {
  onConnect: (config: JiraConfig) => Promise<boolean>;
  onManualImport: (data: { team: TeamMember[], issues: JiraIssue[], sprints: Sprint[] }) => void;
  isLoading: boolean;
  onCancel: () => void;
}

export const JiraConnect: React.FC<JiraConnectProps> = ({ onConnect, onManualImport, isLoading, onCancel }) => {
  const [mode, setMode] = useState<'api' | 'manual'>('api');
  
  // API Config State
  const [config, setConfig] = useState<JiraConfig>({
    domain: 'https://your-domain.atlassian.net',
    email: '',
    apiToken: '',
    projectKey: '',
    useProxy: true
  });
  
  // Manual Import State
  const [manualDomain, setManualDomain] = useState('https://your-domain.atlassian.net');
  const [manualProjectKey, setManualProjectKey] = useState('PROJ');
  const [jsonInput, setJsonInput] = useState('');
  
  const [error, setError] = useState<string | null>(null);

  const handleApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onConnect(config);
    } catch (err: any) {
      setError(err.message || "Connection failed. Please check your credentials.");
    }
  };

  const handleManualSubmit = () => {
    try {
      const data = JSON.parse(jsonInput);
      
      // Basic validation
      if (!data.issues && !Array.isArray(data)) throw new Error("Invalid JSON format. Expected Jira API response.");
      
      const parsedIssues = JiraService.parseIssuesFromRaw(data);
      if (parsedIssues.length === 0) throw new Error("No issues found in the JSON.");

      // For manual import, we create mock team/sprints if we only have issue data
      // Or we could ask for separate JSONs. For simplicity, we extract unique assignees as team.
      
      const uniqueAssignees = new Map<string, TeamMember>();
      
      // Extract team from issues if not provided separately
      if (data.issues) {
        data.issues.forEach((i: any) => {
          const assignee = i.fields.assignee;
          if (assignee && assignee.accountId) {
            uniqueAssignees.set(assignee.accountId, {
              id: assignee.accountId,
              name: assignee.displayName,
              role: 'Developer',
              avatar: assignee.avatarUrls?.['48x48'] || '',
              capacityPerSprint: 10,
              skills: []
            });
          }
        });
      }

      const parsedTeam = Array.from(uniqueAssignees.values());
      const parsedSprints: Sprint[] = [{ 
        id: 'manual-1', name: 'Current Sprint', 
        startDate: new Date().toISOString(), 
        endDate: new Date(Date.now() + 12096e5).toISOString(), 
        state: 'active' 
      }];

      onManualImport({
        team: parsedTeam.length > 0 ? parsedTeam : [],
        issues: parsedIssues,
        sprints: parsedSprints
      });

    } catch (err: any) {
      setError(err.message || "Failed to parse JSON.");
    }
  };

  const getSearchUrl = () => {
    const baseUrl = manualDomain.replace(/\/$/, '');
    const jql = `project = ${manualProjectKey} AND statusCategory != Done ORDER BY rank`;
    // Update to use the new /rest/api/3/search/jql endpoint as per API changes
    const params = new URLSearchParams();
    params.append('jql', jql);
    params.append('maxResults', '100');
    params.append('fields', 'summary,status,priority,issuetype,assignee,customfield_10016');
    
    return `${baseUrl}/rest/api/3/search/jql?${params.toString()}`;
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
      <div className="bg-blue-600 p-6 text-white text-center shrink-0">
        <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3">
          <Link size={24} />
        </div>
        <h2 className="text-xl font-bold">Connect to Jira</h2>
        <p className="text-blue-100 text-sm mt-1">Import your team and backlog</p>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setMode('api'); setError(null); }}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'api' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Automatic Connection
        </button>
        <button
          onClick={() => { setMode('manual'); setError(null); }}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'manual' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Manual Import (Fallback)
        </button>
      </div>

      <div className="p-6 overflow-y-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 break-words flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'api' ? (
          <form onSubmit={handleApiSubmit} className="space-y-4">
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
                    Routes via public proxies to bypass browser restrictions. Uncheck if you use a local proxy or browser extension.
                  </p>
                </div>
              </label>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-100 mb-4">
              <p className="font-semibold mb-1">Bypass Connection Issues</p>
              <p>
                If the automatic connection fails due to CORS/Network, use this method.
                Since you are logged into Jira in this browser, you can fetch the data directly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jira Domain</label>
                <input
                  type="text"
                  value={manualDomain}
                  onChange={(e) => setManualDomain(e.target.value)}
                  className="w-full rounded border-slate-300 text-sm px-2 py-1.5"
                  placeholder="https://company.atlassian.net"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Project Key</label>
                <input
                  type="text"
                  value={manualProjectKey}
                  onChange={(e) => setManualProjectKey(e.target.value)}
                  className="w-full rounded border-slate-300 text-sm px-2 py-1.5"
                  placeholder="PROJ"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Step 1: Get Data</span>
              <a 
                href={getSearchUrl()} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200 group"
              >
                <div className="flex items-center gap-3">
                  <FileJson size={20} className="text-blue-600" />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">Open Jira Data Link</div>
                    <div className="text-xs text-slate-500">Opens in new tab</div>
                  </div>
                </div>
                <Globe size={16} className="text-slate-400" />
              </a>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Step 2: Paste JSON</span>
              <div className="relative">
                <textarea 
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste the full JSON content here..."
                  className="w-full h-32 rounded-lg border border-slate-300 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                {jsonInput && (
                   <div className="absolute bottom-3 right-3 text-green-600 bg-white p-1 rounded-full shadow-sm">
                      <CheckCircle2 size={16} />
                   </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        {mode === 'api' ? (
          <Button type="submit" onClick={handleApiSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? 'Connecting...' : 'Connect Project'}
          </Button>
        ) : (
          <Button type="button" onClick={handleManualSubmit} disabled={!jsonInput} className="flex-1">
            Import Data
          </Button>
        )}
      </div>
    </div>
  );
};