import { TeamMember, Sprint, JiraIssue, IssueType, Priority, Status } from './types';

export const INITIAL_TEAM: TeamMember[] = [
  { id: 'u1', name: 'Alice Chen', role: 'Senior Frontend Dev', avatar: 'https://picsum.photos/32/32?random=1', capacityPerSprint: 20, skills: ['React', 'TypeScript', 'CSS'] },
  { id: 'u2', name: 'Bob Smith', role: 'Backend Engineer', avatar: 'https://picsum.photos/32/32?random=2', capacityPerSprint: 18, skills: ['Node.js', 'PostgreSQL', 'Redis'] },
  { id: 'u3', name: 'Charlie Kim', role: 'DevOps Engineer', avatar: 'https://picsum.photos/32/32?random=3', capacityPerSprint: 15, skills: ['AWS', 'Terraform', 'CI/CD'] },
  { id: 'u4', name: 'Dana Scully', role: 'Full Stack Dev', avatar: 'https://picsum.photos/32/32?random=4', capacityPerSprint: 25, skills: ['React', 'Python', 'Go'] },
];

export const INITIAL_SPRINTS: Sprint[] = [
  { id: 's1', name: 'Sprint 24', startDate: '2023-10-01', endDate: '2023-10-14', state: 'active' },
  { id: 's2', name: 'Sprint 25', startDate: '2023-10-15', endDate: '2023-10-28', state: 'future' },
  { id: 's3', name: 'Sprint 26', startDate: '2023-10-29', endDate: '2023-11-11', state: 'future' },
];

export const MOCK_ISSUES: JiraIssue[] = [
  { 
    id: 'i1', key: 'PROJ-101', summary: 'Implement Authentication Flow', 
    type: IssueType.STORY, priority: Priority.HIGH, status: Status.IN_PROGRESS, 
    assigneeId: 'u1', storyPoints: 8, sprintId: 's1',
    timeSpentSeconds: 14400, // 4h
    timeEstimateSeconds: 28800, // 8h
    parentKey: 'PROJ-99', parentSummary: 'User Security Overhaul'
  },
  { 
    id: 'i2', key: 'PROJ-102', summary: 'Database Schema Migration', 
    type: IssueType.TASK, priority: Priority.HIGHEST, status: Status.TO_DO, 
    assigneeId: 'u2', storyPoints: 5, sprintId: 's1',
    timeSpentSeconds: 0,
    timeEstimateSeconds: 18000, // 5h
    parentKey: 'PROJ-90', parentSummary: 'Backend Modernization'
  },
  { 
    id: 'i3', key: 'PROJ-103', summary: 'Fix memory leak in worker', 
    type: IssueType.BUG, priority: Priority.HIGH, status: Status.TO_DO, 
    assigneeId: 'u2', storyPoints: 3, sprintId: 's1',
    timeSpentSeconds: 0,
    timeEstimateSeconds: 7200, // 2h
    parentKey: 'PROJ-90', parentSummary: 'Backend Modernization'
  },
  { 
    id: 'i4', key: 'PROJ-104', summary: 'Setup Kubernetes Cluster', 
    type: IssueType.TASK, priority: Priority.MEDIUM, status: Status.IN_PROGRESS, 
    assigneeId: 'u3', storyPoints: 13, sprintId: 's1',
    timeSpentSeconds: 36000, // 10h
    timeEstimateSeconds: 28800, // 8h (Overrun!)
    parentKey: 'PROJ-80', parentSummary: 'Infrastructure Migration'
  },
  { 
    id: 'i5', key: 'PROJ-105', summary: 'Dashboard UI Revamp', 
    type: IssueType.STORY, priority: Priority.MEDIUM, status: Status.TO_DO, 
    assigneeId: null, storyPoints: 13, sprintId: 's2',
    timeSpentSeconds: 0,
    timeEstimateSeconds: 43200, // 12h
    parentKey: 'PROJ-100', parentSummary: 'Frontend Redesign v2'
  },
  { 
    id: 'i6', key: 'PROJ-106', summary: 'API Rate Limiting', 
    type: IssueType.STORY, priority: Priority.HIGH, status: Status.TO_DO, 
    assigneeId: null, storyPoints: 8, sprintId: 's2',
    timeSpentSeconds: 0,
    timeEstimateSeconds: 21600, // 6h
    parentKey: 'PROJ-99', parentSummary: 'User Security Overhaul'
  },
  // Added completed issues to show history in Time Tracking
  { 
    id: 'i7', key: 'PROJ-100', summary: 'Login Page CSS', 
    type: IssueType.STORY, priority: Priority.MEDIUM, status: Status.DONE, 
    assigneeId: 'u1', storyPoints: 3, sprintId: 's1',
    timeSpentSeconds: 10800, // 3h
    timeEstimateSeconds: 10800, // 3h
    parentKey: 'PROJ-100', parentSummary: 'Frontend Redesign v2'
  },
   { 
    id: 'i8', key: 'PROJ-98', summary: 'Configure Redis Cache', 
    type: IssueType.TASK, priority: Priority.LOW, status: Status.DONE, 
    assigneeId: 'u2', storyPoints: 2, sprintId: 's1',
    timeSpentSeconds: 5400, // 1.5h
    timeEstimateSeconds: 3600, // 1h (Small Overrun)
    parentKey: 'PROJ-90', parentSummary: 'Backend Modernization'
  }
];

export const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
