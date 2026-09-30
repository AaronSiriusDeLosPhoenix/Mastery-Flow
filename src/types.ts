export * from './server/db/types.js';

export type AppView = 
  | 'student_dashboard'
  | 'student_govt_benefits'
  | 'student_modules'
  | 'student_roadmap'
  | 'student_mindmap'
  | 'student_flashcards'
  | 'student_mock_exam'
  | 'student_diagnostic'
  | 'student_learn'
  | 'student_concepts'
  | 'teacher_dashboard'
  | 'teacher_student_detail'
  | 'teacher_approval'
  | 'database_explorer'
  | 'simulation'
  | 'evaluation'
  | 'settings';
