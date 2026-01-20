import React, { useMemo } from 'react';
import { JiraIssue, TeamMember, Sprint, Status } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react';

interface DashboardProps {
  issues: JiraIssue[];
  team: TeamMember[];
  sprints: Sprint[];
}

export const Dashboard: React.FC<DashboardProps> = ({ issues, team, sprints }) => {
  
  const stats = useMemo(() => {
    const totalPoints = issues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
    const completedPoints = issues.filter(i => i.status === Status.DONE).reduce((acc, i) => acc + (i.storyPoints || 0), 0);
    const unassignedCount = issues.filter(i => !i.assigneeId).length;
    
    // Capacity Calculation
    const activeSprint = sprints.find(s => s.state === 'active');
    const totalSprintCapacity = activeSprint 
      ? team.reduce((acc, t) => acc + t.capacityPerSprint, 0)
      : 0;
      
    const activeSprintPoints = activeSprint
      ? issues.filter(i => i.sprintId === activeSprint.id).reduce((acc, i) => acc + i.storyPoints, 0)
      : 0;

    return { totalPoints, completedPoints, unassignedCount, totalSprintCapacity, activeSprintPoints };
  }, [issues, team, sprints]);

  const statusData = useMemo(() => {
    const counts = issues.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [issues]);

  const workloadData = useMemo(() => {
    return team
      .map(member => {
        const assignedPoints = issues
          .filter(i => i.assigneeId === member.id && i.status !== Status.DONE)
          .reduce((acc, i) => acc + i.storyPoints, 0);
        return {
          name: member.name.split(' ')[0],
          capacity: member.capacityPerSprint,
          assigned: assignedPoints
        };
      })
      .filter(member => member.assigned > 0);
  }, [issues, team]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
              <h3 className="text-2xl font-bold text-slate-900">~{Math.round(stats.totalPoints / sprints.length)}</h3>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Resource Utilization</h3>
          {workloadData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-12">
              <Users className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No active workloads to display</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="assigned" name="Assigned Points" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="capacity" name="Max Capacity" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Issue Status Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
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
      </div>
    </div>
  );
};