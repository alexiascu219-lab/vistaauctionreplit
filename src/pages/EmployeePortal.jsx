import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import { FileText, Video, CheckCircle, Clock, ArrowLeft, Trophy, Lock, Play, Pause } from 'lucide-react';

const EmployeePortal = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [email, setEmail] = useState('');
    const [employee, setEmployee] = useState(null);
    const [trainingRecords, setTrainingRecords] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [notification, setNotification] = useState(null);

    // Course viewing state
    const [timeSpent, setTimeSpent] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [videoProgress, setVideoProgress] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizScore, setQuizScore] = useState(null);
    const [showQuiz, setShowQuiz] = useState(false);
    const [canComplete, setCanComplete] = useState(false);

    const timerRef = useRef(null);
    const contentRef = useRef(null);
    const videoRef = useRef(null);

    // Login handler
    const handleLogin = async () => {
        if (!email.trim()) {
            setNotification({ message: 'Please enter your email', type: 'error' });
            return;
        }

        try {
            // Check if email exists in hired employees
            const { data, error } = await supabase
                .from('vista_applications')
                .select('*')
                .eq('email', email.toLowerCase())
                .eq('status', 'Hired')
                .single();

            if (error || !data) {
                setNotification({ message: 'Email not found or not authorized', type: 'error' });
                return;
            }

            setEmployee(data);
            setIsAuthenticated(true);
            localStorage.setItem('training_email', email);
            setNotification({ message: `Welcome back, ${data.fullName}!`, type: 'success' });

            // Load training data
            fetchTrainingData(email);
        } catch (error) {
            console.error('Login error:', error);
            setNotification({ message: 'Login failed', type: 'error' });
        }
    };

    // Fetch training records and courses
    const fetchTrainingData = async (userEmail) => {
        try {
            // Fetch assigned training records
            const { data: records, error: recordsError } = await supabase
                .from('vista_training')
                .select('*')
                .eq('employee_email', userEmail);

            if (recordsError) throw recordsError;
            setTrainingRecords(records || []);

            // Fetch all courses (we'll filter to assigned ones)
            const { data: allCourses, error: coursesError } = await supabase
                .from('training_courses')
                .select('*');

            if (coursesError) throw coursesError;

            // Filter to only show courses assigned to this employee
            const assignedCourseIds = records?.map(r => r.course_name) || [];
            const assignedCourses = allCourses?.filter(c => assignedCourseIds.includes(c.name)) || [];

            setCourses(assignedCourses);
        } catch (error) {
            console.error('Error fetching training data:', error);
        }
    };

    // Auto-login if email in localStorage
    useEffect(() => {
        const savedEmail = localStorage.getItem('training_email');
        if (savedEmail) {
            setEmail(savedEmail);
            handleLogin();
        }
    }, []);

    // Time tracking
    useEffect(() => {
        if (selectedCourse && !canComplete) {
            timerRef.current = setInterval(() => {
                setTimeSpent(prev => prev + 1);
            }, 1000);

            return () => clearInterval(timerRef.current);
        }
    }, [selectedCourse, canComplete]);

    // Scroll tracking for PDFs
    const handleScroll = () => {
        if (!contentRef.current) return;

        const element = contentRef.current;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight - element.clientHeight;
        const progress = Math.round((scrollTop / scrollHeight) * 100);

        setScrollProgress(Math.min(progress, 100));
    };

    // Video progress tracking
    const handleVideoProgress = () => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const progress = Math.round((video.currentTime / video.duration) * 100);
        setVideoProgress(progress);
    };

    // Check if course can be completed
    useEffect(() => {
        if (!selectedCourse) return;

        const record = trainingRecords.find(r => r.course_name === selectedCourse.name);
        const minimumTime = selectedCourse.minimum_time_seconds || 60;

        let canComplete = false;

        if (selectedCourse.type === 'PDF') {
            canComplete = scrollProgress >= 80 && timeSpent >= minimumTime;
        } else if (selectedCourse.type === 'Video') {
            canComplete = videoProgress >= 90 && timeSpent >= minimumTime;
        }

        // If quiz required, must pass quiz
        if (selectedCourse.quiz_required && quizScore === null) {
            canComplete = false;
        } else if (selectedCourse.quiz_required && quizScore < (selectedCourse.passing_score || 80)) {
            canComplete = false;
        }

        setCanComplete(canComplete);
    }, [scrollProgress, videoProgress, timeSpent, quizScore, selectedCourse, trainingRecords]);

    // Submit quiz
    const handleQuizSubmit = () => {
        if (!selectedCourse?.quiz_questions) return;

        const questions = selectedCourse.quiz_questions;
        let correct = 0;

        questions.forEach((q, idx) => {
            if (quizAnswers[idx] === q.correctAnswer) {
                correct++;
            }
        });

        const score = Math.round((correct / questions.length) * 100);
        setQuizScore(score);

        if (score >= (selectedCourse.passing_score || 80)) {
            setNotification({ message: `Great job! You scored ${score}%`, type: 'success' });
        } else {
            setNotification({ message: `Score: ${score}%. You need ${selectedCourse.passing_score || 80}% to pass. Try again!`, type: 'error' });
        }
    };

    // Mark course as complete
    const handleMarkComplete = async () => {
        if (!canComplete || !selectedCourse || !employee) return;

        try {
            const record = trainingRecords.find(r => r.course_name === selectedCourse.name);

            if (!record) return;

            const { error } = await supabase
                .from('vista_training')
                .update({
                    status: 'Completed',
                    completed_date: new Date().toISOString(),
                    time_spent_seconds: timeSpent,
                    scroll_progress: scrollProgress,
                    video_watch_percentage: videoProgress,
                    quiz_score: quizScore,
                    completion_verified: true
                })
                .eq('id', record.id);

            if (error) throw error;

            setNotification({ message: 'Course completed! 🎉', type: 'success' });

            // Refresh training data
            await fetchTrainingData(employee.email);

            // Go back to dashboard
            setTimeout(() => {
                setSelectedCourse(null);
                setTimeSpent(0);
                setScrollProgress(0);
                setVideoProgress(0);
                setQuizScore(null);
                setQuizAnswers({});
            }, 1500);
        } catch (error) {
            console.error('Error completing course:', error);
            setNotification({ message: 'Failed to mark complete', type: 'error' });
        }
    };

    // Logout
    const handleLogout = () => {
        localStorage.removeItem('training_email');
        setIsAuthenticated(false);
        setEmployee(null);
        setTrainingRecords([]);
        setCourses([]);
    };

    // Calculate progress
    const calculateProgress = () => {
        if (trainingRecords.length === 0) return 0;

        const requiredCourses = courses.filter(c => c.required);
        const completedRequired = trainingRecords.filter(r =>
            r.status === 'Completed' && courses.find(c => c.name === r.course_name && c.required)
        );

        if (requiredCourses.length === 0) return 100;
        return Math.round((completedRequired.length / requiredCourses.length) * 100);
    };

    // Format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
                <Navbar />
                <div className="max-w-md mx-auto px-4 py-20">
                    <div className="glass-panel p-10 rounded-[2.5rem] border border-white/80 shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/30">
                                <Trophy size={40} className="text-white" />
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 mb-2 font-display">Training Portal</h1>
                            <p className="text-sm text-gray-500 font-medium">Access your assigned courses</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Your Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                    className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                                    placeholder="your.email@vista.com"
                                />
                            </div>

                            <button
                                onClick={handleLogin}
                                className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                            >
                                Access Training
                            </button>
                        </div>

                        <p className="text-center text-xs text-gray-400 mt-6 font-medium">
                            Only hired employees can access training materials
                        </p>
                    </div>
                </div>
                {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            </div>
        );
    }

    // Course viewer
    if (selectedCourse) {
        const record = trainingRecords.find(r => r.course_name === selectedCourse.name);
        const minimumTime = selectedCourse.minimum_time_seconds || 60;
        const timeRemaining = Math.max(0, minimumTime - timeSpent);

        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
                <Navbar />
                <div className="max-w-6xl mx-auto px-4 py-10">
                    <button
                        onClick={() => {
                            setSelectedCourse(null);
                            setTimeSpent(0);
                            setScrollProgress(0);
                            setVideoProgress(0);
                        }}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold text-sm mb-6 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Back to Dashboard
                    </button>

                    <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] border border-white/80 shadow-2xl">
                        {/* Course Header */}
                        <div className="mb-8">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 mb-2 font-display">{selectedCourse.name}</h1>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedCourse.type === 'Video' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                            {selectedCourse.type}
                                        </span>
                                        {selectedCourse.required && (
                                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-600">
                                                Required
                                            </span>
                                        )}
                                        {selectedCourse.quiz_required && (
                                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600">
                                                Quiz Required
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Progress Indicators */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Time Spent</p>
                                    <p className="text-lg font-black text-gray-900">{formatTime(timeSpent)}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                        {selectedCourse.type === 'PDF' ? 'Scroll Progress' : 'Watch Progress'}
                                    </p>
                                    <p className="text-lg font-black text-orange-600">
                                        {selectedCourse.type === 'PDF' ? scrollProgress : videoProgress}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Required Time</p>
                                    <p className="text-lg font-black text-gray-900">{formatTime(minimumTime)}</p>
                                </div>
                                {selectedCourse.quiz_required && (
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Quiz Score</p>
                                        <p className="text-lg font-black text-gray-900">{quizScore !== null ? `${quizScore}%` : 'Not taken'}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Viewer */}
                        {!showQuiz ? (
                            <div className="mb-8">
                                {selectedCourse.type === 'PDF' && selectedCourse.content_url && (
                                    <div
                                        ref={contentRef}
                                        onScroll={handleScroll}
                                        className="w-full h-[600px] border-2 border-gray-200 rounded-2xl overflow-auto bg-white"
                                    >
                                        <iframe
                                            src={selectedCourse.content_url}
                                            className="w-full h-full"
                                            title={selectedCourse.name}
                                        />
                                    </div>
                                )}

                                {selectedCourse.type === 'Video' && selectedCourse.video_url && (
                                    <div className="w-full rounded-2xl overflow-hidden border-2 border-gray-200 bg-black">
                                        <video
                                            ref={videoRef}
                                            onTimeUpdate={handleVideoProgress}
                                            controls
                                            controlsList="nodownload nofullscreen noremoteplayback"
                                            disablePictureInPicture
                                            className="w-full"
                                        >
                                            <source src={selectedCourse.video_url} type="video/mp4" />
                                            Your browser does not support video playback.
                                        </video>
                                    </div>
                                )}

                                {!selectedCourse.content_url && !selectedCourse.video_url && (
                                    <div className="text-center py-20 text-gray-400">
                                        <p className="font-medium">Content not available yet</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Quiz Interface
                            <div className="mb-8 space-y-6">
                                <h2 className="text-2xl font-black text-gray-900">Knowledge Check</h2>
                                {selectedCourse.quiz_questions?.map((question, idx) => (
                                    <div key={idx} className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                                        <p className="font-black text-gray-900 mb-4">Question {idx + 1}: {question.question}</p>
                                        <div className="space-y-2">
                                            {question.options.map((option, optIdx) => (
                                                <label
                                                    key={optIdx}
                                                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${quizAnswers[idx] === optIdx
                                                            ? 'bg-orange-50 border-2 border-orange-500'
                                                            : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`question-${idx}`}
                                                        checked={quizAnswers[idx] === optIdx}
                                                        onChange={() => setQuizAnswers(prev => ({ ...prev, [idx]: optIdx }))}
                                                        className="w-5 h-5 text-orange-600"
                                                    />
                                                    <span className="font-bold text-gray-700">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={handleQuizSubmit}
                                    disabled={Object.keys(quizAnswers).length < (selectedCourse.quiz_questions?.length || 0)}
                                    className="w-full py-4 bg-orange-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Submit Quiz
                                </button>

                                {quizScore !== null && (
                                    <div className={`p-6 rounded-2xl text-center ${quizScore >= (selectedCourse.passing_score || 80)
                                            ? 'bg-green-50 border-2 border-green-500'
                                            : 'bg-red-50 border-2 border-red-500'
                                        }`}>
                                        <p className="text-2xl font-black mb-2">
                                            {quizScore >= (selectedCourse.passing_score || 80) ? '✓ Passed!' : '✗ Not Passed'}
                                        </p>
                                        <p className="font-bold">Your Score: {quizScore}% (Need: {selectedCourse.passing_score || 80}%)</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-4">
                            {selectedCourse.quiz_required && !showQuiz && quizScore === null && (
                                <button
                                    onClick={() => setShowQuiz(true)}
                                    className="w-full py-4 bg-amber-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-amber-700 transition-all"
                                >
                                    Take Required Quiz
                                </button>
                            )}

                            {showQuiz && (
                                <button
                                    onClick={() => setShowQuiz(false)}
                                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
                                >
                                    Back to Content
                                </button>
                            )}

                            <button
                                onClick={handleMarkComplete}
                                disabled={!canComplete}
                                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${canComplete
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/30'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {canComplete ? (
                                    <>
                                        <CheckCircle size={20} />
                                        Mark as Complete
                                    </>
                                ) : (
                                    <>
                                        <Lock size={20} />
                                        {timeRemaining > 0 ? `Available in ${formatTime(timeRemaining)}` : 'Requirements not met'}
                                    </>
                                )}
                            </button>

                            {!canComplete && (
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                    <p className="text-xs font-bold text-amber-800 text-center">
                                        {selectedCourse.type === 'PDF' && scrollProgress < 80 && `Scroll to ${80 - scrollProgress}% more of the document`}
                                        {selectedCourse.type === 'Video' && videoProgress < 90 && `Watch ${90 - videoProgress}% more of the video`}
                                        {timeRemaining > 0 && ` • Spend ${formatTime(timeRemaining)} more time`}
                                        {selectedCourse.quiz_required && quizScore === null && ' • Complete the quiz'}
                                        {selectedCourse.quiz_required && quizScore !== null && quizScore < (selectedCourse.passing_score || 80) && ' • Pass the quiz'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            </div>
        );
    }

    // Dashboard
    const progress = calculateProgress();
    const completedCount = trainingRecords.filter(r => r.status === 'Completed').length;
    const requiredCount = courses.filter(c => c.required).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 py-10">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 mb-2 font-display">Welcome back, {employee?.fullName}!</h1>
                            <p className="text-gray-500 font-medium">Continue your training journey</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                        >
                            Logout
                        </button>
                    </div>

                    {/* Progress Card */}
                    <div className="glass-panel p-8 rounded-[2.5rem] border border-white/80 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-black uppercase tracking-widest text-gray-400 mb-1">Overall Progress</p>
                                <p className="text-3xl font-black text-gray-900">{progress}%</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-500">{completedCount} / {requiredCount} Required</p>
                                <p className="text-xs font-bold text-gray-400">{trainingRecords.length} Total Courses</p>
                            </div>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Courses Grid */}
                <div>
                    <h2 className="text-2xl font-black text-gray-900 mb-6">Your Courses</h2>
                    {courses.length === 0 ? (
                        <div className="glass-panel p-12 rounded-[2.5rem] text-center">
                            <p className="text-gray-400 font-medium">No courses assigned yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map(course => {
                                const record = trainingRecords.find(r => r.course_name === course.name);
                                const isCompleted = record?.status === 'Completed';
                                const isInProgress = record?.status === 'In Progress';

                                return (
                                    <div
                                        key={course.id}
                                        onClick={() => !isCompleted && setSelectedCourse(course)}
                                        className={`glass-panel p-6 rounded-[2rem] border border-white/80 shadow-lg transition-all ${isCompleted
                                                ? 'opacity-75 cursor-default'
                                                : 'hover:shadow-xl hover:scale-[1.02] cursor-pointer'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCompleted ? 'bg-green-50 text-green-600' :
                                                    course.type === 'Video' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                {isCompleted ? <CheckCircle size={24} /> :
                                                    course.type === 'Video' ? <Video size={24} /> : <FileText size={24} />}
                                            </div>
                                            {course.required && (
                                                <span className="px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-red-50 text-red-600">
                                                    Required
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="font-black text-gray-900 mb-2">{course.name}</h3>
                                        <p className="text-xs text-gray-500 font-medium mb-4 line-clamp-2">{course.description}</p>

                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-black uppercase tracking-widest ${isCompleted ? 'text-green-600' :
                                                    isInProgress ? 'text-orange-600' : 'text-gray-400'
                                                }`}>
                                                {isCompleted ? '✓ Completed' : isInProgress ? 'In Progress' : 'Not Started'}
                                            </span>
                                            {course.estimated_duration_minutes && (
                                                <span className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                                    <Clock size={14} />
                                                    {course.estimated_duration_minutes} min
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
        </div>
    );
};

export default EmployeePortal;
