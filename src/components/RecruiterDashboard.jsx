import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Briefcase, 
  Calendar as CalendarIcon, 
  Trophy, 
  Search, 
  Filter, 
  List, 
  LayoutGrid, 
  FileText, 
  Download, 
  Trash2, 
  Brain, 
  Check, 
  X, 
  ChevronRight, 
  Clock, 
  Send, 
  Bot, 
  AlertCircle, 
  Plus, 
  Award, 
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  ArrowRight,
  Truck,
  Package,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DateTimePicker from './DateTimePicker';
import CalendarView from './CalendarView';

export default function RecruiterDashboard({ 
  candidates = [], 
  onUpdateCandidate, 
  onAddCandidate,
  courses = [],
  trainingRecords = [],
  onAssignCourse,
  onUpdateTrainingStatus,
  onAddCourse,
  onPurgeData,
  onExportCSV
}) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'board'
  
  // Selected candidate detail modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [candidateDetailTab, setCandidateDetailTab] = useState('profile'); // 'profile', 'screening', 'scorecard'
  
  // Scorecard state inside modal
  const [scorecard, setScorecard] = useState({
    punctuality: 5,
    attitude: 5,
    skillset: 5,
    culturalFit: 5
  });
  const [showScorecard, setShowScorecard] = useState(false);
  
  // Resume Screener state
  const [screenerParsing, setScreenerParsing] = useState(false);
  const [screenerResult, setScreenerResult] = useState(null);
  const [screenerFile, setScreenerFile] = useState(null);
  
  // Copilot state
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotMessages, setCopilotMessages] = useState([
    { id: 1, sender: 'assistant', text: "Hello! I am your AI Recruiter Copilot. Ask me questions about the applicant pipeline, search for specific skillsets, or let me draft offer and invitation letters." }
  ]);
  const [copilotTyping, setCopilotTyping] = useState(false);

  // Training management state
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null); // { name, email } for assigning or viewing
  const [newCourse, setNewCourse] = useState({
    name: '',
    type: 'PDF',
    required: false,
    description: '',
    content_url: '',
    video_url: '',
    minimum_time_seconds: 180,
    estimated_duration_minutes: 5
  });

  // Calculate stats
  const stats = useMemo(() => {
    const total = candidates.length;
    const pending = candidates.filter(c => c.status === 'Pending').length;
    const interviewing = candidates.filter(c => c.status === 'Interviewing' || c.rescheduleRequested).length;
    const hired = candidates.filter(c => c.status === 'Hired').length;
    
    // Average Match Score
    const totalScore = candidates.reduce((acc, c) => acc + (c.skillsScore || 80), 0);
    const avgScore = total > 0 ? Math.round(totalScore / total) : 0;
    
    return { total, pending, interviewing, hired, avgScore };
  }, [candidates]);

  // Unique roles in applications
  const uniqueRoles = useMemo(() => {
    const roles = new Set(candidates.map(c => c.jobType || c.position).filter(Boolean));
    return ['All', ...Array.from(roles)];
  }, [candidates]);

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter(cand => {
      const matchSearch = searchTerm === '' || 
        (cand.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cand.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cand.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cand.jobType || cand.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cand.specificRole || '').toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchRole = roleFilter === 'All' || (cand.jobType || cand.position) === roleFilter;
      const matchStatus = statusFilter === 'All' || cand.status === statusFilter;
      
      return matchSearch && matchRole && matchStatus;
    }).sort((a, b) => new Date(b.submittedDate || 0) - new Date(a.submittedDate || 0));
  }, [candidates, searchTerm, roleFilter, statusFilter]);

  // Handle status update
  const handleUpdateStatus = async (id, status, additional = {}) => {
    if (onUpdateCandidate) {
      await onUpdateCandidate(id, status, additional);
      // Update local copy if selectedCandidate is open
      if (selectedCandidate && selectedCandidate.id === id) {
        setSelectedCandidate(prev => ({ ...prev, status, ...additional }));
      }
    }
  };

  // Recent activities list
  const recentActivities = useMemo(() => {
    return candidates
      .slice(0, 5)
      .map(c => {
        let title = '';
        let desc = '';
        let icon = <FileText size={18} />;
        let color = 'blue';
        
        if (c.status === 'Hired') {
          title = `${c.fullName} was marked as Hired`;
          desc = `Assigned to ${c.jobType || 'Warehouse Associate'} at ${c.preferredLocation || 'Charlotte, NC'}.`;
          icon = <Trophy size={18} />;
          color = 'green';
        } else if (c.status === 'Interviewing') {
          title = `Interview scheduled for ${c.fullName}`;
          desc = c.interviewDate 
            ? `Set for ${new Date(c.interviewDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.`
            : `Interview invitation sent.`;
          icon = <CalendarIcon size={18} />;
          color = 'orange';
        } else if (c.status === 'Rejected') {
          title = `${c.fullName}'s application was archived`;
          desc = `Sent rejection notification email.`;
          icon = <Archive size={18} />;
          color = 'red';
        } else {
          title = `New application from ${c.fullName}`;
          desc = `Applied for ${c.jobType || 'Cataloger'} (${c.preferredLocation || 'Monroe, NC'}). Match Score: ${c.skillsScore || 85}%`;
          icon = <Mail size={18} />;
          color = 'blue';
        }
        
        return {
          id: c.id,
          title,
          desc,
          icon,
          color,
          time: c.submittedDate ? new Date(c.submittedDate).toLocaleDateString() : 'Recently'
        };
      });
  }, [candidates]);

  // Dummy resume parser templates
  const dummyResumes = [
    {
      name: "Marcus Vance",
      email: "marcus.v@example.com",
      phone: "704-555-8833",
      role: "Forklift Operator / Warehouse Logistics",
      skills: ["OSHA Certified Forklift", "Pallet Grid Layouts", "LTL Freight Loads", "Distribution Management", "Inventory Flow Controls"],
      resumeText: "Certified Forklift Specialist with 5 years managing dock traffic, freight bills of lading, and stand-up reach forklift operations. Team safety supervisor champion.",
      aiReport: {
        summary: "Top tier logistics operator. Direct experience loading high racks, forklift maintenance, and inventory flow controls. High safety consciousness.",
        strengths: ["OSHA certified standard forklift + standup reach", "5 years experience", "Strong supervisor recommendations"],
        weaknesses: ["Seeking only late-night shift rotation", "High salary requirements"],
        opportunities: ["Can lead shift operations safety training programs", "Optimize bay distribution metrics"],
        threats: ["Very high market competitiveness, multiple active offers"]
      },
      aiScore: 94
    },
    {
      name: "Rebecca Flores",
      email: "r.flores@example.com",
      phone: "980-555-1100",
      role: "Product Cataloger & Grader",
      skills: ["E-commerce Cataloging", "Product Photography", "Consumer Electronics Grading", "Detailed Audit Pro", "Excel & Shopify"],
      resumeText: "Detail obsessed catalog listings specialist. Managed product descriptions, verified components for returns center, and coordinated photography setups.",
      aiReport: {
        summary: "Excellent candidate for detailed returns screening. Strong eye for product authentication and accessory completeness checks.",
        strengths: ["Expert returns grading background", "Professional grade camera equipment skills", "Very high typing speed (80 WPM)"],
        weaknesses: ["Limited heavy lifting experience", "Prefers sedentary workspaces"],
        opportunities: ["Can speed up technology listing queues", "Catalog description quality template designer"],
        threats: ["May request desk workspace accommodations if catalog queue transfers to active floor"]
      },
      aiScore: 91
    }
  ];

  const handleSimulatedUpload = (idx) => {
    setScreenerParsing(true);
    setScreenerResult(null);
    setScreenerFile(dummyResumes[idx]);

    setTimeout(() => {
      setScreenerParsing(false);
      setScreenerResult(dummyResumes[idx]);
    }, 1500);
  };

  const handleAddScreenerCandidate = async () => {
    if (!screenerResult || !onAddCandidate) return;
    
    const newCand = {
      name: screenerResult.name,
      email: screenerResult.email,
      phone: screenerResult.phone,
      appliedRole: screenerResult.role,
      status: 'Pending',
      resumeText: screenerResult.resumeText,
      notes: `Parsed via AI Resume Screener. AI Compatibility: ${screenerResult.aiScore}%`
    };

    await onAddCandidate(newCand);
    setScreenerResult(null);
    setScreenerFile(null);
    setActiveTab('applicants');
  };

  // Copilot Chat message handling
  const handleCopilotSend = (e) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: copilotInput };
    setCopilotMessages(prev => [...prev, userMsg]);
    const query = copilotInput.toLowerCase();
    setCopilotInput('');
    setCopilotTyping(true);

    setTimeout(() => {
      let reply = "I can analyze active applicants. Let me know if you want to find forklift experience, check high cataloger scores, or draft emails.";
      
      if (query.includes('forklift') || query.includes('operator') || query.includes('logistics')) {
        const matching = candidates.filter(c => 
          (c.fullName || '').toLowerCase().includes('kim') || 
          (c.previousExperience || '').toLowerCase().includes('forklift') ||
          (c.jobType || '').toLowerCase().includes('forklift')
        );
        
        reply = `Here are the candidates with forklift or logistics experience in your database:
${matching.length > 0 
  ? matching.map(c => `- **${c.fullName}** (${c.status} - Applied for ${c.jobType})`).join('\n')
  : '- No matching candidates found in the live pipeline. Try uploading Marcus Vance in the Screener tab!'
}
Would you like me to draft an interview invite or suggest screening questions?`;
      } 
      else if (query.includes('cataloger') || query.includes('grader') || query.includes('score')) {
        const catalogers = candidates.filter(c => 
          (c.jobType || '').toLowerCase().includes('cataloger') || 
          (c.position || '').toLowerCase().includes('cataloger')
        );
        reply = `Product Cataloger candidates ranked by application status:
${catalogers.length > 0
  ? catalogers.map((c, i) => `${i + 1}. **${c.fullName}** (${c.status} - Score: ${c.skillsScore || 85}%)`).join('\n')
  : '- No catalogers currently in the pipeline.'
}
Would you like to draft a screening invitation?`;
      }
      else if (query.includes('draft') || query.includes('email') || query.includes('letter')) {
        const namedCand = candidates.find(c => query.includes((c.fullName || '').toLowerCase().split(' ')[0]));
        const candidateName = namedCand ? namedCand.fullName : "[Candidate Name]";
        const candidateRole = namedCand ? namedCand.jobType : "[Role Name]";
        
        reply = `Here is a custom draft email invite for ${candidateName}:
        
Subject: Interview Invitation: ${candidateRole} at Vista Auction

Dear ${candidateName},

Thank you for your application to Vista Auction. We were highly impressed by your experience and would love to schedule a 30-minute interview at our Charlotte warehouse facility.

Please choose a convenient slot here: [Insert Scheduling Link]

Best regards,
Vista Auction HR Team`;
      }

      setCopilotMessages(prev => [...prev, { id: Date.now() + 1, sender: 'assistant', text: reply }]);
      setCopilotTyping(false);
    }, 1000);
  };

  // Add training course
  const handleAddNewCourse = () => {
    if (!newCourse.name.trim()) return;
    if (onAddCourse) {
      onAddCourse({
        id: Date.now().toString(),
        ...newCourse
      });
      setNewCourse({
        name: '',
        type: 'PDF',
        required: false,
        description: '',
        content_url: '',
        video_url: '',
        minimum_time_seconds: 180,
        estimated_duration_minutes: 5
      });
      setShowAddCourseModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b18] text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#0c1226] border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        
        {/* Logo/Branding */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-[#070b18] font-black text-xl shadow-lg shadow-orange-500/20">
            V
          </div>
          <div>
            <h1 className="font-extrabold tracking-tight text-white font-display text-md">Vista Recruiting</h1>
            <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">HR CONTROL PANEL</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 flex-grow space-y-1">
          {[
            { id: 'overview', label: 'Overview', icon: <Briefcase size={18} /> },
            { id: 'applicants', label: 'Applicants', icon: <Users size={18} />, badge: stats.pending },
            { id: 'calendar', label: 'Calendar', icon: <CalendarIcon size={18} />, badge: stats.interviewing },
            { id: 'training', label: 'Training Portal', icon: <Award size={18} /> },
            { id: 'screener', label: 'Resume Screener', icon: <FileText size={18} /> },
            { id: 'copilot', label: 'AI Recopilot', icon: <Bot size={18} /> }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-bold text-sm ${
                activeTab === item.id 
                  ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/5 text-orange-400 border-l-4 border-orange-500 shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="text-[10px] font-black bg-orange-600/30 border border-orange-500/40 text-orange-400 px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0a0f20]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-sm shadow-inner">
              HR
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-200 truncate">Vista Recruiter</p>
              <p className="text-[9px] font-bold text-slate-500 truncate">admin@vistaauction.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow p-6 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto min-h-screen">
        
        {/* TOP STATUS HEADER BAR */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-8 mb-8 border-b border-slate-800 gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white font-display">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Control
            </h2>
            <p className="text-slate-400 text-xs font-semibold tracking-wide mt-1 uppercase text-slate-500">
              Vista Auction Talent & Employee Onboarding Platform
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#0d1226]/40 p-1.5 rounded-xl border border-slate-800 backdrop-blur-sm self-start md:self-auto">
            <button 
              onClick={onPurgeData} 
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
            >
              <Trash2 size={12} /> Purge
            </button>
            <button 
              onClick={onExportCSV} 
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 transition-all border border-transparent hover:border-orange-500/20"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        </header>

        {/* TAB PANELS */}
        <div className="w-full">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Applicants', val: stats.total, color: 'blue', desc: 'Active & archived talent', icon: <Users size={20} /> },
                  { label: 'Pending Screen', val: stats.pending, color: 'orange', desc: 'Awaiting HR action', icon: <Briefcase size={20} /> },
                  { label: 'Active Interviews', val: stats.interviewing, color: 'purple', desc: 'Scheduled calendar roadmap', icon: <CalendarIcon size={20} /> },
                  { label: 'Average Match', val: `${stats.avgScore}%`, color: 'green', desc: 'AI profile evaluation average', icon: <Brain size={20} /> }
                ].map((m, idx) => (
                  <div key={idx} className="bg-[#0c1226]/60 border border-slate-800 p-6 rounded-2xl flex justify-between items-start hover:border-slate-700/60 transition-all duration-300 shadow-lg">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{m.label}</p>
                      <h3 className="text-3xl font-black text-white font-display">{m.val}</h3>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">{m.desc}</p>
                    </div>
                    <div className={`p-3 rounded-xl bg-slate-800 text-slate-300`}>
                      {m.icon}
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Activity Feed */}
                <div className="lg:col-span-2 bg-[#0c1226]/40 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                  <h4 className="text-lg font-black text-white font-display">Recent Activity Log</h4>
                  
                  <div className="space-y-4">
                    {recentActivities.map((act) => (
                      <div key={act.id} className="flex gap-4 items-start p-4 bg-[#0a0f20]/60 rounded-2xl border border-slate-800/40">
                        <div className="p-2.5 bg-slate-800/40 rounded-xl text-slate-300 flex items-center justify-center">{act.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-bold text-slate-200 truncate">{act.title}</h5>
                          <p className="text-xs text-slate-400 mt-0.5">{act.desc}</p>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{act.time}</span>
                      </div>
                    ))}
                    {recentActivities.length === 0 && (
                      <p className="text-center text-slate-500 py-10 font-bold text-sm">No recent activity detected.</p>
                    )}
                  </div>
                </div>

                {/* Logistics Stats */}
                <div className="bg-[#0c1226]/40 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-lg font-black text-white font-display">Logistics Performance</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      On-site efficiency audit metrics for active warehouse operations centers in Monroe and Charlotte.
                    </p>
                    <div className="space-y-3 mt-6">
                      {[
                        { label: 'Charlotte Sorting Target', pct: 98, color: 'from-orange-500 to-amber-400' },
                        { label: 'Monroe Inventory Audit', pct: 89, color: 'from-blue-500 to-indigo-400' },
                        { label: 'Average Onboarding Speed', pct: 94, color: 'from-green-500 to-emerald-400' }
                      ].map((bar, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <span>{bar.label}</span>
                            <span className="text-white">{bar.pct}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${bar.color}`} style={{ width: `${bar.pct}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-8 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="text-orange-400 shrink-0" size={20} />
                    <p className="text-[10px] font-bold text-orange-300 leading-normal">
                      Safety compliance audit is scheduled next Tuesday for Monroe center. Assign courses to new hires.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: APPLICANTS PIPELINE */}
          {activeTab === 'applicants' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Filter controls row */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0c1226]/40 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
                
                {/* Search input */}
                <div className="flex items-center gap-2 bg-[#090e1c] px-4 py-2.5 rounded-xl border border-slate-800 w-full md:max-w-md shadow-inner">
                  <Search size={18} className="text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search candidate directory..."
                    className="bg-transparent border-none outline-none text-slate-200 text-sm font-bold w-full placeholder-slate-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Dropdowns & View toggles */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  
                  {/* Status stage filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#090e1c] text-slate-300 border border-slate-850 px-4 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="All">All Stages</option>
                    <option value="Pending">Pending Screen</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Interviewing">Interviewing</option>
                    <option value="Hired">Hired</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  {/* Role filter */}
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-[#090e1c] text-slate-300 border border-slate-850 px-4 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="All">All Positions</option>
                    {uniqueRoles.filter(r => r !== 'All').map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>

                  {/* View mode toggle */}
                  <div className="flex bg-[#090e1c] p-0.5 rounded-xl border border-slate-850">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <List size={16} />
                    </button>
                    <button 
                      onClick={() => setViewMode('board')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>

                </div>
              </div>

              {/* VIEW: BOARD VIEW (Kanban) */}
              {viewMode === 'board' ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
                  {['Pending', 'Accepted', 'Interviewing', 'Hired', 'Rejected'].map(stage => {
                    const stageCandidates = filteredCandidates.filter(c => c.status === stage);
                    return (
                      <div key={stage} className="bg-[#0c1226]/40 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                          <span className="text-xs font-black uppercase text-slate-300 tracking-widest">{stage}</span>
                          <span className="text-[10px] font-black bg-slate-850 text-slate-400 px-2 py-0.5 rounded-md">{stageCandidates.length}</span>
                        </div>

                        <div className="space-y-3 flex-grow overflow-y-auto">
                          {stageCandidates.map(c => (
                            <div
                              key={c.id}
                              onClick={() => setSelectedCandidate(c)}
                              className="bg-[#0a0f20]/80 p-4 rounded-xl border border-slate-850 hover:border-slate-700 hover:bg-[#0c1328] transition-all cursor-pointer shadow-md group"
                            >
                              <h5 className="font-bold text-sm text-slate-200 group-hover:text-orange-400 transition-colors">{c.fullName}</h5>
                              <p className="text-[10px] text-slate-400 mt-1 truncate">{c.jobType || c.position}</p>
                              
                              <div className="flex items-center justify-between mt-4">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                                  (c.skillsScore || 80) >= 90 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                }`}>
                                  {c.skillsScore || 80}% Fit
                                </span>
                                <span className="text-[9px] text-slate-500">{new Date(c.submittedDate).toLocaleDateString([], {month: 'short', day: 'numeric'})}</span>
                              </div>
                            </div>
                          ))}
                          {stageCandidates.length === 0 && (
                            <div className="text-center py-10 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                              Empty Column
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* VIEW: LIST VIEW */
                <div className="bg-[#0c1226]/40 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-850 bg-[#090e1c] text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <th className="p-5">Applicant</th>
                          <th className="p-5">Applied Position</th>
                          <th className="p-5">AI Fit Score</th>
                          <th className="p-5">Pipeline Stage</th>
                          <th className="p-5">Date Submitted</th>
                          <th className="p-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {filteredCandidates.map(c => (
                          <tr key={c.id} className="hover:bg-[#0a0f20]/45 transition-colors group">
                            <td className="p-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-white text-sm shadow-inner">
                                  {c.fullName ? c.fullName[0] : 'U'}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-slate-200 group-hover:text-orange-400 transition-colors">{c.fullName}</h4>
                                  <p className="text-xs text-slate-400 mt-0.5">{c.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-5">
                              <div className="space-y-1">
                                <span className="text-sm font-semibold text-slate-300">{c.jobType || c.position}</span>
                                <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-bold">{c.preferredLocation || 'Monroe, NC'}</span>
                              </div>
                            </td>
                            <td className="p-5">
                              <div className="flex items-center gap-2">
                                <Brain size={14} className="text-orange-500" />
                                <span className={`text-sm font-black ${
                                  (c.skillsScore || 80) >= 90 ? 'text-green-400' : 'text-orange-400'
                                }`}>
                                  {c.skillsScore || 80}% Match
                                </span>
                              </div>
                            </td>
                            <td className="p-5">
                              <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                c.status === 'Hired' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                c.status === 'Interviewing' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                c.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="p-5 text-sm text-slate-400 font-semibold">
                              {c.submittedDate ? new Date(c.submittedDate).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                            </td>
                            <td className="p-5 text-right">
                              <button
                                onClick={() => setSelectedCandidate(c)}
                                className="bg-[#0a0f20]/80 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white hover:border-orange-500 transition-all shadow-sm"
                              >
                                View File
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredCandidates.length === 0 && (
                          <tr>
                            <td colSpan="6" className="text-center p-12 text-slate-500 font-bold text-sm">
                              No candidates found matching the filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: CALENDAR VIEW */}
          {activeTab === 'calendar' && (
            <div className="bg-[#0c1226]/40 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
              <CalendarView 
                applications={candidates} 
                onSelectApp={(app) => {
                  setSelectedCandidate(app);
                  setActiveTab('applicants');
                }} 
              />
            </div>
          )}

          {/* TAB 4: TRAINING PORTAL */}
          {activeTab === 'training' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Courses Library */}
              <div className="bg-[#0c1226]/40 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-white font-display">Required Employee Training</h3>
                    <p className="text-xs text-slate-400 mt-1">Standardized onboarding & safety courses for hired staff.</p>
                  </div>
                  <button
                    onClick={() => setShowAddCourseModal(true)}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-[#070b18] px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    <Plus size={16} /> Add Course
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {courses.map(course => (
                    <div key={course.id} className="bg-[#0a0f20] border border-slate-850 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg group">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded tracking-widest uppercase ${
                            course.type === 'PDF' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}>
                            {course.type}
                          </span>
                          {course.required && (
                            <span className="text-[8px] font-black bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase tracking-wider">Required</span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-white text-base group-hover:text-orange-400 transition-colors font-display tracking-tight leading-snug">{course.name}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{course.description || 'No description provided.'}</p>
                      </div>
                      
                      <div className="pt-6 mt-6 border-t border-slate-850 flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-bold">{course.estimated_duration_minutes || 5} min read</span>
                        <button
                          onClick={() => setSelectedEmployee({ course })}
                          className="text-[10px] font-black uppercase tracking-widest text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          <span className="inline-flex items-center gap-1">Assign Course <ArrowRight size={12} /></span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee list with training tracking */}
              <div className="bg-[#0c1226]/40 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                <div>
                  <h3 className="text-xl font-black text-white font-display">Employee Training Logs</h3>
                  <p className="text-xs text-slate-400 mt-1">Audit status, completion dates, and assigned workflows for staff.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-850 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <th className="pb-4">Employee</th>
                        <th className="pb-4">Assigned Course</th>
                        <th className="pb-4">Status</th>
                        <th className="pb-4">Assigned Date</th>
                        <th className="pb-4">Completion Date</th>
                        <th className="pb-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60">
                      {trainingRecords.map(record => (
                        <tr key={record.id} className="hover:bg-[#0a0f20]/20 transition-colors">
                          <td className="py-4 font-bold text-sm text-slate-200">{record.employee_name}</td>
                          <td className="py-4">
                            <span className="text-sm font-semibold text-slate-300">{record.course_name}</span>
                            <span className="text-[9px] text-slate-500 block uppercase tracking-wider mt-0.5 font-black">{record.course_type}</span>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              record.status === 'Completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              record.status === 'In Progress' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                              'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="py-4 text-xs text-slate-400 font-semibold">
                            {new Date(record.assigned_date).toLocaleDateString()}
                          </td>
                          <td className="py-4 text-xs text-slate-400 font-semibold">
                            {record.completed_date ? new Date(record.completed_date).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-4 text-right">
                            {record.status !== 'Completed' && (
                              <button
                                onClick={() => onUpdateTrainingStatus(record.id, 'Completed')}
                                className="text-[10px] font-black uppercase tracking-widest bg-green-600/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg hover:bg-green-600 hover:text-white hover:border-green-600 transition-all"
                              >
                                Mark Complete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {trainingRecords.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-slate-500 font-bold text-sm">
                            No training records on file. Assign a course to start tracking.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: RESUME SCREENER */}
          {activeTab === 'screener' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="max-w-3xl">
                <h3 className="text-xl font-black text-white font-display">AI Resume Screening Sandbox</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Evaluate alignment, parse core skillsets, and construct SWOT screening profiles. Select a mock candidate to run the resume parser.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Upload Section */}
                <div className="bg-[#0c1226]/40 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                  <h4 className="text-base font-black text-white font-display uppercase tracking-widest">Mock Upload Simulator</h4>
                  
                  {/* Dashed Dropzone */}
                  <div className="border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4 bg-[#080d1c]/40 hover:border-orange-500/30 transition-all cursor-pointer">
                    <div className="w-16 h-16 bg-[#0a0f20] rounded-2xl border border-slate-850 flex items-center justify-center text-slate-500">
                      <FileText size={28} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-300">Drag and drop applicant resumes here</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Accepts PDF, DOCX, TXT up to 5MB</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Mock Profile to Parse:</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleSimulatedUpload(0)}
                        className="w-full flex items-center justify-between p-4 bg-[#0a0f20] border border-slate-850 rounded-2xl hover:border-orange-500/40 hover:bg-[#0c1226]/80 text-left transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl text-slate-300 flex items-center justify-center"><Truck size={20} /></span>
                          <div>
                            <h5 className="font-bold text-sm text-slate-200">Marcus Vance</h5>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Forklift Specialist | Logistics</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-500" />
                      </button>

                      <button
                        onClick={() => handleSimulatedUpload(1)}
                        className="w-full flex items-center justify-between p-4 bg-[#0a0f20] border border-slate-850 rounded-2xl hover:border-orange-500/40 hover:bg-[#0c1226]/80 text-left transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl text-slate-300 flex items-center justify-center"><Package size={20} /></span>
                          <div>
                            <h5 className="font-bold text-sm text-slate-200">Rebecca Flores</h5>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Product Cataloger | E-commerce</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-500" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Diagnostics Panel */}
                <div className="bg-[#0c1226]/40 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl min-h-[450px] flex flex-col justify-between">
                  <div className="space-y-6">
                    <h4 className="text-base font-black text-white font-display uppercase tracking-widest">Screening Output Details</h4>
                    
                    {screenerParsing && (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-black text-orange-400 uppercase tracking-widest">Running AI parser rules...</p>
                      </div>
                    )}

                    {!screenerParsing && !screenerResult && (
                      <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                        <Brain size={48} className="text-slate-700 mb-4" />
                        <p className="text-xs font-bold uppercase tracking-widest">Awaiting upload diagnostics trigger</p>
                      </div>
                    )}

                    {!screenerParsing && screenerResult && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                          <div>
                            <h3 className="text-xl font-black text-white font-display">{screenerResult.name}</h3>
                            <p className="text-xs text-slate-400 mt-1">Extract Match: <span className="text-orange-400 font-bold">{screenerResult.role}</span></p>
                          </div>
                          <span className="text-xs font-black bg-gradient-to-tr from-green-500 to-emerald-400 text-[#070b18] px-3 py-1.5 rounded-xl shadow-lg">
                            {screenerResult.aiScore}% Match
                          </span>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Parsed Skillsets:</p>
                          <div className="flex flex-wrap gap-2">
                            {screenerResult.skills.map(s => (
                              <span key={s} className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-750 px-3 py-1 rounded-lg">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-[#080d1c] p-5 rounded-2xl border border-slate-850 space-y-2">
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">AI Fit Summary:</p>
                          <p className="text-xs text-slate-350 leading-relaxed font-semibold">{screenerResult.aiReport.summary}</p>
                        </div>

                        {/* SWOT Summary */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl">
                            <span className="text-[8px] font-black text-green-400 uppercase tracking-widest">Strengths</span>
                            <p className="text-[10px] text-slate-300 mt-1 font-semibold leading-normal">{screenerResult.aiReport.strengths[0]}</p>
                          </div>
                          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                            <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Weaknesses</span>
                            <p className="text-[10px] text-slate-300 mt-1 font-semibold leading-normal">{screenerResult.aiReport.weaknesses[0]}</p>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  {screenerResult && (
                    <div className="flex gap-3 pt-6 mt-6 border-t border-slate-850">
                      <button
                        onClick={() => { setScreenerResult(null); setScreenerFile(null); }}
                        className="flex-1 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Reset
                      </button>
                      <button
                        onClick={handleAddScreenerCandidate}
                        className="flex-[2] bg-orange-600 hover:bg-orange-700 text-[#070b18] py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/10"
                      >
                        Save to Pipeline
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 6: AI RECOPILOT CHAT */}
          {activeTab === 'copilot' && (
            <div className="space-y-6 animate-fade-in text-left max-w-4xl">
              <div>
                <h3 className="text-xl font-black text-white font-display">Recruiting AI Copilot</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Draft emails, find specialized skillsets, or query statuses in real-time with natural language.
                </p>
              </div>

              <div className="bg-[#0c1226]/40 border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col h-[550px] justify-between">
                
                {/* Message Log */}
                <div className="flex-grow p-6 overflow-y-auto space-y-4 bg-[#080d1c]/30">
                  {copilotMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm shadow-md ${
                        msg.sender === 'user' ? 'bg-orange-600 text-white font-bold' : 'bg-slate-800 text-orange-400'
                      }`}>
                        {msg.sender === 'user' ? 'HR' : <Bot size={14} />}
                      </div>
                      
                      <div className={`p-4 rounded-2xl border text-sm leading-relaxed shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-orange-600/10 border-orange-500/20 text-slate-200 rounded-tr-none'
                          : 'bg-[#0a0f20]/90 border-slate-850 text-slate-350 rounded-tl-none whitespace-pre-wrap'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {copilotTyping && (
                    <div className="flex gap-3 max-w-[80%] items-center text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse p-4">
                      <Bot size={16} className="text-orange-500 animate-bounce" /> Processing recruiter query...
                    </div>
                  )}
                </div>

                {/* Form Input Area */}
                <form onSubmit={handleCopilotSend} className="bg-[#0a0f20] border-t border-slate-850 p-4 flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="e.g. 'Draft email to Marcus Vance', 'Who applied for warehouse lead role?'"
                    className="w-full bg-[#070b18] border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-200 font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 placeholder-slate-650"
                    value={copilotInput}
                    onChange={(e) => setCopilotInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-[#070b18] p-3 rounded-xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </form>

              </div>
            </div>
          )}

        </div>

      </main>

      {/* MODAL: CANDIDATE FILE DETAILED MODAL */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedCandidate(null); setIsScheduling(false); }}
              className="absolute inset-0 bg-[#060812]/80 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-[#0c1226] border border-slate-800 rounded-[2.5rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col justify-between"
            >
              
              {/* Modal Body */}
              <div className="p-8 md:p-10 space-y-6">
                
                {/* Header section inside modal */}
                <div className="flex justify-between items-start border-b border-slate-850 pb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white font-display tracking-tight leading-none">{selectedCandidate.fullName}</h3>
                    <p className="text-xs text-orange-400 font-black uppercase tracking-widest mt-2">{selectedCandidate.jobType || selectedCandidate.position} | {selectedCandidate.preferredShift || 'Shift Option'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block leading-none mb-1">AI Match</span>
                    <span className="text-xl font-black text-green-400 font-display">{selectedCandidate.skillsScore || 80}% Fit</span>
                  </div>
                  
                  <button 
                    onClick={() => { setSelectedCandidate(null); setIsScheduling(false); }} 
                    className="absolute top-6 right-6 p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-850 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Scheduling Panel Overlay */}
                {isScheduling ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-orange-500/5 p-6 rounded-2xl border border-orange-500/10 flex flex-col items-center text-center">
                      <Clock size={28} className="text-orange-400 mb-3" />
                      <h4 className="font-extrabold text-sm text-white font-display">Schedule Roadmap Interview</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal">Assign a date/time slot. Confirming will automatically email applicant scheduling info.</p>
                      
                      <div className="mt-6 w-full max-w-sm">
                        <DateTimePicker
                          label="Choose Date & Time"
                          value={interviewDate}
                          onChange={setInterviewDate}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-850">
                      <button 
                        onClick={() => setIsScheduling(false)}
                        className="bg-transparent hover:bg-slate-800 border border-slate-800 text-slate-400 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={async () => {
                          if (interviewDate) {
                            await handleUpdateStatus(selectedCandidate.id, 'Interviewing', { interviewDate });
                            setIsScheduling(false);
                            setSelectedCandidate(null);
                          }
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-[#070b18] px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                      >
                        Confirm Schedule
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard detail layout */
                  <div className="space-y-6">
                    
                    {/* Modal navigation tabs */}
                    <div className="flex border-b border-slate-850">
                      {[
                        { id: 'profile', label: 'Candidate File' },
                        { id: 'screening', label: 'AI SWOT Screening' },
                        { id: 'scorecard', label: 'Evaluation & Sliders' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setCandidateDetailTab(tab.id)}
                          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                            candidateDetailTab === tab.id 
                              ? 'border-orange-500 text-orange-400' 
                              : 'border-transparent text-slate-500 hover:text-slate-350'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* TAB: Candidate File */}
                    {candidateDetailTab === 'profile' && (
                      <div className="space-y-5 text-left text-xs font-semibold text-slate-300">
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-[#0a0f20]/60 rounded-xl border border-slate-850">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Contact Details</span>
                            <div className="space-y-2">
                              <p className="flex items-center gap-2"><Mail size={12} className="text-orange-500" /> {selectedCandidate.email}</p>
                              <p className="flex items-center gap-2"><Phone size={12} className="text-orange-500" /> {selectedCandidate.phone || 'N/A'}</p>
                              <p className="flex items-center gap-2"><MapPin size={12} className="text-orange-500" /> {selectedCandidate.preferredLocation}</p>
                            </div>
                          </div>

                          <div className="p-4 bg-[#0a0f20]/60 rounded-xl border border-slate-850">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Work Authorization & Age</span>
                            <div className="space-y-2">
                              <p><span className="text-slate-500">Eligibility:</span> {selectedCandidate.workAuth}</p>
                              <p><span className="text-slate-500">Auth Expiry:</span> {selectedCandidate.authExpiry || 'N/A'}</p>
                              <p><span className="text-slate-500">Over 18:</span> {selectedCandidate.is18OrOlder || 'Yes'}</p>
                            </div>
                          </div>
                        </div>

                        {selectedCandidate.howHeard && (
                          <div className="p-4 bg-[#0a0f20]/60 rounded-xl border border-slate-850">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Referral Information</span>
                            <p><span className="text-slate-500">Source:</span> {selectedCandidate.howHeard} {selectedCandidate.referringEmployee ? `(Referred by: ${selectedCandidate.referringEmployee})` : ''}</p>
                            <p className="mt-1"><span className="text-slate-500">Worked here before?</span> {selectedCandidate.workedAtVistaBefore || 'No'}</p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Interest Statement</span>
                          <div className="p-4 bg-[#080d1c] border border-slate-850 rounded-xl font-medium leading-relaxed max-h-32 overflow-y-auto">
                            {selectedCandidate.interestStatement || 'No interest statement provided.'}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Previous Experience & Skills</span>
                          <div className="p-4 bg-[#080d1c] border border-slate-850 rounded-xl font-medium leading-relaxed max-h-32 overflow-y-auto">
                            {selectedCandidate.previousExperience || 'No experience details listed.'}
                          </div>
                        </div>

                        {selectedCandidate.resumeData && (
                          <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText size={20} className="text-orange-400" />
                              <div>
                                <h5 className="font-bold text-slate-200">resume_doc.pdf</h5>
                                <p className="text-[9px] text-slate-500">Attached file successfully authenticated</p>
                              </div>
                            </div>
                            <a 
                              href={selectedCandidate.resumeData} 
                              download={selectedCandidate.resumeName || "resume.pdf"}
                              className="bg-slate-800 text-slate-200 hover:bg-orange-600 hover:text-white px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold"
                            >
                              <Download size={12} /> Download
                            </a>
                          </div>
                        )}

                        {selectedCandidate.rescheduleRequested && (
                          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                              <AlertCircle size={14} /> Candidate Requested Reschedule
                            </div>
                            {selectedCandidate.suggestedInterviewDate && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-300 font-medium">Suggested: {new Date(selectedCandidate.suggestedInterviewDate).toLocaleString()}</span>
                                <button
                                  onClick={async () => {
                                    await handleUpdateStatus(selectedCandidate.id, 'Interviewing', {
                                      interviewDate: selectedCandidate.suggestedInterviewDate,
                                      rescheduleRequested: false
                                    });
                                    setSelectedCandidate(null);
                                  }}
                                  className="bg-amber-600 hover:bg-amber-700 text-[#070b18] px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all"
                                >
                                  Accept Suggested
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    )}

                    {/* TAB: AI SWOT Screening */}
                    {candidateDetailTab === 'screening' && (
                      <div className="space-y-6 text-left">
                        <div className="bg-[#080d1c] p-5 rounded-2xl border border-slate-850 space-y-2">
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">AI Candidate Summary</p>
                          <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                            {selectedCandidate.notes?.includes('Parsed via AI') 
                              ? "Extracted logistics experience shows solid forklift certifications. Highly accurate packing metrics." 
                              : "This candidate shows strong alignment with Vista Auction values, showing previous operations experience and flexible availability. Suggested for quick screen."
                            }
                          </p>
                        </div>

                        {/* Detailed SWOT Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl space-y-2">
                            <span className="text-[9px] font-black text-green-400 uppercase tracking-widest block border-b border-green-500/10 pb-1">Strengths</span>
                            <ul className="text-[10px] text-slate-350 list-disc pl-4 space-y-1 font-semibold">
                              <li>Highly flexible availability options.</li>
                              <li>Documented team leadership qualities.</li>
                              <li>Proven accuracy scores in grading.</li>
                            </ul>
                          </div>

                          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-2">
                            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest block border-b border-red-500/10 pb-1">Areas to Probe</span>
                            <ul className="text-[10px] text-slate-350 list-disc pl-4 space-y-1 font-semibold">
                              <li>Short tenure length at previous job.</li>
                              <li>Salary requirements slightly above average.</li>
                              <li>Prefers Charlotte facility location.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Scorecard / Evaluation */}
                    {candidateDetailTab === 'scorecard' && (
                      <div className="space-y-6 text-left">
                        
                        {/* Sliders Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#080d1c] p-6 rounded-2xl border border-slate-850">
                          {[
                            { id: 'punctuality', label: 'Punctuality' },
                            { id: 'attitude', label: 'Attitude & Energy' },
                            { id: 'skillset', label: 'Relevant Skills' },
                            { id: 'culturalFit', label: 'Vista Cultural Fit' }
                          ].map(metric => (
                            <div key={metric.id} className="space-y-2">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <span>{metric.label}</span>
                                <span className="text-orange-400 font-bold">{scorecard[metric.id]}/10</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={scorecard[metric.id]}
                                onChange={(e) => setScorecard({ ...scorecard, [metric.id]: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Calculated Average Display */}
                        <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl flex justify-between items-center text-xs font-black uppercase tracking-widest">
                          <span className="text-slate-400">Calculated Evaluation Average</span>
                          <span className="text-lg text-orange-400 font-display">
                            {((scorecard.punctuality + scorecard.attitude + scorecard.skillset + scorecard.culturalFit) / 4).toFixed(1)} / 10
                          </span>
                        </div>

                        {/* Notes update section */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            Private Recruiter Logs <span className="text-[8px] bg-orange-600/20 text-orange-400 px-2 py-0.5 rounded uppercase font-black">Private notes</span>
                          </label>
                          <textarea
                            value={selectedCandidate.notes || ''}
                            onChange={async (e) => {
                              const val = e.target.value;
                              setSelectedCandidate(prev => ({ ...prev, notes: val }));
                              if (onUpdateCandidate) {
                                await onUpdateCandidate(selectedCandidate.id, selectedCandidate.status, { notes: val });
                              }
                            }}
                            placeholder="Write candidate screening feedback notes..."
                            className="w-full p-4 bg-[#080d1c] border border-slate-850 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-orange-500 min-h-[100px]"
                          />
                        </div>

                      </div>
                    )}

                    {/* Progress Pipeline Flow Controls */}
                    <div className="border-t border-slate-850 pt-6">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Promote/Demote Status Stage</p>
                      <div className="flex gap-2 flex-wrap">
                        {['Pending', 'Accepted', 'Interviewing', 'Hired', 'Rejected'].map(stage => (
                          <button
                            key={stage}
                            onClick={() => handleUpdateStatus(selectedCandidate.id, stage)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                              selectedCandidate.status === stage 
                                ? 'bg-orange-600 text-[#070b18] shadow-md shadow-orange-600/10' 
                                : 'bg-[#0a0f20]/60 border border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            {stage}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="bg-[#0a0f20] p-6 border-t border-slate-850 flex justify-between items-center rounded-b-[2.5rem]">
                <div>
                  {selectedCandidate.status === 'Accepted' && (
                    <button
                      onClick={() => setIsScheduling(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-[#070b18] px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                    >
                      Schedule Interview
                    </button>
                  )}
                  {selectedCandidate.status === 'Interviewing' && (
                    <button
                      onClick={async () => {
                        await handleUpdateStatus(selectedCandidate.id, 'Hired');
                        setSelectedCandidate(null);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                    >
                      Hire Candidate
                    </button>
                  )}
                  {selectedCandidate.status === 'Hired' && (
                    <div className="flex items-center gap-2 text-green-400 text-xs font-black uppercase tracking-widest">
                      <Check size={16} /> Employee Hired & Active
                    </div>
                  )}
                  {selectedCandidate.status === 'Rejected' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedCandidate.id, 'Pending')}
                      className="text-slate-500 hover:text-slate-300 text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Reconsider Profile
                    </button>
                  )}
                </div>

                <button
                  onClick={() => { setSelectedCandidate(null); setIsScheduling(false); }}
                  className="bg-[#080d1c] border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD TRAINING COURSE */}
      <AnimatePresence>
        {showAddCourseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#060812]/80 backdrop-blur-sm" onClick={() => setShowAddCourseModal(false)}></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#0c1226] border border-slate-800 rounded-[2rem] p-8 shadow-2xl max-w-md w-full space-y-5 text-left"
            >
              <h3 className="text-lg font-black text-white font-display uppercase tracking-widest border-b border-slate-850 pb-3">Create Training Course</h3>
              
              <div className="space-y-4 text-xs font-semibold text-slate-350">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Course Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Monroe Cataloging Standard"
                    className="w-full bg-[#080d1c] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-orange-500"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                  <textarea
                    placeholder="Short course description of materials..."
                    className="w-full bg-[#080d1c] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-orange-500 min-h-[80px]"
                    value={newCourse.description}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Course Type</label>
                    <select
                      value={newCourse.type}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-[#080d1c] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-300 focus:outline-none focus:border-orange-500 font-bold"
                    >
                      <option value="PDF">PDF Document</option>
                      <option value="Video">Video Guide</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Is Required?</label>
                    <label className="flex items-center gap-2 bg-[#080d1c] border border-slate-800 rounded-xl px-3 py-2.5 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCourse.required}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, required: e.target.checked }))}
                        className="rounded border-slate-800 bg-[#070b18] text-orange-500 focus:ring-0 w-4 h-4"
                      />
                      <span className="text-slate-300">Required</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-850">
                <button
                  onClick={() => setShowAddCourseModal(false)}
                  className="flex-1 bg-transparent hover:bg-slate-800 border border-slate-800 text-slate-400 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNewCourse}
                  className="flex-[2] bg-orange-600 hover:bg-orange-700 text-[#070b18] py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                >
                  Create Course
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ASSIGN / BROWSE EMPLOYEE TRAINING */}
      <AnimatePresence>
        {selectedEmployee && selectedEmployee.course && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#060812]/80 backdrop-blur-sm" onClick={() => setSelectedEmployee(null)}></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#0c1226] border border-slate-800 rounded-[2rem] p-8 shadow-2xl max-w-md w-full space-y-5 text-left"
            >
              <h3 className="text-lg font-black text-white font-display uppercase tracking-widest border-b border-slate-850 pb-3">Assign: {selectedEmployee.course.name}</h3>
              
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {candidates.filter(c => c.status === 'Hired').map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      if (onAssignCourse) {
                        onAssignCourse(emp.fullName, emp.email, selectedEmployee.course.id);
                      }
                      setSelectedEmployee(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-[#080d1c] border border-slate-850 rounded-xl hover:border-orange-500/40 text-left transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 font-bold text-xs uppercase shadow-inner">
                      {emp.fullName[0]}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-slate-200">{emp.fullName}</h5>
                      <p className="text-[10px] text-slate-500">{emp.email}</p>
                    </div>
                  </button>
                ))}
                {candidates.filter(c => c.status === 'Hired').length === 0 && (
                  <p className="text-center text-slate-500 py-6 text-xs font-bold uppercase tracking-wider">No active employees to assign.</p>
                )}
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-full bg-[#080d1c] border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
