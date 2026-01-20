import React, { useMemo } from 'react';
import { JiraIssue, TeamMember } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Clock, AlertTriangle, TrendingDown, CheckCircle2, DollarSign, ListFilter } from 'lucide-react';

interface TimeTrackingDashboardProps {
  issues: JiraIssue[];
  team: TeamMember[];
}

export const TimeTrackingDashboard: React.FC<TimeTrackingDashboardProps> = ({ issues, team }) => {
  
  // Helper to format seconds to hours (1 decimal)
  const toHours = (seconds: number) => Math.round((seconds / 3600) * 10) / 10;

  const stats = useMemo(() => {
    // We include all issues that have time logged or estimated
    const activeIssues = issues.filter(i => i.timeSpentSeconds > 0 || i.timeEstimateSeconds > 0);
    
    const totalSpent = activeIssues.reduce((acc, i) => acc + i.timeSpentSeconds, 0);
    const totalEstimate = activeIssues.reduce((acc, i) => acc + i.timeEstimateSeconds, 0);
    
    // Issues where spent > estimate
    const overBudgetIssues = activeIssues.filter(i => 
      i.timeEstimateSeconds > 0 && i.timeSpentSeconds > i.timeEstimateSeconds
    );

    const accuracy = totalEstimate > 0 ? (totalSpent / totalEstimate) * 100 : 0;

    return {
      totalSpentHours: toHours(totalSpent),
      totalEstimateHours: toHours(totalEstimate),
      accuracy: Math.round(accuracy),
      overBudgetCount: overBudgetIssues.length,
      overBudgetIssues: overBudgetIssues.sort((a, b) => 
        (b.timeSpentSeconds - b.timeEstimateSeconds) - (a.timeSpentSeconds - a.timeEstimateSeconds)
      )
    };
  }, [issues]);

  const assigneeData = useMemo(() => {
    return team.map(member => {
      const memberIssues = issues.filter(i => i.assigneeId === member.id);
      const spent = memberIssues.reduce((acc, i) => acc + i.timeSpentSeconds, 0);
      const estimate = memberIssues.reduce((acc, i) => acc + i.timeEstimateSeconds, 0);
      
      return {
        name: member.name.split(' ')[0], // First Name
        fullName: member.name,
        spent: toHours(spent),
        estimate: toHours(estimate),
        variance: toHours(spent - estimate)
      };
    }).filter(d => d.spent > 0 || d.estimate > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [issues, team]);

  const epicData = useMemo(() => {
    const epics: Record<string, { name: string, spent: number, estimate: number }> = {};
    
    issues.forEach(i => {
      // Use parent summary as Epic name, or fallback to "No Epic"
      const epicName = i.parentSummary || (i.parentKey ? i.parentKey : 'Uncategorized Work');
      
      if (!epics[epicName]) {
        epics[epicName] = { name: epicName, spent: 0, estimate: 0 };
      }
      epics[epicName].spent += i.timeSpentSeconds;
      epics[epicName].estimate += i.timeEstimateSeconds;
    });

    return Object.values(epics)
      .map(e => ({
        name: e.name,
        spent: toHours(e.spent),
        estimate: toHours(e.estimate),
        // Truncate name for chart
        shortName: e.name.length > 20 ? e.name.substring(0, 18) + '...' : e.name
      }))
      .filter(d => d.spent > 0 || d.estimate > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 8); // Top 8
  }, [issues]);

  const accuracyDistribution = useMemo(() => {
    let under = 0;
    let onTrack = 0;
    let over = 0;

    issues.filter(i => i.timeEstimateSeconds > 0).forEach(i => {
      const ratio = i.timeSpentSeconds / i.timeEstimateSeconds;
      if (ratio > 1.1) over++; // > 110%
      else if (ratio < 0.9 && i.status === 'Done') under++; // < 90% and done
      else onTrack++;
    });

    return [
      { name: 'Over Budget', value: over, color: '#ef4444' },
      { name: 'On Track', value: onTrack, color: '#10b981' },
      { name: 'Under Budget', value: under, color: '#3b82f6' }
    ];
  }, [issues]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Hours Logged</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.totalSpentHours}h</h3>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Across {issues.length} tracked issues
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Estimated Hours</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.totalEstimateHours}h</h3>
            </div>
            <div className="p-3 rounded-full bg-slate-100 text-slate-600">
              <ListFilter size={20} />
            </div>
          </div>
           <div className="mt-2 text-xs text-slate-500">
            Based on original estimates
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Estimate Accuracy</p>
              <h3 className={`text-2xl font-bold ${stats.accuracy > 110 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.accuracy}%
              </h3>
            </div>
            <div className={`p-3 rounded-full ${stats.accuracy > 110 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Actual Time / Estimated Time
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Cost Overruns</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.overBudgetCount}</h3>
            </div>
            <div className="p-3 rounded-full bg-orange-100 text-orange-600">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Issues exceeding time budget
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Estimated vs Actual by Assignee */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Time Consumption by Assignee</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={assigneeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" align="right" height={36}/>
              <Bar dataKey="estimate" name="Estimated (h)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spent" name="Actual Spent (h)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Epic/Category Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Time Spent by Epic / Initiative</h3>
           <ResponsiveContainer width="100%" height="85%">
            <BarChart layout="vertical" data={epicData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="shortName" type="category" width={100} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" align="right" height={36}/>
              <Bar dataKey="spent" name="Time Spent (h)" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accuracy Distribution & Risk Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pie Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[350px]">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Estimate Accuracy</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={accuracyDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {accuracyDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[350px]">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            <h3 className="text-lg font-semibold text-slate-900">Over-Budget Tasks</h3>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {stats.overBudgetIssues.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <CheckCircle2 size={40} className="mb-3 text-green-500 opacity-50" />
                <p className="text-sm font-medium text-slate-600">All tasks are within budget</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Task</th>
                    <th className="px-6 py-3">Assignee</th>
                    <th className="px-6 py-3 text-right">Est.</th>
                    <th className="px-6 py-3 text-right">Spent</th>
                    <th className="px-6 py-3 text-right text-red-600">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.overBudgetIssues.map(issue => {
                     const spentH = toHours(issue.timeSpentSeconds);
                     const estH = toHours(issue.timeEstimateSeconds);
                     const variance = (spentH - estH).toFixed(1);
                     
                     // Find assignee name
                     const assignee = team.find(t => t.id === issue.assigneeId)?.name || 'Unassigned';

                     return (
                      <tr key={issue.id} className="hover:bg-slate-50 group">
                        <td className="px-6 py-3">
                          <div className="flex flex-col">
                             <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 rounded">{issue.key}</span>
                                {issue.browserUrl ? (
                                  <a href={issue.browserUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-blue-600 truncate max-w-[200px]">{issue.summary}</a>
                                ) : (
                                  <span className="font-medium text-slate-900 truncate max-w-[200px]">{issue.summary}</span>
                                )}
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-600">
                           <div className="flex items-center gap-2">
                              {team.find(t => t.id === issue.assigneeId)?.avatar && (
                                <img src={team.find(t => t.id === issue.assigneeId)?.avatar} className="w-5 h-5 rounded-full" />
                              )}
                              <span className="truncate max-w-[100px]">{assignee}</span>
                           </div>
                        </td>
                        <td className="px-6 py-3 text-right text-slate-500">{estH}h</td>
                        <td className="px-6 py-3 text-right font-medium text-slate-900">{spentH}h</td>
                        <td className="px-6 py-3 text-right font-bold text-red-600">+{variance}h</td>
                      </tr>
                     );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
