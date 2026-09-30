import crypto from 'crypto';
import { store } from '../db/store.js';
import { AuthSession, DomainId, LanguageCode, LearnerProfile, ReadingLevel, Role, User } from '../db/types.js';
import { selectNextAction } from './decisionEngine.js';

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Hashes a password using PBKDF2 with SHA-512 and random salt
   */
  public hashPassword(password: string): { salt: string; hash: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  /**
   * Verifies a password against the stored salt and hash
   */
  public verifyPassword(password: string, salt: string, expectedHash: string): boolean {
    const calculatedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(expectedHash));
  }

  /**
   * Generates a secure session token
   */
  private generateToken(): string {
    return `mf_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Register a new student account
   */
  public register(payload: {
    name: string;
    email: string;
    password: string;
    role?: Role;
    cohort?: string;
    institutionId?: string;
    activeDomainId?: DomainId;
    preferredLanguage?: LanguageCode;
    preferredReadingLevel?: ReadingLevel;
    dyslexiaModeEnabled?: boolean;
    bionicReadingEnabled?: boolean;
    avatar?: string;
  }): { user: User; learner: LearnerProfile; token: string } {
    const emailNorm = payload.email.trim().toLowerCase();

    // Check email uniqueness
    for (const u of store.users.values()) {
      if (u.email.toLowerCase() === emailNorm) {
        throw new Error('An account with this email already exists.');
      }
    }

    if (payload.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const { salt, hash } = this.hashPassword(payload.password);
    const userId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const role: Role = payload.role || 'STUDENT';
    const domain: DomainId = payload.activeDomainId || 'gate_cs';
    const institution: string = payload.institutionId || 'iit_madras';
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      name: payload.name.trim(),
      email: emailNorm,
      role,
      avatar:
        payload.avatar ||
        `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`,
      cohort: payload.cohort || '2026 Adaptive Cohort',
      institutionId: institution,
      activeDomainId: domain,
      preferredLanguage: payload.preferredLanguage || 'en',
      preferredReadingLevel: payload.preferredReadingLevel || 'undergraduate',
      dyslexiaModeEnabled: Boolean(payload.dyslexiaModeEnabled),
      bionicReadingEnabled: Boolean(payload.bionicReadingEnabled),
      createdAt: now,
      lastActiveAt: now,
      passwordHash: hash,
      passwordSalt: salt,
    };

    store.users.set(userId, newUser);

    // Create Learner Profile
    const domainConcepts = store.getConceptsByDomain(domain);
    const conceptMasteries: Record<string, any> = {};

    for (const c of domainConcepts) {
      conceptMasteries[c.id] = {
        conceptId: c.id,
        conceptName: c.name,
        mastery: 0.5,
        uncertainty: 0.5,
        retention: 0.5,
        lastAttemptTimestamp: null,
        daysSinceLastReview: 0,
        attemptsCount: 0,
        correctCount: 0,
      };
    }

    const newLearner: LearnerProfile = {
      ...newUser,
      overallMastery: 0.5,
      overallUncertainty: 0.5,
      overallRetention: 0.5,
      diagnosticCompleted: false,
      needsAttention: false,
      conceptMasteries,
      recentAttempts: [],
      overrides: [],
      recommendationHistory: [],
    };

    const firstDecision = selectNextAction(
      newLearner,
      domainConcepts.length > 0 ? domainConcepts : store.concepts,
      store.config
    );

    const initialRecommendation = {
      id: `rec_${Date.now()}`,
      learnerId: userId,
      domainId: domain,
      action: firstDecision.action,
      conceptId: firstDecision.conceptId,
      conceptName: firstDecision.conceptName,
      reason: firstDecision.reason,
      stepFired: firstDecision.stepFired,
      evidenceSummary: firstDecision.evidenceSummary,
      timestamp: now,
    };

    newLearner.currentRecommendation = initialRecommendation;
    newLearner.recommendationHistory.push(initialRecommendation);

    store.learners.set(userId, newLearner);

    // Create Auth Session (expires in 30 days)
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const session: AuthSession = {
      token,
      userId,
      role,
      createdAt: now,
      expiresAt,
    };

    store.authSessions.set(token, session);

    // Persist immediately on registration
    store.schedulePersist();

    return { user: newUser, learner: newLearner, token };
  }

  /**
   * Log in with email and password
   */
  public login(payload: { email: string; password: string }): {
    user: User;
    learner: LearnerProfile;
    token: string;
  } {
    const emailNorm = payload.email.trim().toLowerCase();
    let foundUser: User | undefined;

    for (const u of store.users.values()) {
      if (u.email.toLowerCase() === emailNorm) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      throw new Error('Invalid email or password.');
    }

    // If user has password salt and hash, verify
    if (foundUser.passwordSalt && foundUser.passwordHash) {
      const isValid = this.verifyPassword(payload.password, foundUser.passwordSalt, foundUser.passwordHash);
      if (!isValid) {
        throw new Error('Invalid email or password.');
      }
    } else {
      // For seed users who don't have password set yet, any password of length >= 4 works and sets it
      if (payload.password.length < 4) {
        throw new Error('Password must be at least 4 characters.');
      }
      const { salt, hash } = this.hashPassword(payload.password);
      foundUser.passwordSalt = salt;
      foundUser.passwordHash = hash;
    }

    foundUser.lastActiveAt = new Date().toISOString();

    const learner = store.learners.get(foundUser.id);
    if (!learner) {
      throw new Error('Learner profile associated with this account not found.');
    }
    learner.lastActiveAt = foundUser.lastActiveAt;

    // Create session token
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const session: AuthSession = {
      token,
      userId: foundUser.id,
      role: foundUser.role,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    store.authSessions.set(token, session);
    store.schedulePersist();

    return { user: foundUser, learner, token };
  }

  /**
   * Fast 1-click Demo Login for judge walkthrough
   */
  public demoLogin(userId: string): { user: User; learner: LearnerProfile; token: string } {
    const user = store.users.get(userId);
    if (!user) {
      throw new Error(`Demo user '${userId}' not found.`);
    }

    user.lastActiveAt = new Date().toISOString();

    let learner = store.learners.get(userId);
    if (!learner && user.role === 'STUDENT') {
      throw new Error(`Learner profile for ${userId} not found.`);
    }

    // For teachers, create a virtual learner representation or use student_a as reference
    if (!learner) {
      learner = {
        ...user,
        overallMastery: 0.95,
        overallUncertainty: 0.05,
        overallRetention: 0.95,
        diagnosticCompleted: true,
        needsAttention: false,
        conceptMasteries: {},
        recentAttempts: [],
        overrides: [],
        recommendationHistory: [],
      };
    }

    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const session: AuthSession = {
      token,
      userId: user.id,
      role: user.role,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    store.authSessions.set(token, session);
    store.schedulePersist();

    return { user, learner, token };
  }

  /**
   * Verify token from Authorization: Bearer <token>
   */
  public verifyToken(token: string): { user: User; learner: LearnerProfile } | null {
    if (!token) return null;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const session = store.authSessions.get(cleanToken);

    if (!session) return null;

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      store.authSessions.delete(cleanToken);
      return null;
    }

    const user = store.users.get(session.userId);
    if (!user) return null;

    let learner = store.learners.get(user.id);
    if (!learner) {
      learner = {
        ...user,
        overallMastery: 0.5,
        overallUncertainty: 0.5,
        overallRetention: 0.5,
        diagnosticCompleted: false,
        needsAttention: false,
        conceptMasteries: {},
        recentAttempts: [],
        overrides: [],
        recommendationHistory: [],
      };
    }

    return { user, learner };
  }

  /**
   * Log out session
   */
  public logout(token: string): boolean {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const deleted = store.authSessions.delete(cleanToken);
    if (deleted) {
      store.schedulePersist();
    }
    return deleted;
  }

  /**
   * Google Sign In / Registration
   */
  public googleLogin(payload: {
    email: string;
    name?: string;
    avatar?: string;
    googleId?: string;
  }): { user: User; learner: LearnerProfile; token: string } {
    const emailNorm = payload.email.trim().toLowerCase();
    let foundUser: User | undefined;

    for (const u of store.users.values()) {
      if (u.email.toLowerCase() === emailNorm) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      // Register new Google account seamlessly
      const generatedPass = `g_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const reg = this.register({
        name: payload.name || payload.email.split('@')[0],
        email: emailNorm,
        password: generatedPass,
        avatar: payload.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        cohort: '2026 Google Workspace Cohort',
      });
      reg.user.googleLinked = true;
      reg.learner.googleLinked = true;
      store.schedulePersist();
      return reg;
    }

    // Found existing user, rehydrate session & mark Google linked
    foundUser.lastActiveAt = new Date().toISOString();
    foundUser.googleLinked = true;
    if (payload.avatar && (!foundUser.avatar || foundUser.avatar.includes('unsplash'))) {
      foundUser.avatar = payload.avatar;
    }

    let learner = store.learners.get(foundUser.id);
    if (!learner) {
      learner = {
        ...foundUser,
        overallMastery: 0.6,
        overallUncertainty: 0.4,
        overallRetention: 0.7,
        diagnosticCompleted: false,
        needsAttention: false,
        conceptMasteries: {},
        recentAttempts: [],
        overrides: [],
        recommendationHistory: [],
      };
      store.learners.set(foundUser.id, learner);
    }
    learner.googleLinked = true;

    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const session: AuthSession = {
      token,
      userId: foundUser.id,
      role: foundUser.role,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    store.authSessions.set(token, session);
    store.schedulePersist();

    return { user: foundUser, learner, token };
  }

  /**
   * Change user password
   */
  public changePassword(userId: string, oldPass: string, newPass: string): boolean {
    const user = store.users.get(userId);
    if (!user) throw new Error('User not found');
    if (user.passwordSalt && user.passwordHash) {
      const valid = this.verifyPassword(oldPass, user.passwordSalt, user.passwordHash);
      if (!valid) throw new Error('Current password does not match.');
    }
    if (newPass.length < 6) throw new Error('New password must be at least 6 characters.');
    const { salt, hash } = this.hashPassword(newPass);
    user.passwordSalt = salt;
    user.passwordHash = hash;
    user.lastActiveAt = new Date().toISOString();
    store.schedulePersist();
    return true;
  }

  /**
   * Update student profile & all settings subdivisions
   */
  public updateProfile(
    userId: string,
    updates: Partial<User>
  ): { user: User; learner: LearnerProfile } {
    const user = store.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found.`);
    }

    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.avatar !== undefined) user.avatar = updates.avatar.trim();
    if (updates.cohort !== undefined) user.cohort = updates.cohort.trim();
    if (updates.institutionId !== undefined) user.institutionId = updates.institutionId;
    if (updates.activeDomainId !== undefined) user.activeDomainId = updates.activeDomainId;
    if (updates.preferredLanguage !== undefined) user.preferredLanguage = updates.preferredLanguage;
    if (updates.preferredReadingLevel !== undefined) user.preferredReadingLevel = updates.preferredReadingLevel;
    if (updates.dyslexiaModeEnabled !== undefined) user.dyslexiaModeEnabled = updates.dyslexiaModeEnabled;
    if (updates.bionicReadingEnabled !== undefined) user.bionicReadingEnabled = updates.bionicReadingEnabled;
    
    // Rich Settings Fields
    if (updates.username !== undefined) user.username = updates.username.trim();
    if (updates.mobile !== undefined) user.mobile = updates.mobile.trim();
    if (updates.mobileVerified !== undefined) user.mobileVerified = updates.mobileVerified;
    if (updates.secondaryEmail !== undefined) user.secondaryEmail = updates.secondaryEmail.trim();
    if (updates.studentRollNumber !== undefined) user.studentRollNumber = updates.studentRollNumber.trim();
    if (updates.bio !== undefined) user.bio = updates.bio.trim();
    if (updates.twoStepEnabled !== undefined) user.twoStepEnabled = updates.twoStepEnabled;
    if (updates.passkeyEnabled !== undefined) user.passkeyEnabled = updates.passkeyEnabled;
    if (updates.passkeyName !== undefined) user.passkeyName = updates.passkeyName;
    if (updates.themeColor !== undefined) user.themeColor = updates.themeColor;
    if (updates.fontFamily !== undefined) user.fontFamily = updates.fontFamily;
    if (updates.fontSize !== undefined) user.fontSize = updates.fontSize;
    if (updates.voiceAssistantEnabled !== undefined) user.voiceAssistantEnabled = updates.voiceAssistantEnabled;
    if (updates.speechRate !== undefined) user.speechRate = updates.speechRate;
    if (updates.voicePersona !== undefined) user.voicePersona = updates.voicePersona;
    if (updates.googleLinked !== undefined) user.googleLinked = updates.googleLinked;
    if (updates.dailyGoalMinutes !== undefined) user.dailyGoalMinutes = updates.dailyGoalMinutes;

    user.lastActiveAt = new Date().toISOString();

    const learner = store.learners.get(userId);
    if (learner) {
      Object.assign(learner, {
        name: user.name,
        avatar: user.avatar,
        cohort: user.cohort,
        institutionId: user.institutionId,
        preferredLanguage: user.preferredLanguage,
        preferredReadingLevel: user.preferredReadingLevel,
        dyslexiaModeEnabled: user.dyslexiaModeEnabled,
        bionicReadingEnabled: user.bionicReadingEnabled,
        username: user.username,
        mobile: user.mobile,
        secondaryEmail: user.secondaryEmail,
        studentRollNumber: user.studentRollNumber,
        bio: user.bio,
        twoStepEnabled: user.twoStepEnabled,
        passkeyEnabled: user.passkeyEnabled,
        passkeyName: user.passkeyName,
        themeColor: user.themeColor,
        fontFamily: user.fontFamily,
        fontSize: user.fontSize,
        voiceAssistantEnabled: user.voiceAssistantEnabled,
        speechRate: user.speechRate,
        voicePersona: user.voicePersona,
        googleLinked: user.googleLinked,
        dailyGoalMinutes: user.dailyGoalMinutes,
        lastActiveAt: user.lastActiveAt,
      });

      if (updates.activeDomainId && updates.activeDomainId !== learner.activeDomainId) {
        store.switchLearnerDomain(userId, updates.activeDomainId);
      }
    }

    store.schedulePersist();

    return { user, learner: learner || (user as any) };
  }
}

export const authService = AuthService.getInstance();
