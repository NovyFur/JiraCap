import { useState } from 'react';
import { 
  JiraIssue, TeamMember, Sprint, ViewMode, GeminiAnalysisResult, JiraConfig 
} from './types';
import { 
  INITIAL_TEAM, INITIAL_SPRINTS, MOCK_ISSUES 
} from './constants';
import { Dashboard } from './components/Dashboard';
import { CapacityPlanner } from './components/CapacityPlanner';
import { JiraConnect } from './components/JiraConnect';
import { AnalysisModal } from './components/AnalysisModal';
import { Button } from './components/Button';
import { analyzeCapacity, generateSampleData } from './services/geminiService';
import { JiraService } from './services/jiraService';
import { 
  LayoutDashboard, Calendar, Users, 
  Sparkles, RefreshCw, Database, Plug, X, Plus
} from 'lucide-react';

const STORAGE_KEY = 'jiracap_workspace_v1';

function App() {
  // Load saved state helper
  const getSavedState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to load saved state:', e);
      return null;
    }
  };

  const savedState = getSavedState();

  // Application State
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  
  // Initialize with saved data
  const [team, setTeam] = useState<TeamMember[]>(
    savedState?.team || INITIAL_TEAM
  );
  const [issues, setIssues] = useState<JiraIssue[]>(
    savedState?.issues || MOCK_ISSUES
  );
  const [sprints, setSprints] = useState<Sprint[]>(
    savedState?.sprints || INITIAL_SPRINTS
  );
  
  // Jira State
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Track connected projects as a list of keys
  const [projects, setProjects] = useState<string[]>(
    savedState?.projects || []
  );

  // AI State
  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper to persist state
  const saveState = (data: { team: TeamMember[], issues: JiraIssue[], sprints: Sprint[], projects: string[] }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  };

  const persistCurrentState = (
    newTeam: TeamMember[], 
    newIssues: JiraIssue[], 
    newSprints: Sprint[],
    newProjects: string[]
  ) => {
    saveState({
      team: newTeam,
      issues: newIssues,
      sprints: newSprints,
      projects: newProjects
    });
  };

  // Jira Connection Handler
  const handleJiraConnect = async (config: JiraConfig) => {
    if (projects.includes(config.projectKey)) {
      alert(`Project ${config.projectKey} is already connected.`);
      return false;
    }

    setIsConnecting(true);
    try {
      const service = new JiraService(config);
      await service.validateConnection();
      
      const [fetchedTeam, fetchedSprints, fetchedIssues] = await Promise.all([
        service.getTeamMembers(),
        service.getSprints(),
        service.getIssues()
      ]);

      // Tag data with project key
      const taggedIssues = fetchedIssues.map(i => ({ ...i, projectKey: config.projectKey }));
      const taggedSprints = fetchedSprints.map(s => ({ ...s, projectKey: config.projectKey }));

      // Merge Data
      const mergedProjects = [...projects, config.projectKey];
      
      // If this is the first project, replace mock data. Otherwise, append.
      // We check if we are currently using mock data (empty projects list usually means mock data if issues exist)
      // Actually, let's just use the projects array length.
      const isFirstProject = projects.length === 0;

      let nextTeam = isFirstProject ? [] : [...team];
      let nextIssues = isFirstProject ? [] : [...issues];
      let nextSprints = isFirstProject ? [] : [...sprints];

      // Merge Team (deduplicate by ID)
      const teamMap = new Map(nextTeam.map(m => [m.id, m]));
      fetchedTeam.forEach(m => teamMap.set(m.id, m));
      nextTeam = Array.from(teamMap.values());

      // Merge Issues and Sprints
      nextIssues = [...nextIssues, ...taggedIssues];
      nextSprints = [...nextSprints, ...taggedSprints];

      setTeam(nextTeam);
      setIssues(nextIssues);
      setSprints(nextSprints);
      setProjects(mergedProjects);
      
      setIsConnecting(false);
      setShowJiraModal(false);

      persistCurrentState(nextTeam, nextIssues, nextSprints, mergedProjects);

      return true;
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualImport = (data: { team: TeamMember[], issues: JiraIssue[], sprints: Sprint[] }) => {
    const manualKey = "MANUAL-IMPORT-" + (projects.length + 1);
    
    const taggedIssues = data.issues.map(i => ({ ...i, projectKey: manualKey }));
    const taggedSprints = data.sprints.map(s => ({ ...s, projectKey: manualKey }));

    const isFirstProject = projects.length === 0;

    let nextTeam = isFirstProject ? [] : [...team];
    let nextIssues = isFirstProject ? [] : [...issues];
    let nextSprints = isFirstProject ? [] : [...sprints];

    const teamMap = new Map(nextTeam.map(m => [m.id, m]));
    data.team.forEach(m => teamMap.set(m.id, m));
    nextTeam = Array.from(teamMap.values());

    nextIssues = [...nextIssues, ...taggedIssues];
    nextSprints = [...nextSprints, ...taggedSprints];
    const nextProjects = [...projects, manualKey];

    setTeam(nextTeam);
    setSprints(nextSprints);
    setIssues(nextIssues);
    setProjects(nextProjects);
    
    setShowJiraModal(false);

    persistCurrentState(nextTeam, nextIssues, nextSprints, nextProjects);
  };

  const handleRemoveProject = (projectKeyToRemove: string) => {
    const nextProjects = projects.filter(p => p !== projectKeyToRemove);
    const nextIssues = issues.filter(i => i.projectKey !== projectKeyToRemove);
    const nextSprints = sprints.filter(s => s.projectKey !== projectKeyToRemove);
    
    // We keep all team members for now to avoid complexity of checking who is left
    // But ideally we'd filter team members who no longer have assignments
    
    setProjects(nextProjects);
    setIssues(nextIssues);
    setSprints(nextSprints);

    // If no projects left, reset to defaults or empty? 
    // Let's reset to defaults if user clears everything so UI isn't empty
    if (nextProjects.length === 0) {
      setTeam(INITIAL_TEAM);
      setIssues(MOCK_ISSUES);
      setSprints(INITIAL_SPRINTS);
      persistCurrentState(INITIAL_TEAM, MOCK_ISSUES, INITIAL_SPRINTS, []);
      localStorage.removeItem(STORAGE_KEY);
    } else {
      setTeam(team); // keep team
      persistCurrentState(team, nextIssues, nextSprints, nextProjects);
    }
  };

  // AI Analysis Handler
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeCapacity(team, issues, sprints);
      setAnalysis(result);
      setShowAnalysisModal(true);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze capacity. Please check API key configuration.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate Sample Data Handler
  const handleGenerateData = async () => {
    setIsGenerating(true);
    try {
      const data = await generateSampleData("A modern e-commerce platform migration to microservices");
      
      // Treat generated data as a fresh start or add? 
      // For simplicity, generate replaces everything to give a clean demo state.
      setTeam(data.team);
      setIssues(data.issues);
      // Keep sprints simple
      setProjects([]); 
      localStorage.removeItem(STORAGE_KEY);
      
      alert("Sample data generated successfully!");
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate sample data.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case ViewMode.DASHBOARD:
        return <Dashboard issues={issues} team={team} sprints={sprints} />;
      case ViewMode.PLANNER:
        return <CapacityPlanner team={team} issues={issues} sprints={sprints} />;
      case ViewMode.TEAM:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold mb-4">Team Members</h2>
            {team.length === 0 ? (
              <div className="text-slate-500 text-center py-10">
                No team members found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {team.map(member => (
                  <div key={member.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`} alt={member.name} className="w-12 h-12 rounded-full" />
                    <div>
                      <div className="font-semibold text-slate-900">{member.name}</div>
                      <div className="text-sm text-slate-500">{member.role}</div>
                      <div className="text-xs text-slate-400 mt-1">Capacity: {member.capacityPerSprint} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return <div className="p-10 text-center text-slate-500">View not implemented</div>;
    }
  };

  const isConnected = projects.length > 0;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Database size={18} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">JiraCap</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setView(ViewMode.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === ViewMode.DASHBOARD ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button 
            onClick={() => setView(ViewMode.PLANNER)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === ViewMode.PLANNER ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Calendar size={18} />
            Capacity Planner
          </button>
          <button 
            onClick={() => setView(ViewMode.TEAM)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === ViewMode.TEAM ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Users size={18} />
            Team
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-3">
           <div className="flex items-center justify-between mb-2">
             <span className="text-xs font-semibold text-slate-500 uppercase">Projects</span>
             {isConnected && (
               <button 
                 onClick={() => setShowJiraModal(true)}
                 className="p-1 hover:bg-blue-50 text-blue-600 rounded"
                 title="Add another project"
               >
                 <Plus size={14} />
               </button>
             )}
           </div>
           
           {!isConnected ? (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Connect to your Jira projects to see real data.</p>
                <Button 
                  size="sm" 
                  className="w-full" 
                  variant="outline" 
                  icon={<Plug size={14} />}
                  onClick={() => setShowJiraModal(true)}
                >
                  Connect Jira
                </Button>
              </div>
           ) : (
             <div className="space-y-2">
               {projects.map(projKey => (
                 <div key={projKey} className="bg-white p-2 rounded-lg border border-green-200 shadow-sm flex items-center justify-between group">
                   <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>
                      <span className="text-xs font-medium text-slate-900 truncate" title={projKey}>{projKey}</span>
                   </div>
                   <button 
                      onClick={() => handleRemoveProject(projKey)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                      title="Remove Project"
                   >
                     <X size={14} />
                   </button>
                 </div>
               ))}
               
               <div className="pt-2 text-[10px] text-center text-slate-400">
                 {projects.length} connected project{projects.length !== 1 ? 's' : ''}
               </div>
             </div>
           )}
           
           <div className="mt-2 text-xs text-center text-slate-400">
              v1.1.0 Multi-Project
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {view === ViewMode.DASHBOARD && 'Dashboard Overview'}
              {view === ViewMode.PLANNER && 'Capacity Planning'}
              {view === ViewMode.TEAM && 'Team Management'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isConnected 
                ? `Analyzing ${projects.length} project${projects.length > 1 ? 's' : ''} (${issues.length} issues)` 
                : 'Viewing local mock data'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isConnected && (
              <Button 
                variant="secondary" 
                icon={<RefreshCw size={16} className={isGenerating ? "animate-spin" : ""} />}
                onClick={handleGenerateData}
                disabled={isGenerating}
                title="Generate Mock Data"
              >
                Generate Data
              </Button>
            )}
            <Button 
              variant="primary" 
              icon={<Sparkles size={16} />}
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20"
            >
              {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
            </Button>
          </div>
        </header>

        {renderContent()}
      </main>

      {/* Modals */}
      {showJiraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <JiraConnect 
            isLoading={isConnecting} 
            onConnect={handleJiraConnect} 
            onManualImport={handleManualImport}
            onCancel={() => setShowJiraModal(false)} 
          />
        </div>
      )}

      <AnalysisModal 
        isOpen={showAnalysisModal} 
        onClose={() => setShowAnalysisModal(false)} 
        result={analysis} 
      />
    </div>
  );
}

export default App;