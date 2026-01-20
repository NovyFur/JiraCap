import { JiraConfig, JiraIssue, TeamMember, Sprint, IssueType, Priority, Status } from '../types';

// Helper to determine Issue Type from string
export const mapIssueType = (type: string): IssueType => {
  const lower = type.toLowerCase();
  if (lower.includes('bug')) return IssueType.BUG;
  if (lower.includes('task')) return IssueType.TASK;
  if (lower.includes('epic')) return IssueType.EPIC;
  return IssueType.STORY;
};

// Helper to determine Priority
export const mapPriority = (priority: string): Priority => {
  const lower = priority.toLowerCase();
  if (lower.includes('highest') || lower.includes('blocker')) return Priority.HIGHEST;
  if (lower.includes('high') || lower.includes('critical')) return Priority.HIGH;
  if (lower.includes('low') || lower.includes('minor')) return Priority.LOW;
  return Priority.MEDIUM;
};

// Helper to determine Status
export const mapStatus = (status: string, statusCategory?: string): Status => {
  const lower = status.toLowerCase();
  const catLower = statusCategory?.toLowerCase() || '';

  if (catLower === 'done' || lower.includes('done') || lower.includes('closed')) return Status.DONE;
  if (catLower === 'in progress' || lower.includes('progress')) return Status.IN_PROGRESS;
  if (lower.includes('review') || lower.includes('qa')) return Status.IN_REVIEW;
  return Status.TO_DO;
};

export class JiraService {
  private config: JiraConfig;
  private baseUrl: string;

  constructor(config: JiraConfig) {
    this.config = config;
    // Remove trailing slash if present
    this.baseUrl = config.domain.replace(/\/$/, '');
  }

  private get headers() {
    return {
      'Authorization': `Basic ${btoa(`${this.config.email}:${this.config.apiToken}`)}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Atlassian-Token': 'no-check'
    };
  }

  // Helper to handle Proxy URL construction with fallback
  private async fetchFromJira(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const targetUrl = `${this.baseUrl}${endpoint}`;
    
    // Merge headers
    const reqHeaders = {
      ...this.headers,
      ...(options.headers || {})
    };
    
    const reqOptions: RequestInit = {
      ...options,
      headers: reqHeaders
    };

    if (!this.config.useProxy) {
      return fetch(targetUrl, reqOptions);
    }

    // Proxy fallback strategy
    const proxies = [
      (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u: string) => `https://thingproxy.freeboard.io/fetch/${u}`
    ];

    let lastError: Error | null = null;

    for (const proxyGen of proxies) {
      try {
        const proxyUrl = proxyGen(targetUrl);
        const response = await fetch(proxyUrl, reqOptions);
        // If fetch succeeds (even with 4xx/5xx), return the response
        return response;
      } catch (e: any) {
        console.warn(`Proxy attempt failed:`, e);
        lastError = e;
        // Continue to next proxy
      }
    }

    throw lastError || new Error("Network Error: Could not reach Jira via any proxy.");
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Use v3/myself which is standard
      const response = await this.fetchFromJira('/rest/api/3/myself');
      
      if (!response.ok) {
        if (response.status === 401) throw new Error("Unauthorized: Invalid email or API token.");
        if (response.status === 404) throw new Error("Not Found: Check your Jira Domain URL.");
        if (response.status === 403) throw new Error("Forbidden: You may not have permission to access this Jira instance.");
        
        // Attempt to read error message from body
        const errText = await response.text();
        throw new Error(`Jira Error (${response.status}): ${errText || response.statusText}`);
      }
      return true;
    } catch (e: any) {
      console.error("Jira connection validation failed", e);
      // Re-throw so UI can show message
      throw e;
    }
  }

  async getProjectDetails() {
    const response = await this.fetchFromJira(`/rest/api/3/project/${this.config.projectKey}`);
    if (!response.ok) throw new Error(`Failed to fetch project: ${response.statusText}`);
    return response.json();
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    const response = await this.fetchFromJira(
      `/rest/api/3/user/assignable/search?project=${this.config.projectKey}`
    );
    
    if (!response.ok) throw new Error(`Failed to fetch users: ${response.statusText}`);
    const users = await response.json();

    return JiraService.parseTeamFromRaw(users);
  }

  async getSprints(): Promise<Sprint[]> {
    // Agile API 1.0 is stable
    const boardResp = await this.fetchFromJira(
      `/rest/agile/1.0/board?projectKeyOrId=${this.config.projectKey}`
    );
    
    if (!boardResp.ok) throw new Error(`Failed to fetch boards: ${boardResp.statusText}`);
    const boardData = await boardResp.json();
    
    if (boardData.values.length === 0) return [];
    
    // Use the first board found
    const boardId = boardData.values[0].id;

    const sprintResp = await this.fetchFromJira(
      `/rest/agile/1.0/board/${boardId}/sprint?state=active,future`
    );

    if (!sprintResp.ok) throw new Error(`Failed to fetch sprints: ${sprintResp.statusText}`);
    const sprintData = await sprintResp.json();

    return JiraService.parseSprintsFromRaw(sprintData);
  }

  async getIssues(): Promise<JiraIssue[]> {
    const jql = `project = "${this.config.projectKey}" AND statusCategory != Done ORDER BY rank`;
    
    // Explicitly using GET /rest/api/3/search/jql as requested by the deprecation notice.
    // This new endpoint replaces GET /rest/api/3/search.
    // Using GET is preferred here to minimize issues with proxies that might mishandle POST bodies.
    const fields = ['summary', 'status', 'priority', 'issuetype', 'assignee', 'customfield_10016', 'sprint'];
    
    const params = new URLSearchParams();
    params.append('jql', jql);
    params.append('maxResults', '100');
    params.append('fields', fields.join(','));

    const response = await this.fetchFromJira(`/rest/api/3/search/jql?${params.toString()}`, {
      method: 'GET'
    });

    if (!response.ok) {
       const errText = await response.text();
       throw new Error(`Failed to fetch issues (${response.status}): ${errText}`);
    }
    const data = await response.json();

    return JiraService.parseIssuesFromRaw(data);
  }

  // --- Static Parsers for Manual Import ---

  static parseTeamFromRaw(users: any[]): TeamMember[] {
    if (!Array.isArray(users)) return [];
    return users
      .filter((u: any) => u.accountType === 'atlassian')
      .map((u: any) => ({
        id: u.accountId,
        name: u.displayName,
        role: 'Developer',
        avatar: u.avatarUrls?.['48x48'] || '',
        capacityPerSprint: 10,
        skills: []
      }));
  }

  static parseSprintsFromRaw(sprintData: any): Sprint[] {
    const values = sprintData.values || sprintData; // Handle both wrapped and unwrapped
    if (!Array.isArray(values)) return [];
    
    return values.map((s: any) => ({
      id: s.id.toString(),
      name: s.name,
      startDate: s.startDate || new Date().toISOString(),
      endDate: s.endDate || new Date(Date.now() + 12096e5).toISOString(),
      state: s.state
    }));
  }

  static parseIssuesFromRaw(data: any): JiraIssue[] {
    const issues = data.issues || data; // Handle both wrapper and array
    if (!Array.isArray(issues)) return [];

    return issues.map((i: any) => {
      const storyPoints = i.fields.customfield_10016 || 0;
      return {
        id: i.id,
        key: i.key,
        summary: i.fields.summary,
        type: mapIssueType(i.fields.issuetype?.name || ''),
        priority: mapPriority(i.fields.priority?.name || ''),
        status: mapStatus(i.fields.status?.name || '', i.fields.status?.statusCategory?.name),
        assigneeId: i.fields.assignee?.accountId || null,
        storyPoints: typeof storyPoints === 'number' ? storyPoints : 0,
        sprintId: undefined
      };
    });
  }
}