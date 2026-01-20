import React from 'react';
import { JiraIssue, TeamMember, Sprint, Status } from '../types';
import { CheckCircle, Users } from 'lucide-react';

interface CapacityPlannerProps {
  team: TeamMember[];
  issues: JiraIssue[];
  sprints: Sprint[];
}

export const CapacityPlanner: React.FC<CapacityPlannerProps> = ({ team, issues }) => {
  // Helper to get assignee load
  const getMemberStats = (memberId: string) => {
    const memberIssues = issues.filter(i => i.assigneeId === memberId && i.status !== Status.DONE);
    const assignedPoints = memberIssues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
    return { assignedPoints, issueCount: memberIssues.length, issues: memberIssues };
  };

  const unassignedIssues = issues.filter(i => !i.assigneeId && i.status !== Status.DONE);

  // Filter team members who have active tasks
  const activeTeamMembers = team.filter(member => {
    const stats = getMemberStats(member.id);
    return stats.issueCount > 0;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Unassigned Backlog Column */}
      <div className="lg:col-span-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Unassigned Backlog</h3>
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
            {unassignedIssues.length}
          </span>
        </div>
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {unassignedIssues.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p>No unassigned issues</p>
            </div>
          ) : (
            unassignedIssues.map(issue => (
              <div key={issue.id} className="p-3 border border-slate-200 rounded-lg hover:shadow-md transition-shadow bg-white group cursor-move">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{issue.key}</span>
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    issue.priority === 'Highest' || issue.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {issue.priority}
                  </span>
                </div>
                <p className="text-sm text-slate-800 font-medium mb-2">{issue.summary}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center">
                     {issue.storyPoints} pts
                  </span>
                  <span className="text-xs text-slate-400">{issue.type}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Team Capacity Column */}
      <div className="lg:col-span-2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Active Workloads</h3>
          <span className="text-xs text-slate-500">
            {activeTeamMembers.length} active members
          </span>
        </div>
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {activeTeamMembers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-lg font-medium text-slate-600">No Active Workloads</p>
              <p className="text-sm">Assign tasks to team members to see their capacity utilization.</p>
            </div>
          ) : (
            activeTeamMembers.map(member => {
            const stats = getMemberStats(member.id);
            const utilization = Math.min(100, Math.round((stats.assignedPoints / member.capacityPerSprint) * 100));
            const isOverloaded = stats.assignedPoints > member.capacityPerSprint;

            return (
              <div key={member.id} className="border border-slate-200 rounded-xl p-4 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full border border-slate-200" />
                    <div>
                      <h4 className="font-medium text-slate-900">{member.name}</h4>
                      <p className="text-xs text-slate-500">{member.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${isOverloaded ? 'text-red-600' : 'text-slate-700'}`}>
                      {stats.assignedPoints} <span className="text-sm font-normal text-slate-400">/ {member.capacityPerSprint} pts</span>
                    </div>
                    <p className={`text-xs font-medium ${isOverloaded ? 'text-red-500' : 'text-green-600'}`}>
                      {utilization}% Capacity
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isOverloaded ? 'bg-red-500' : 'bg-blue-500'}`} 
                    style={{ width: `${utilization}%` }}
                  />
                </div>

                {/* Assigned Issues List (Mini) */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Assigned Tasks ({stats.issueCount})</h5>
                  {stats.issueCount === 0 ? (
                    <p className="text-xs text-slate-400 italic">No active tasks assigned.</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.issues.map(issue => (
                        <div key={issue.id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 shadow-sm text-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                             <span className="text-xs font-mono text-slate-400 shrink-0">{issue.key}</span>
                             <span className="truncate text-slate-700">{issue.summary}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded ml-2 shrink-0">{issue.storyPoints}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
};