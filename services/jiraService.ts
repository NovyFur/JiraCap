import { JiraConfig, JiraIssue, TeamMember, Sprint, IssueType, Priority, Status } from '../types';

// Helper to determine Issue Type from string
const mapIssueType = (type: string): IssueType => {
  const lower = type.toLowerCase();
  if (lower.includes('bug')) return IssueType.BUG;
  if (lower.includes('task')) return IssueType.TASK;
  if (lower.includes('epic')) return IssueType.EPIC;
  return IssueType.STORY;
};

// Helper to determine Priority
const mapPriority = (priority: string): Priority => {
  const lower = priority.toLowerCase();
  if (lower.includes('highest') || lower.includes('blocker')) return Priority.HIGHEST;
  if (lower.includes('high') || lower.includes('critical')) return Priority.HIGH;
  if (lower.includes('low') || lower.includes('minor')) return Priority.LOW;
  return Priority.MEDIUM;
};

// Helper to determine Status
const mapStatus = (status: string, statusCategory?: string): Status => {
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
      'Content-Type': 'application/json'
    };
  }

  // Helper to handle Proxy URL construction
  private async fetchFromJira(endpoint: string): Promise<Response> {
    const targetUrl = `${this.baseUrl}${endpoint}`;
    
    // If proxy is enabled, wrap the URL
    // We use corsproxy.io as it is a common stable public proxy for demos
    const finalUrl = this.config.useProxy 
      ? `https://corsproxy.io/?${encodeURIComponent(targetUrl)}` 
      : targetUrl;

    return fetch(finalUrl, {
      headers: this.headers
    });
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.fetchFromJira('/rest/api/3/myself');
      return response.ok;
    } catch (e) {
      console.error("Jira connection validation failed", e);
      return false;
    }
  }

  async getProjectDetails() {
    const response = await this.fetchFromJira(`/rest/api/3/project/${this.config.projectKey}`);
    if (!response.ok) throw new Error(`Failed to fetch project: ${response.statusText}`);
    return response.json();
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    // Fetch assignable users for the project
    const response = await this.fetchFromJira(
      `/rest/api/3/user/assignable/search?project=${this.config.projectKey}`
    );
    
    if (!response.ok) throw new Error("Failed to fetch users");
    const users = await response.json();

    return users
      .filter((u: any) => u.accountType === 'atlassian') // Filter out app users if possible
      .map((u: any) => ({
        id: u.accountId,
        name: u.displayName,
        role: 'Developer', // Jira doesn't really have roles in this endpoint, defaulting
        avatar: u.avatarUrls['48x48'],
        capacityPerSprint: 10, // Default capacity, as Jira doesn't store this on the user object usually
        skills: []
      }));
  }

  async getSprints(): Promise<Sprint[]> {
    // First we need to find the board for the project. This is a heuristic.
    // We search for boards with the project name or key.
    const boardResp = await this.fetchFromJira(
      `/rest/agile/1.0/board?projectKeyOrId=${this.config.projectKey}`
    );
    
    if (!boardResp.ok) throw new Error("Failed to fetch boards");
    const boardData = await boardResp.json();
    
    if (boardData.values.length === 0) return [];
    
    // Use the first board found
    const boardId = boardData.values[0].id;

    const sprintResp = await this.fetchFromJira(
      `/rest/agile/1.0/board/${boardId}/sprint?state=active,future`
    );

    if (!sprintResp.ok) throw new Error("Failed to fetch sprints");
    const sprintData = await sprintResp.json();

    return sprintData.values.map((s: any) => ({
      id: s.id.toString(),
      name: s.name,
      startDate: s.startDate || new Date().toISOString(),
      endDate: s.endDate || new Date(Date.now() + 12096e5).toISOString(), // +14 days default
      state: s.state
    }));
  }

  async getIssues(): Promise<JiraIssue[]> {
    const jql = `project = ${this.config.projectKey} AND statusCategory != Done ORDER BY rank`;
    const response = await this.fetchFromJira(
      `/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,status,priority,issuetype,assignee,customfield_10016,sprint`
    );

    if (!response.ok) throw new Error("Failed to fetch issues");
    const data = await response.json();

    return data.issues.map((i: any) => {
      // Attempt to find story points. standard custom field is usually 10016 but varies by instance.
      // We look for a field that looks like a number in the raw fields if we could, but here we assume logic or 0.
      const storyPoints = i.fields.customfield_10016 || 0; 
      
      // Attempt to find sprint ID from custom fields if available, often hidden in array of strings
      // For this simplified version, we'll leave sprintId undefined unless explicitly found in a known spot
      // or if we iterate sprints and call getIssuesForSprint (which is slower but more accurate).
      // Let's stick to basic mapping.
      
      return {
        id: i.id,
        key: i.key,
        summary: i.fields.summary,
        type: mapIssueType(i.fields.issuetype?.name || ''),
        priority: mapPriority(i.fields.priority?.name || ''),
        status: mapStatus(i.fields.status?.name || '', i.fields.status?.statusCategory?.name),
        assigneeId: i.fields.assignee?.accountId || null,
        storyPoints: typeof storyPoints === 'number' ? storyPoints : 0,
        sprintId: undefined // Would require more complex parsing or separate API calls per sprint
      };
    });
  }
}