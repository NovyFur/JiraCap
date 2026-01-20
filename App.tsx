import { useState, useEffect } from 'react';
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
  Sparkles, RefreshCw, Database, Plug, LogOut
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
  
  // Initialize with saved data if connected, otherwise use defaults
  const [team, setTeam] = useState<TeamMember[]>(
    savedState?.isConnected ? savedState.team : INITIAL_TEAM
  );
  const [issues, setIssues] = useState<JiraIssue[]>(
    savedState?.isConnected ? savedState.issues : MOCK_ISSUES
  );
  const [sprints, setSprints] = useState<Sprint[]>(
    savedState?.isConnected ? savedState.sprints : INITIAL_SPRINTS
  );
  
  // Jira State
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(savedState?.isConnected || false);
  const [projectKey, setProjectKey] = useState<string>(savedState?.projectKey || "");

  // AI State
  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper to persist state
  const saveState = (data: { team: TeamMember[], issues: JiraIssue[], sprints: Sprint[], projectKey: string, isConnected: boolean }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  };

  // Jira Connection Handler
  const handleJiraConnect = async (config: JiraConfig) => {
    setIsConnecting(true);
    try {
      const service = new JiraService(config);
      await service.validateConnection();
      
      // If validation passes, fetch real data
      const [fetchedTeam, fetchedSprints, fetchedIssues] = await Promise.all([
        service.getTeamMembers(),
        service.getSprints(),
        service.getIssues()
      ]);

      setTeam(fetchedTeam);
      setSprints(fetchedSprints);
      setIssues(fetchedIssues);
      setProjectKey(config.projectKey);
      setIsConnected(true);
      setShowJiraModal(false);

      // Persist to local storage
      saveState({
        team: fetchedTeam,
        sprints: fetchedSprints,
        issues: fetchedIssues,
        projectKey: config.projectKey,
        isConnected: true
      });

      return true;
    } catch (error) {
      console.error("Connection error:", error);
      // Propagate error to JiraConnect component
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualImport = (data: { team: TeamMember[], issues: JiraIssue[], sprints: Sprint[] }) => {
    setTeam(data.team);
    setSprints(data.sprints);
    setIssues(data.issues);
    setProjectKey("MANUAL-IMPORT");
    setIsConnected(true);
    setShowJiraModal(false);

    // Persist to local storage
    saveState({
      team: data.team,
      sprints: data.sprints,
      issues: data.issues,
      projectKey: "MANUAL-IMPORT",
      isConnected: true
    });
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setTeam(INITIAL_TEAM);
    setIssues(MOCK_ISSUES);
    setSprints(INITIAL_SPRINTS);
    setProjectKey("");
    // Optionally clear analysis results as they might be stale
    setAnalysis(null);
    
    // Clear local storage
    localStorage.removeItem(STORAGE_KEY);
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
      setTeam(data.team);
      setIssues(data.issues);
      // Keep existing sprints for simplicity or generate them too if needed
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
                No team members found in the imported data.
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
           {!isConnected ? (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Connect to your Jira project to see real data.</p>
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
             <div className="bg-white p-3 rounded-lg border border-green-200 shadow-sm">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </div>
                    Jira Connected
                 </div>
                 <button 
                    onClick={handleDisconnect}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                    title="Disconnect Project"
                 >
                   <LogOut size={15} />
                 </button>
               </div>
               <p className="text-xs text-slate-500 truncate" title={projectKey}>
                 Project: {projectKey}
               </p>
             </div>
           )}
           
           <div className="text-xs text-center text-slate-400">
              v1.0.0
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
              {isConnected ? 'Displaying live data from Jira' : 'Viewing local mock data'}
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