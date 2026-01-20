import React, { useState, useMemo, useEffect } from 'react';
import { JiraIssue } from '../types';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { 
  DollarSign, AlertOctagon, Briefcase, Settings2, 
  Info 
} from 'lucide-react';

interface ClientProfitabilityProps {
  issues: JiraIssue[];
}

interface ClientData {
  id: string;
  name: string;
  hoursSpent: number;
  revenue: number;
  profitabilityIndex: number; // Revenue / Hour
}

const STORAGE_KEY = 'jiracap_revenue_data_v1';

export const ClientProfitability: React.FC<ClientProfitabilityProps> = ({ issues }) => {
  const [groupBy, setGroupBy] = useState<'project' | 'epic'>('epic');
  const [hourlyRate, setHourlyRate] = useState<number>(150); // Internal cost per hour
  
  // Persisted Revenue State
  const [revenueMap, setRevenueMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setRevenueMap(JSON.parse(saved));
    }
  }, []);

  const handleRevenueChange = (id: string, value: number) => {
    const newMap = { ...revenueMap, [id]: value };
    setRevenueMap(newMap);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
  };

  // Aggregation Logic
  const clientData: ClientData[] = useMemo(() => {
    const groups: Record<string, { name: string; seconds: number }> = {};

    issues.forEach(issue => {
      // Determine Group Key
      let key = 'Unknown';
      let name = 'Uncategorized';

      if (groupBy === 'project') {
        key = issue.projectKey || issue.key.split('-')[0];
        name = key;
      } else {
        // Group by Epic (Parent)
        if (issue.parentSummary) {
          key = issue.parentSummary;
          name = issue.parentSummary;
        } else if (issue.parentKey) {
          key = issue.parentKey;
          name = issue.parentKey;
        } else {
          // Fallback for independent tasks
          key = 'Independent Tasks';
          name = 'Independent Tasks';
        }
      }

      if (!groups[key]) {
        groups[key] = { name, seconds: 0 };
      }
      groups[key].seconds += issue.timeSpentSeconds;
    });

    return Object.entries(groups)
      .map(([key, data]) => {
        const hoursSpent = Math.round((data.seconds / 3600) * 10) / 10;
        const revenue = revenueMap[key] || 0;
        const profitabilityIndex = hoursSpent > 0 ? revenue / hoursSpent : 0;

        return {
          id: key,
          name: data.name,
          hoursSpent,
          revenue,
          profitabilityIndex
        };
      })
      .filter(d => d.hoursSpent > 0.1 || d.revenue > 0) // Filter out empty
      .sort((a, b) => b.revenue - a.revenue);
  }, [issues, groupBy, revenueMap]);

  // Chart Logic
  const maxHours = Math.max(...clientData.map(d => d.hoursSpent), 10);
  const maxRevenue = Math.max(...clientData.map(d => d.revenue), 1000);

  // Quadrant Identification
  const avgHours = maxHours / 2;
  const avgRevenue = maxRevenue / 2;

  const getQuadrant = (hours: number, rev: number) => {
    if (rev > avgRevenue && hours < avgHours) return { label: 'Cash Cow', color: '#10b981' }; // High Rev, Low Cost
    if (rev > avgRevenue && hours >= avgHours) return { label: 'Strategic Partner', color: '#3b82f6' }; // High Rev, High Cost
    if (rev <= avgRevenue && hours < avgHours) return { label: 'Standard', color: '#94a3b8' }; // Low Rev, Low Cost
    return { label: 'Drain / Noisy', color: '#ef4444' }; // Low Rev, High Cost
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Controls Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="text-green-600" />
            Client Profitability Matrix
          </h2>
          <p className="text-sm text-slate-500">
            Correlate time investment (Jira) with financial returns.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Group By:</span>
            <select 
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'project' | 'epic')}
              className="text-sm border-none bg-transparent font-semibold text-slate-900 focus:ring-0 cursor-pointer"
            >
              <option value="epic">Epic / Initiative</option>
              <option value="project">Project / Client</option>
            </select>
          </div>
          
          <div className="w-px h-6 bg-slate-200"></div>

          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Int. Rate:</span>
            <div className="flex items-center">
              <span className="text-sm text-slate-400 mr-1">$</span>
              <input 
                type="number" 
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-16 text-sm border-none bg-transparent font-semibold text-slate-900 focus:ring-0 text-right"
              />
              <span className="text-xs text-slate-400 ml-1">/hr</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scatter Plot */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Efficiency Map</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>High Profit</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Strategic</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>At Risk</div>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            {/* Quadrant Labels Background */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none z-0 opacity-10">
               <div className="border-r border-b border-slate-400 flex items-start justify-end p-2 font-bold uppercase tracking-widest text-slate-600">Standard</div>
               <div className="border-b border-slate-400 flex items-start justify-end p-2 font-bold uppercase tracking-widest text-red-600">Profit Drain</div>
               <div className="border-r border-slate-400 flex items-end justify-end p-2 font-bold uppercase tracking-widest text-green-600">Cash Cow</div>
               <div className="flex items-end justify-end p-2 font-bold uppercase tracking-widest text-blue-600">Strategic</div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="hoursSpent" 
                  name="Hours Spent" 
                  label={{ value: 'Hours Spent (Effort)', position: 'bottom', offset: 0, fill: '#64748b' }} 
                />
                <YAxis 
                  type="number" 
                  dataKey="revenue" 
                  name="Revenue" 
                  unit="$"
                  label={{ value: 'Revenue (Value)', angle: -90, position: 'insideLeft', fill: '#64748b' }} 
                />
                <ZAxis type="number" range={[100, 500]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const quadrant = getQuadrant(data.hoursSpent, data.revenue);
                      return (
                        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
                          <p className="font-bold text-slate-900 mb-1">{data.name}</p>
                          <div className="text-xs space-y-1">
                            <p className="text-slate-600">Revenue: <span className="font-mono font-medium">${data.revenue.toLocaleString()}</span></p>
                            <p className="text-slate-600">Hours: <span className="font-mono font-medium">{data.hoursSpent}h</span></p>
                            <p className="text-slate-600">Profit/Hr: <span className="font-mono font-medium text-green-600">${data.profitabilityIndex.toFixed(0)}</span></p>
                            <div className={`mt-2 inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white`} style={{ backgroundColor: quadrant.color }}>
                              {quadrant.label}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Quadrant Dividers */}
                <ReferenceLine x={avgHours} stroke="#94a3b8" strokeDasharray="5 5" />
                <ReferenceLine y={avgRevenue} stroke="#94a3b8" strokeDasharray="5 5" />
                
                <Scatter name="Clients" data={clientData}>
                  {clientData.map((entry, index) => {
                     const q = getQuadrant(entry.hoursSpent, entry.revenue);
                     return <Cell key={`cell-${index}`} fill={q.color} stroke="#fff" strokeWidth={2} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Table / Input */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-900">Revenue Data</h3>
            <p className="text-xs text-slate-500">Enter contract value for each item</p>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 bg-white sticky top-0">
                <tr>
                  <th className="text-left py-2 px-2">Client / Epic</th>
                  <th className="text-right py-2 px-2">Hrs</th>
                  <th className="text-right py-2 px-2">Revenue ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clientData.map(client => {
                   const cost = client.hoursSpent * hourlyRate;
                   const profit = client.revenue - cost;
                   const isNegative = profit < 0 && client.revenue > 0;
                   
                   return (
                    <tr key={client.id} className="group hover:bg-slate-50">
                      <td className="py-3 px-2">
                        <div className="font-medium text-slate-900 truncate max-w-[120px]" title={client.name}>
                          {client.name}
                        </div>
                        {client.revenue > 0 && (
                          <div className={`text-[10px] flex items-center gap-1 ${isNegative ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                            {isNegative && <AlertOctagon size={10} />}
                            {isNegative ? 'Loss Maker' : 'Profitable'}
                          </div>
                        )}
                      </td>
                      <td className="text-right px-2 text-slate-500 font-mono">
                        {client.hoursSpent.toFixed(0)}
                      </td>
                      <td className="text-right px-2">
                        <input
                          type="number"
                          className="w-20 text-right text-xs p-1 border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                          placeholder="0"
                          value={revenueMap[client.id] || ''}
                          onChange={(e) => handleRevenueChange(client.id, Number(e.target.value))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {clientData.length === 0 && (
              <div className="text-center py-10 px-4 text-slate-400">
                <Info className="mx-auto mb-2 opacity-50" />
                <p>No data found.</p>
                <p className="text-xs">Ensure issues have Time Spent logged and are assigned to an Epic or Project.</p>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 text-center">
            Calculated against internal rate of <strong>${hourlyRate}/hr</strong>
          </div>
        </div>
      </div>
    </div>
  );
};