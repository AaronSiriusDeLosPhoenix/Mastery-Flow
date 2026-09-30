import React from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { DemoModal } from './components/DemoModal.js';
import { AudioPlayerBar } from './components/AudioPlayerBar.js';
import { AuthModal } from './components/AuthModal.js';
import { ProfileModal } from './components/ProfileModal.js';
import { ProgressReportModal } from './components/ProgressReportModal.js';
import { GlobalTutorChatWidget } from './components/GlobalTutorChatWidget.js';
import { SuperSearchModal } from './components/SuperSearchModal.js';
import { CenterStageSettingsModal } from './components/CenterStageSettingsModal.js';
import { StudentDashboard } from './views/StudentDashboard.js';
import { StudentModulesView } from './views/StudentModulesView.js';
import { StudentMindMapView } from './views/StudentMindMapView.js';
import { StudentFlashcardsView } from './views/StudentFlashcardsView.js';
import { StudentMockExamView } from './views/StudentMockExamView.js';
import { StudentConcepts } from './views/StudentConcepts.js';
import { StudentDiagnostic } from './views/StudentDiagnostic.js';
import { StudentLearn } from './views/StudentLearn.js';
import { TeacherDashboard } from './views/TeacherDashboard.js';
import { TeacherStudentDetail } from './views/TeacherStudentDetail.js';
import { TeacherApprovalLab } from './views/TeacherApprovalLab.js';
import { DatabaseExplorerView } from './views/DatabaseExplorerView.js';
import { SimulationView } from './views/SimulationView.js';
import { EvaluationView } from './views/EvaluationView.js';
import { SettingsView } from './views/SettingsView.js';

function MainLayout() {
  const {
    activeView,
    loading,
    error,
    refreshAll,
    isProgressReportModalOpen,
    setIsProgressReportModalOpen,
    currentLearner,
    allLearners,
    targetTeacherStudentId,
    currentRole,
    concepts,
    progressData,
    domains,
    activeDomainId,
  } = useApp();

  const activeLearnerForReport =
    currentRole === 'TEACHER'
      ? allLearners.find((l) => l.id === targetTeacherStudentId) || currentLearner
      : currentLearner;

  const activeDomain = domains.find((d) => d.id === activeDomainId) || domains[0];

  const renderActiveView = () => {
    switch (activeView) {
      case 'student_dashboard':
        return <StudentDashboard />;
      case 'student_modules':
        return <StudentModulesView />;
      case 'student_mindmap':
        return <StudentMindMapView />;
      case 'student_flashcards':
        return <StudentFlashcardsView />;
      case 'student_mock_exam':
        return <StudentMockExamView />;
      case 'student_concepts':
        return <StudentConcepts />;
      case 'student_diagnostic':
        return <StudentDiagnostic />;
      case 'student_learn':
        return <StudentLearn />;
      case 'teacher_dashboard':
        return <TeacherDashboard />;
      case 'teacher_student_detail':
        return <TeacherStudentDetail />;
      case 'teacher_approval':
        return <TeacherApprovalLab />;
      case 'database_explorer':
        return <DatabaseExplorerView />;
      case 'simulation':
        return <SimulationView />;
      case 'evaluation':
        return <EvaluationView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <StudentDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Sidebar with Logo on top and menu under it */}
      <Sidebar />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar />

        <div className="flex-1 max-w-[1500px] w-full mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <main className="w-full">
            {loading && !error && (
              <div className="flex items-center justify-center p-12 text-xs font-semibold text-slate-400">
                Connecting to MasteryFlow engine...
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between mb-6">
                <span>Error connecting to engine: {error}</span>
                <button
                  onClick={refreshAll}
                  className="font-bold underline ml-2 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && renderActiveView()}
          </main>
        </div>
      </div>

      <CenterStageSettingsModal />
      <AudioPlayerBar />
      <DemoModal />
      <AuthModal />
      <ProfileModal />
      <ProgressReportModal
        isOpen={isProgressReportModalOpen}
        onClose={() => setIsProgressReportModalOpen(false)}
        learner={activeLearnerForReport}
        concepts={concepts}
        progressData={progressData}
        activeDomain={activeDomain}
      />
      <GlobalTutorChatWidget />
      <SuperSearchModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
