import React, { useState, useEffect } from 'react';
import { ClipboardList, Mic, Puzzle, MessageCircle, Megaphone, Bot, ArrowRight, Search, Rocket, Clock, Trophy } from 'lucide-react';
import { initialJobs, mockQuestions, catalogerMiniGameItems } from '../data/mockData';

export default function CandidateDashboard({ candidateData, appliedJobs, onUpdateCandidate, onOpenAIChat }) {
  const [activeTab, setActiveTab] = useState('applications');
  
  // List of applications
  // Combine initial candidate data + any newly applied jobs in session
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const list = [];
    // Add default candidate record
    if (candidateData) {
      list.push(candidateData);
    }
    // Add newly applied jobs from this session
    Object.keys(appliedJobs).forEach(jobId => {
      const job = appliedJobs[jobId];
      // Check if candidate already has an application for this
      if (!list.some(app => app.appliedJobId === jobId)) {
        list.push({
          id: `session-cand-${jobId}`,
          name: candidateData?.name || "Guest Candidate",
          appliedRole: job.title,
          appliedJobId: jobId,
          appliedDate: "Today",
          status: "Applied",
          statusIndex: 0,
          aiScore: 75,
          skills: ["Data Entry", "Inventory Sorting"],
          experience: [{ role: "Applicant", company: "Self", duration: "2026" }],
          aiReport: {
            summary: "Pending automated screening parser evaluation.",
            strengths: ["Highly interested in position"],
            weaknesses: ["Awaiting skills assessment verification"],
            opportunities: [],
            threats: []
          }
        });
      }
    });
    setApplications(list);
  }, [candidateData, appliedJobs]);

  // Selected application for detail views
  const [selectedAppIdx, setSelectedAppIdx] = useState(0);
  const activeApp = applications[selectedAppIdx] || null;

  // AI Interview Prep State
  const [prepRole, setPrepRole] = useState(activeApp?.appliedJobId || 'job-2');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [interviewLog, setInterviewLog] = useState([]);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [interviewFeedback, setInterviewFeedback] = useState(null);
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);

  const activeQuestions = mockQuestions[prepRole] || mockQuestions['job-2'];

  const startInterview = () => {
    setInterviewLog([
      { sender: 'recruiter', text: `Welcome! Let's start the prep for the ${initialJobs.find(j => j.id === prepRole)?.title} role. First question: ${activeQuestions[0]}` }
    ]);
    setCurrentQuestionIdx(0);
    setUserAnswer('');
    setIsBotSpeaking(true);
    setInterviewFeedback(null);
    setIsInterviewFinished(false);
    
    // Simulate speaking mouth/wave
    setTimeout(() => setIsBotSpeaking(false), 2500);
  };

  const handleAnswerSubmit = (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    const nextLog = [...interviewLog, { sender: 'candidate', text: userAnswer }];
    setInterviewLog(nextLog);
    const submittedAns = userAnswer;
    setUserAnswer('');

    if (currentQuestionIdx < activeQuestions.length - 1) {
      setIsBotSpeaking(true);
      setTimeout(() => {
        const nextIdx = currentQuestionIdx + 1;
        setCurrentQuestionIdx(nextIdx);
        setInterviewLog(prev => [...prev, { sender: 'recruiter', text: activeQuestions[nextIdx] }]);
        setIsBotSpeaking(false);
      }, 1500);
    } else {
      // Analyze & Generate Final Feedback
      setIsBotSpeaking(true);
      setTimeout(() => {
        setIsBotSpeaking(false);
        setIsInterviewFinished(true);
        // Standard grading helper
        let score = 75;
        let tips = [];
        let summaryText = "";

        if (prepRole === 'job-2') {
          score = submittedAns.length > 50 ? 92 : 82;
          tips = [
            "Good emphasis on checking accessories and documenting details.",
            "Try to specify how you would log box damage levels (minor scuff vs complete smash)."
          ];
          summaryText = "Strong focus on grading accuracy. Demonstrates the meticulous quality standards required to catalog items on the Vista online store.";
        } else {
          score = 88;
          tips = ["Strong safety awareness mentioned.", "Mentioning RF scanner speeds or teamwork will elevate your rank further."];
          summaryText = "Solid answers highlighting collaborative safety and productivity in fast-paced distribution cycles.";
        }

        setInterviewFeedback({ score, tips, summaryText });
        
        // Push this feedback update back to the main candidate state
        if (onUpdateCandidate && activeApp) {
          const updatedApp = {
            ...activeApp,
            aiScore: Math.round((activeApp.aiScore + score) / 2) // average match score
          };
          onUpdateCandidate(updatedApp);
        }
      }, 1500);
    }
  };

  // Cataloger Assessment Mini-Game State
  const [gameState, setGameState] = useState('welcome'); // welcome, active, complete
  const [gameItemIdx, setGameItemIdx] = useState(0);
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedDamage, setSelectedDamage] = useState('');
  const [gradingNote, setGradingNote] = useState('');
  const [gameCorrectCount, setGameCorrectCount] = useState(0);
  const [timer, setTimer] = useState(30);
  const [gameScores, setGameScores] = useState([]);

  const currentAssessmentItem = catalogerMiniGameItems[gameItemIdx];

  useEffect(() => {
    let interval;
    if (gameState === 'active' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0 && gameState === 'active') {
      submitGameItem(true); // Auto-submit on timeout
    }
    return () => clearInterval(interval);
  }, [gameState, timer]);

  const startAssessment = () => {
    setGameState('active');
    setGameItemIdx(0);
    setGameCorrectCount(0);
    setTimer(25);
    setGameScores([]);
    resetGameItemFields();
  };

  const resetGameItemFields = () => {
    setSelectedCondition('');
    setSelectedDamage('');
    setGradingNote('');
  };

  const submitGameItem = (timedOut = false) => {
    let isCorrect = false;
    const correctAns = currentAssessmentItem.correctAnswers;

    if (!timedOut) {
      // Evaluate response
      const condMatch = selectedCondition === correctAns.condition;
      const noteProvided = gradingNote.trim().length > 15;
      isCorrect = condMatch && noteProvided;
    }

    if (isCorrect) {
      setGameCorrectCount(prev => prev + 1);
    }

    setGameScores(prev => [...prev, { 
      item: currentAssessmentItem.name, 
      correct: isCorrect,
      timedOut
    }]);

    if (gameItemIdx < catalogerMiniGameItems.length - 1) {
      setGameItemIdx(prev => prev + 1);
      setTimer(25);
      resetGameItemFields();
    } else {
      setGameState('complete');
      // Calculate final score
      const finalPercentage = Math.round(((isCorrect ? gameCorrectCount + 1 : gameCorrectCount) / catalogerMiniGameItems.length) * 100);
      
      // Update applicant score in recruiter database
      if (onUpdateCandidate && activeApp) {
        const scoreAdjust = Math.max(activeApp.aiScore, finalPercentage);
        const updatedApp = {
          ...activeApp,
          skillsScore: finalPercentage,
          aiScore: Math.round((activeApp.aiScore + scoreAdjust) / 2),
          skills: [...new Set([...activeApp.skills, "Verified Cataloging"])]
        };
        onUpdateCandidate(updatedApp);
      }
    }
  };

  const pipelineSteps = ['Applied', 'Screened', 'Interviewing', 'Offer', 'Hired'];

  return (
    <div className="dashboard-container fade-in">
      {/* Sidebar navigation */}
      <div className="sidebar">
        <button 
          className={`sidebar-link ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          <span><ClipboardList size={18} /></span>
          <span className="sidebar-label">My Applications</span>
        </button>
        <button 
          className={`sidebar-link ${activeTab === 'interview-prep' ? 'active' : ''}`}
          onClick={() => setActiveTab('interview-prep')}
        >
          <span><Mic size={18} /></span>
          <span className="sidebar-label">AI Interview Prep</span>
        </button>
        <button 
          className={`sidebar-link ${activeTab === 'skills-assessment' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills-assessment')}
        >
          <span><Puzzle size={18} /></span>
          <span className="sidebar-label">Skills Assessment</span>
        </button>
        
        <div style={{ marginTop: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="glass-panel" style={{ padding: '12px', borderRadius: '10px', fontSize: '0.8rem', textAlign: 'left' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Score Ranking:</span>
            <h4 style={{ fontSize: '1.2rem', marginTop: '4px', color: 'var(--success)' }}>
              {activeApp?.aiScore || 75}% Match
            </h4>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Complete skills challenges to boost your match rating!
            </p>
          </div>
          <button onClick={onOpenAIChat} className="btn btn-glass btn-sm" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <MessageCircle size={16} /> Get Help
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="main-content">
        {activeTab === 'applications' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem' }}>Application Progress Hub</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Track your active job status and pending tasks</p>
              </div>
              
              {applications.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>View:</span>
                  <select 
                    className="form-input form-select"
                    style={{ width: '220px', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                    value={selectedAppIdx}
                    onChange={(e) => setSelectedAppIdx(Number(e.target.value))}
                  >
                    {applications.map((app, idx) => (
                      <option key={app.id} value={idx}>{app.appliedRole}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {activeApp ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Stepper Pipeline */}
                <div className="glass-panel" style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '1.1rem' }}>Application Pipeline Status</h4>
                    <span className="badge badge-blue">{activeApp.status}</span>
                  </div>
                  
                  <div className="application-timeline">
                    <div 
                      className="timeline-progress-bar" 
                      style={{ 
                        width: `${(activeApp.statusIndex / (pipelineSteps.length - 1)) * 100}%` 
                      }}
                    ></div>
                    {pipelineSteps.map((step, idx) => (
                      <div 
                        key={step} 
                        className={`timeline-step ${idx < activeApp.statusIndex ? 'completed' : ''} ${idx === activeApp.statusIndex ? 'active' : ''}`}
                      >
                        <div className="timeline-dot"></div>
                        <div className="timeline-label">{step}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', marginTop: '32px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}><Megaphone size={24} /></span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
                      {activeApp.statusIndex === 0 && "Your application has been received. Boost your chances by taking the Cataloger skills challenge in the Skills Assessment tab!"}
                      {activeApp.statusIndex === 1 && "AI screening is complete! Our recruiters are coordinating your interview schedule. Warm up with our AI Interview simulator!"}
                      {activeApp.statusIndex === 2 && "Interview scheduled! Please join the virtual session link or practice beforehand in the Interview Prep tab."}
                      {activeApp.statusIndex === 3 && "Congratulations! An offer has been generated. Please review your email inbox for package sign-off details."}
                      {activeApp.statusIndex === 4 && "Welcome to the Vista Auction team! Onboarding instructions will follow shortly."}
                    </p>
                  </div>
                </div>

                {/* Info Bento Column */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', textAlign: 'left' }}>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>AI Match Insights</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {activeApp.aiReport?.summary || "Awaiting parsing diagnostics summary."}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                      {activeApp.skills.map(skill => (
                        <span key={skill} className="badge badge-blue">{skill}</span>
                      ))}
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ fontSize: '1.1rem' }}>Next Recommended Actions</h4>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold' }}>1</div>
                      <div>
                        <h5 style={{ fontSize: '0.95rem' }}>AI Interview Prep</h5>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Get comfortable talking through returned item processes.</p>
                      </div>
                      <button onClick={() => setActiveTab('interview-prep')} className="btn btn-glass btn-sm" style={{ marginLeft: 'auto' }}>Start</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold' }}>2</div>
                      <div>
                        <h5 style={{ fontSize: '0.95rem' }}>Grading Assessment Challenge</h5>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Test your speed identifying box damage on returned electronics.</p>
                      </div>
                      <button onClick={() => setActiveTab('skills-assessment')} className="btn btn-glass btn-sm" style={{ marginLeft: 'auto' }}>Play</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '40px', color: 'var(--text-secondary)' }}>
                No active applications found. Click on the Careers tab to find and apply for jobs!
              </div>
            )}
          </div>
        )}

        {/* AI Interview Prep */}
        {activeTab === 'interview-prep' && (
          <div className="fade-in">
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>AI Interview Practice Simulator</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Practice responding to real grading and logistics questions. Get graded on detail accuracy, customer care, and process flow.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>Practice Role:</span>
              <select 
                className="form-input" 
                style={{ width: '280px', borderRadius: '8px', padding: '8px 12px' }}
                value={prepRole}
                onChange={(e) => setPrepRole(e.target.value)}
                disabled={interviewLog.length > 0 && !isInterviewFinished}
              >
                {initialJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
              {!(interviewLog.length > 0 && !isInterviewFinished) && (
                <button onClick={startInterview} className="btn btn-primary">Start Prep Session</button>
              )}
            </div>

            {interviewLog.length > 0 && (
              <div className="simulator-layout">
                {/* Video container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="video-screen">
                    <div className="avatar-graphic speaking" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={48} /></div>
                    <div className="video-overlay">
                      <span className="recruiter-name-tag">Vista Recruiter AI</span>
                      <span className="live-indicator">
                        <span className="live-dot"></span>
                        <span>SIMULATED</span>
                      </span>
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Instructions: Speak or type your answer in detail. Emphasize safety, clarity, and Vista Auction procedures.
                    </p>
                  </div>
                </div>

                {/* Dialog Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="chat-bubble-container">
                    <h5 style={{ fontSize: '0.85rem', color: 'var(--primary-hover)', marginBottom: '6px' }}>
                      Question {currentQuestionIdx + 1} of {activeQuestions.length}
                    </h5>
                    <p style={{ fontSize: '1.05rem', color: 'white', lineHeight: '1.4' }}>
                      {activeQuestions[currentQuestionIdx]}
                    </p>
                  </div>

                  {!isInterviewFinished ? (
                    <form onSubmit={handleAnswerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <textarea
                        className="matchmaker-textarea"
                        style={{ height: '100px' }}
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        disabled={isBotSpeaking}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button 
                          type="button" 
                          className="btn btn-glass" 
                          onClick={() => {
                            setInterviewLog([]);
                            setIsInterviewFinished(false);
                          }}
                        >
                          Reset
                        </button>
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={!userAnswer.trim() || isBotSpeaking}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Submit Answer <ArrowRight size={16} /></span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="glass-panel fade-in" style={{ padding: '24px', border: '1px solid var(--border-glow)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '1.2rem', color: 'white' }}>AI Evaluation Report</h4>
                        <span className="badge badge-green" style={{ fontSize: '1.1rem', padding: '6px 12px' }}>
                          Score: {interviewFeedback?.score}/100
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        {interviewFeedback?.summaryText}
                      </p>
                      <h5 style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', marginBottom: '8px' }}>Actionable Coaching Tips:</h5>
                      <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {interviewFeedback?.tips.map((tip, idx) => (
                          <li key={idx} style={{ marginBottom: '6px' }}>{tip}</li>
                        ))}
                      </ul>
                      <button onClick={startInterview} className="btn btn-primary" style={{ marginTop: '20px', width: '100%' }}>
                        Retry Practice Session
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Skills Assessment Mini-Game */}
        {activeTab === 'skills-assessment' && (
          <div className="fade-in">
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Cataloger Grading Challenge</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Auction item listing speed & condition logging accuracy. Can you spot defects and correctly grade the items?
            </p>

            {gameState === 'welcome' && (
              <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', maxWidth: '650px', margin: '0 auto' }}>
                <Search size={48} />
                <h3 style={{ fontSize: '1.5rem', marginTop: '16px', marginBottom: '12px' }}>Grader Skills Sandbox</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
                  You will inspect 3 typical customer returns. Correctly identify the condition level (Like New, Open Box, Missing Accessories, or Damaged), identify the defect, and write an accurate description within the timer.
                </p>
                <button onClick={startAssessment} className="btn btn-primary btn-lg" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  Start Grading Challenge <Rocket size={18} />
                </button>
              </div>
            )}

            {gameState === 'active' && currentAssessmentItem && (
              <div className="glass-panel game-container">
                <div className="game-stats-row">
                  <span>Item {gameItemIdx + 1} of {catalogerMiniGameItems.length}</span>
                  <span style={{ color: timer <= 8 ? 'var(--danger)' : 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={16} /> Time Remaining: {timer}s
                  </span>
                  <span>Accuracy Score: {gameCorrectCount}/{gameItemIdx}</span>
                </div>

                <div className="game-item-display">
                  {/* Left: Item Visual placeholder */}
                  <div className="item-image-placeholder">
                    <span style={{ fontSize: '6rem', display: 'block', marginBottom: '16px' }}>
                      {currentAssessmentItem.imageUrl}
                    </span>
                    <h3 style={{ fontSize: '1.25rem' }}>{currentAssessmentItem.name}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      MSRP Value: {currentAssessmentItem.retailPrice}
                    </span>
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(0,0,0,0.5)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem'
                    }}>
                      Grading Sandbox
                    </div>
                  </div>

                  {/* Right: Inspection details & Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-hover)', marginBottom: '4px' }}>Inspection Report Details:</h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        "{currentAssessmentItem.damagePrompt}"
                      </p>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Assign Condition Grade</label>
                      <select 
                        className="form-input" 
                        value={selectedCondition} 
                        onChange={(e) => setSelectedCondition(e.target.value)}
                      >
                        <option value="">-- Select Grade --</option>
                        <option value="new">New (Factory Sealed)</option>
                        <option value="like_new">Like New (Open Box unused)</option>
                        <option value="open_box">Open Box (Tested Working)</option>
                        <option value="missing_accessories">Missing Accessories</option>
                        <option value="damaged">Damaged / Salvage</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Identify Defect Option</label>
                      <select 
                        className="form-input"
                        value={selectedDamage}
                        onChange={(e) => setSelectedDamage(e.target.value)}
                      >
                        <option value="">-- Select Defect --</option>
                        <option value="none">None (Item Intact)</option>
                        <option value="screen_crack">Screen Cracked / Broken Screen</option>
                        <option value="charger">Battery Charger Missing</option>
                        <option value="scuffed">Scuffed / Minor Cosmetic Scratches</option>
                        <option value="power_adapter">Power Adapter Missing</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Grading Description Notes (Min 15 chars)</label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="Write condition summary e.g. 'Power cable is missing, box is crushed...'"
                        value={gradingNote}
                        onChange={(e) => setGradingNote(e.target.value)}
                      />
                    </div>

                    <button 
                      onClick={() => submitGameItem(false)}
                      disabled={!selectedCondition || !selectedDamage || gradingNote.trim().length < 5}
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '8px' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>Log Condition Code <ArrowRight size={16} /></span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {gameState === 'complete' && (
              <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', maxWidth: '650px', margin: '0 auto' }}>
                <Trophy size={48} />
                <h3 style={{ fontSize: '1.5rem', marginTop: '16px', marginBottom: '8px' }}>Challenge Completed!</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  You scored a verified condition cataloging accuracy of:
                </p>
                <div style={{ 
                  fontSize: '3.5rem', 
                  fontWeight: 700, 
                  color: gameCorrectCount >= 2 ? 'var(--success)' : 'var(--accent-gold)',
                  marginBottom: '16px'
                }}>
                  {Math.round((gameCorrectCount / catalogerMiniGameItems.length) * 100)}%
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>
                  {gameCorrectCount >= 2 
                    ? "Excellent eye! Your grading scores have been added to your profile badge. Vista Auction managers have been notified of your cataloging speed."
                    : "Not bad! Practice cataloging returned goods again to improve your accuracy metrics."
                  }
                </p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button onClick={startAssessment} className="btn btn-glass" style={{ flex: 1 }}>Retry Challenge</button>
                  <button onClick={() => setActiveTab('applications')} className="btn btn-primary" style={{ flex: 1 }}>Back to Dashboard</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
