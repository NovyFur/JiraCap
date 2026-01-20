import React, { useMemo } from 'react';
import { JiraIssue, TeamMember, Sprint, Status } from '../types';
import { 
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, Line, ReferenceLine 
} from 'recharts';
import { AlertCircle, CheckCircle2, Clock, Users, Flame, TrendingUp, AlertTriangle, Activity } from 'lucide-react';

interface DashboardProps {
  issues: JiraIssue[];
  team: TeamMember[];
  sprints: Sprint[];
}

export const Dashboard: React.FC<DashboardProps> = ({ issues, team, sprints }) => {
  
  const activeSprint = useMemo(() => sprints.find(s => s.state === 'active'), [sprints]);

  const stats = useMemo(() => {
    const totalPoints = issues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
    const completedPoints = issues.filter(i => i.status === Status.DONE).reduce((acc, i) => acc + (i.storyPoints || 0), 0);
    const unassignedCount = issues.filter(i => !i.assigneeId).length;
    
    // Capacity Calculation
    const totalSprintCapacity = activeSprint 
      ? team.reduce((acc, t) => acc + t.capacityPerSprint, 0)
      : 0;
      
    const activeSprintPoints = activeSprint
      ? issues.filter(i => i.sprintId === activeSprint.id).reduce((acc, i) => acc + i.storyPoints, 0)
      : 0;

    return { totalPoints, completedPoints, unassignedCount, totalSprintCapacity, activeSprintPoints };
  }, [issues, team, sprints, activeSprint]);

  const burnoutData = useMemo(() => {
    return team.map(member => {
      // 1. Calculate Active Load (Utilization)
      // Matches Capacity Planner: All issues assigned to user that are NOT Done.
      // This includes items in the active sprint AND items in the backlog/no-sprint assigned to them.
      const activeAssignedIssues = issues.filter(i => 
        i.assigneeId === member.id && 
        i.status !== Status.DONE
      );
      const activeAssignedPoints = activeAssignedIssues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);

      // 2. Calculate Completed Work (Realization)
      // Context: If there is an active sprint, only count items done in that sprint.
      // If no active sprint, count all done items (or 0). 
      // This keeps Realization relevant to the current timebox.
      const completedIssues = issues.filter(i => 
        i.assigneeId === member.id && 
        i.status === Status.DONE &&
        (activeSprint ? i.sprintId === activeSprint.id : true)
      );
      const completedPoints = completedIssues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);

      const capacity = member.capacityPerSprint;
      
      // Utilization = Active Load / Capacity
      const rawUtilization = capacity > 0 ? (activeAssignedPoints / capacity) * 100 : 0;
      const utilization = Math.min(rawUtilization, 120); 
      
      // Realization = Completed / (Active + Completed)
      // This represents progress against the total known scope for this user
      const totalScope = activeAssignedPoints + completedPoints;
      const realization = totalScope > 0 ? (completedPoints / totalScope) * 100 : 0;

      return {
        name: member.name.split(' ')[0], // First name only for chart space
        fullName: member.name,
        utilization: Math.round(utilization),
        rawUtilization: Math.round(rawUtilization),
        realization: Math.round(realization),
        assigned: activeAssignedPoints,
        capacity,
        isRisk: rawUtilization > 85
      };
    })
    .filter(d => d.assigned > 0 || d.realization > 0) // Show if they have active work OR completed work
    .sort((a, b) => b.rawUtilization - a.rawUtilization); 
  }, [issues, team, activeSprint]);

  const forecastData = useMemo(() => {
    // Ensure sprints are sorted by date
    const sortedSprints = [...sprints].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const totalTeamCapacity = team.reduce((acc, t) => acc + t.capacityPerSprint, 0);

    return sortedSprints.map(sprint => {
      const sprintLoad = issues
        .filter(i => i.sprintId === sprint.id)
        .reduce((acc, i) => acc + (i.storyPoints || 0), 0);
      
      return {
        name: sprint.name,
        capacity: totalTeamCapacity,
        workload: sprintLoad,
        isBreach: sprintLoad > totalTeamCapacity
      };
    });
  }, [sprints, issues, team]);

  const atRiskMembers = burnoutData.filter(d => d.isRisk);

  const statusData = useMemo(() => {
    const counts = issues.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [issues]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Sprint Health</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {stats.totalSprintCapacity > 0 ? Math.round((stats.activeSprintPoints / stats.totalSprintCapacity) * 100) : 0}%
              </h3>
            </div>
            <div className={`p-3 rounded-full ${stats.activeSprintPoints > stats.totalSprintCapacity ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats.activeSprintPoints} / {stats.totalSprintCapacity} pts utilized
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Unassigned Issues</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.unassignedCount}</h3>
            </div>
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Requires attention
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Completion Rate</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {issues.length > 0 ? Math.round((stats.completedPoints / stats.totalPoints) * 100) : 0}%
              </h3>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Based on story points
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Team Velocity</p>
              <h3 className="text-2xl font-bold text-slate-900">~{sprints.length > 0 ? Math.round(stats.totalPoints / sprints.length) : 0}</h3>
            </div>
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Avg pts per sprint
          </div>
        </div>
      </div>

      {/* Burnout Predictor Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk List */}
        <div className={`lg:col-span-1 p-6 rounded-xl shadow-sm border ${atRiskMembers.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-2 rounded-lg ${atRiskMembers.length > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
              <Flame size={20} />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${atRiskMembers.length > 0 ? 'text-red-900' : 'text-slate-900'}`}>Burnout Predictor</h3>
              <p className={`text-xs ${atRiskMembers.length > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                Monitoring utilization {'>'} 85%
              </p>
            </div>
          </div>

          {atRiskMembers.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-red-800 bg-red-100/50 p-3 rounded-md mb-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>High turnover risk detected. The following members are consistently over-utilized.</p>
              </div>
              {atRiskMembers.map(member => (
                <div key={member.name} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{member.fullName}</div>
                    <div className="text-xs text-slate-500">{member.assigned} pts assigned</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">{member.rawUtilization}%</div>
                    <div className="text-[10px] text-red-400 uppercase font-bold">Over Capacity</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
              <CheckCircle2 size={40} className="mb-3 text-green-500 opacity-50" />
              <p className="text-sm font-medium text-slate-600">Workload is Balanced</p>
              <p className="text-xs">No team members exceed 85% utilization.</p>
            </div>
          )}
        </div>

        {/* Utilization vs Realization Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Utilization vs. Realization</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-slate-300 rounded"></div>
                <span className="text-slate-500">Assigned Load</span>
              </div>
               <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-500">Work Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-red-500 border-t border-dashed border-red-500"></div>
                <span className="text-slate-500">85% Limit</span>
              </div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height="85%">
            <ComposedChart data={burnoutData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis unit="%" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="3 3" />
              <Bar dataKey="utilization" name="Utilization (Assigned/Cap)" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20}>
                 {burnoutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isRisk ? '#fca5a5' : '#cbd5e1'} />
                  ))}
              </Bar>
              <Line type="monotone" dataKey="realization" name="Realization (Done/Scope)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Capacity Forecast Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Capacity Forecast</h3>
              <p className="text-sm text-slate-500">Projected workload vs. total team capacity</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                  <div className="w-5 h-0.5 bg-red-500 border-t-2 border-dashed border-red-500"></div>
                  <span className="text-slate-600 font-medium">Capacity Threshold</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="text-slate-600 font-medium">Projected Workload</span>
              </div>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Story Points', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }} />
              <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
              />
              {/* Capacity Threshold Line */}
              <Line 
                  type="step" 
                  dataKey="capacity" 
                  name="Total Capacity"
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  dot={false} 
                  activeDot={false}
              />
              {/* Workload Line */}
              <Line 
                  type="monotone" 
                  dataKey="workload" 
                  name="Planned Workload"
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={(props: any) => {
                      // Custom dot that turns red if breaching
                      const { cx, cy, payload } = props;
                      const isBreach = payload.workload > payload.capacity;
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={4} 
                          stroke="#fff" 
                          strokeWidth={2} 
                          fill={isBreach ? "#ef4444" : "#2563eb"} 
                        />
                      );
                  }}
                  activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[300px]">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Issue Status Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
            <div className="p-4 bg-blue-50 rounded-full mb-4">
               <TrendingUp size={32} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Optimization Tips</h3>
            <p className="text-slate-600 max-w-sm">
              {stats.unassignedCount > 3 
                ? "You have a high number of unassigned issues. Consider running the AI Analysis to distribute the workload."
                : stats.activeSprintPoints > stats.totalSprintCapacity 
                  ? "The current sprint is overcommitted. Move low priority items to the next sprint to reduce burnout risk."
                  : "Team workload looks balanced. Focus on moving 'In Progress' items to 'In Review'."
              }
            </p>
        </div>
      </div>
    </div>
  );
};