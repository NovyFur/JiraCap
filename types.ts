export enum IssueType {
  STORY = 'Story',
  BUG = 'Bug',
  TASK = 'Task',
  EPIC = 'Epic'
}

export enum Priority {
  HIGHEST = 'Highest',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum Status {
  TO_DO = 'To Do',
  IN_PROGRESS = 'In Progress',
  IN_REVIEW = 'In Review',
  DONE = 'Done'
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  type: IssueType;
  priority: Priority;
  status: Status;
  assigneeId: string | null;
  storyPoints: number;
  sprintId?: string;
  dueDate?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  capacityPerSprint: number; // in story points
  skills: string[];
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  state: 'active' | 'future' | 'closed';
}

export interface CapacitySnapshot {
  memberId: string;
  sprintId: string;
  assignedPoints: number;
  utilization: number; // percentage 0-100+
}

export interface GeminiAnalysisResult {
  summary: string;
  risks: string[];
  recommendations: string[];
  suggestedAllocations?: { issueKey: string; suggestedAssigneeId: string; reason: string }[];
}

export interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
  useProxy?: boolean;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  PLANNER = 'PLANNER',
  TEAM = 'TEAM',
  SETTINGS = 'SETTINGS'
}