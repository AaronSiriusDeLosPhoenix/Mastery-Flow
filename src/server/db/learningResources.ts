import { LearningResource } from './types.js';

export const SEED_LEARNING_RESOURCES: LearningResource[] = [
  // ==========================================
  // GATE CS: Theory of Computation
  // ==========================================
  {
    id: 'res_gate_toc_text',
    conceptId: 'gate_toc',
    domainId: 'gate_cs',
    title: 'Formal Definition of Regular Languages & State Minimization',
    type: 'text_lesson',
    content: `Comprehensive Unit: Theory of Computation and Finite Automata.
A Deterministic Finite Automaton (DFA) is defined as a 5-tuple M = (Q, Σ, δ, q0, F), where:
1. Q is a finite non-empty set of states.
2. Σ is a finite non-empty set of input symbols (alphabet).
3. δ: Q × Σ → Q is the state transition function.
4. q0 ∈ Q is the designated initial state.
5. F ⊆ Q is the set of accept (final) states.

Core Invariants & Theorems:
- Equivalence of DFA and NFA: For any Non-deterministic Finite Automaton N with k states, there exists an equivalent DFA D such that L(D) = L(N). The state space of D is bounded by 2^k (Subset Construction Algorithm).
- Pumping Lemma for Regular Languages: If language L is regular, there exists an integer p >= 1 (pumping length) such that every string s in L with |s| >= p can be split into three substrings s = xyz satisfying:
  1. |y| > 0 (non-empty pumped substring)
  2. |xy| <= p
  3. xy^i z ∈ L for all i >= 0.
- Application of Pumping Lemma: Used strictly to disprove regularity by proof by contradiction (e.g., proving L = {0^n 1^n | n >= 0} is not regular).
- Myhill-Nerode Theorem: A language L is regular if and only if the number of equivalence classes of its indistinguishability relation R_L is finite. This provides both a proof technique and an optimal state-minimization algorithm (Hopcroft's Algorithm, O(k log k)).
- Decidable Properties: Emptiness (is L = ∅?), Finiteness (is L finite?), Equivalence (is L1 == L2?), and Membership (is w ∈ L?) are all decidable for regular languages in polynomial time.`,
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'res_gate_toc_pdf',
    conceptId: 'gate_toc',
    domainId: 'gate_cs',
    title: 'IIT Madras Lecture Handout: Automata & State Complexity.pdf',
    type: 'pdf',
    fileName: 'GATE_CS_Automata_Handbook_2026.pdf',
    fileSize: '3.4 MB',
    pageCount: 18,
    content: `[GATE ACADEMIC HANDOUT: IISc & IIT COMMITTEE CURRICULUM]
Document: Advanced Automata Synthesis & Boundary Invariants
Module: GATE Computer Science Paper (CS-101)

SECTION 1: NFA TO DFA CONVERSION TRAPS
In competitive GATE problems, the primary trap involves epsilon transitions and reachable states. When converting an NFA with ε-moves:
- First compute ε-closure(q) for every state.
- Transition δ'(S, a) = ε-closure( ⋃_{q ∈ S} δ(q, a) ).
- The initial state of the DFA is ε-closure(q0), NOT merely {q0}.
- Any state containing at least one state from F is an accepting state in the DFA.

SECTION 2: MINIMAL DFA VIA TABLE-FILLING (MYHILL-NERODE)
1. Mark all pairs (p, q) where p ∈ F and q ∉ F as distinct.
2. For unmarked pairs (p, q), if for any symbol a ∈ Σ, the pair (δ(p, a), δ(q, a)) is marked, mark (p, q).
3. Repeat step 2 until no new pairs can be marked.
4. Merge all mutually unmarked equivalent states into super-states.

SECTION 3: FORMULAS AND BOUNDS
- Maximum states in powerset construction: 2^|Q|
- Minimum states for strings with substring '101': 4 states over Σ = {0, 1}
- Complement closure: Complementing regular language requires swapping F and (Q - F) ONLY on a complete DFA (trap state included), NEVER directly on an NFA!`,
    createdAt: '2026-08-05T12:00:00Z',
  },
  {
    id: 'res_gate_toc_video',
    conceptId: 'gate_toc',
    domainId: 'gate_cs',
    title: 'NPTEL Video Lecture: Proving Non-Regularity with Pumping Lemma',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=sample_gate_toc',
    durationFormatted: '42:15',
    timestamps: [
      { timeSeconds: 0, timeFormatted: '00:00', title: 'Introduction & Finite Memory Limits', transcriptSnippet: 'Welcome to Lecture 4. Today we demonstrate why finite automata cannot count arbitrarily large numbers.' },
      { timeSeconds: 480, timeFormatted: '08:00', title: 'Pumping Lemma Formal Conditions', transcriptSnippet: 'Notice the three conditions: |y| > 0, |xy| <= p, and xy^i z in L for all i >= 0. Remember, the adversary picks p, you pick s.' },
      { timeSeconds: 1350, timeFormatted: '22:30', title: 'Step-by-step Contradiction for 0^n 1^n', transcriptSnippet: 'Since |xy| <= p, y consists entirely of 0s. Pumping i=0 yields fewer 0s than 1s, breaking the equality.' },
      { timeSeconds: 2100, timeFormatted: '35:00', title: 'Common GATE Pitfalls in Complement Proofs', transcriptSnippet: 'Students often try to complement an NFA by flipping final states. You must determinize first!' },
    ],
    content: `Video Lecture Transcript:
00:00 - Introduction to Automata limits and state saturation.
08:00 - Formal formulation of the Pumping Lemma for regular languages. The adversary selects pumping length p. The prover selects target string s with |s| >= p. The adversary partitions s = xyz. The prover shows that for some i != 1, xy^i z does not belong to L.
22:30 - Detailed case study proving L = {0^n 1^n | n >= 0} is non-regular. Choosing s = 0^p 1^p. Since |xy| <= p, y consists entirely of symbol 0. When we pump with i = 0 (pumping down), the resulting string 0^(p-|y|) 1^p has strictly fewer 0s than 1s, which cannot be in L.
35:00 - Analysis of regular closure properties under reversal, concatenation, Kleene star, and intersection.`,
    createdAt: '2026-08-10T14:30:00Z',
  },

  // ==========================================
  // GATE CS: Compiler Design
  // ==========================================
  {
    id: 'res_gate_compiler_text',
    conceptId: 'gate_compiler',
    domainId: 'gate_cs',
    title: 'Top-Down vs Bottom-Up Parsing & LR Grammar Hierarchies',
    type: 'text_lesson',
    content: `Comprehensive Unit: Compiler Design and Parsing Tables.
A parser validates that a sequence of tokens produced by lexical analysis conforms to the Context-Free Grammar (CFG) G = (V, Σ, R, S).

Key Parsing Paradigms:
1. Top-Down Parsers (LL(k)):
   - Constructs parse tree starting from root symbol S down to leaves.
   - Requires grammars without left recursion (A → Aα) and left factoring.
   - LL(1) parsing table M[A, a] must have NO multiple entries.
   - Condition: For every production A → α | β:
     * FIRST(α) ∩ FIRST(β) = ∅
     * If ε ∈ FIRST(α), then FIRST(β) ∩ FOLLOW(A) = ∅.

2. Bottom-Up Parsers (LR(k)):
   - Shift-reduce parsers building tree from tokens up to start symbol S.
   - Power Hierarchy: LR(0) ⊂ SLR(1) ⊂ LALR(1) ⊂ LR(1).
   - SLR(1) resolves shift-reduce conflicts by looking ahead at FOLLOW(A).
   - LALR(1) merges LR(1) states that have identical core item sets, drastically reducing table size with minimal conflict risk (never introduces shift-reduce conflict, may introduce reduce-reduce conflict).`,
    createdAt: '2026-08-02T10:00:00Z',
  },

  // ==========================================
  // UPSC: Constitutional Polity
  // ==========================================
  {
    id: 'res_upsc_polity_text',
    conceptId: 'upsc_polity_constitution',
    domainId: 'upsc_civil',
    title: 'Constitutional Architecture & The Basic Structure Doctrine',
    type: 'text_lesson',
    content: `Unit: Indian Polity and Constitutional Governance.
The Constitution of India is the supreme law of the land, adopted on 26th November 1949 and enacted on 26th January 1950.

Core Pillars:
1. Preamble: Declares India to be a Sovereign, Socialist, Secular, Democratic Republic securing Justice, Liberty, Equality, and Fraternity.
2. Federalism with Unitary Bias: Described as 'Quasi-Federal' (K.C. Wheare), balancing state autonomy with strong central oversight during emergencies (Articles 352, 356, 360).
3. The Doctrine of Basic Structure:
   - Origin: Kesavananda Bharati v. State of Kerala (1973).
   - Rule: Parliament possesses constituent amending power under Article 368, but this power cannot alter or damage the basic framework or identity of the Constitution.
   - Key Inviolable Elements: Judicial review (Art 32/226), secularism, rule of law, parliamentary democracy, free and fair elections, separation of powers.
4. Constitutional Amendment Mechanisms (Article 368):
   - Simple Majority: Admission of new states, quorum in parliament.
   - Special Majority: 2/3 of members present and voting + majority of total membership (Fundamental Rights, DPSP).
   - Special Majority + State Ratification: Federal provisions (Presidential election, GST council, High Court jurisdiction).`,
    createdAt: '2026-08-01T11:00:00Z',
  },
  {
    id: 'res_upsc_polity_pdf',
    conceptId: 'upsc_polity_constitution',
    domainId: 'upsc_civil',
    title: 'Civil Services Commission Study Dossier: Constitutional Bench Judgments.pdf',
    type: 'pdf',
    fileName: 'UPSC_Polity_Landmark_Judgments_2026.pdf',
    fileSize: '4.1 MB',
    pageCount: 24,
    content: `[UPSC CIVIL SERVICES MAINS & PRELIMS COMPREHENSIVE DOSSIER]
Subject: Indian Polity & Governance (GS Paper II)
Theme: Judicial Evolution of Article 368 and Fundamental Rights

CHRONOLOGY OF BASIC STRUCTURE:
1. Shankari Prasad (1951): Supreme Court held that Parliament could amend any part of the Constitution, including Fundamental Rights, under Article 368.
2. Golak Nath (1967): Eleven-judge bench ruled that Fundamental Rights occupy a transcendental position; Article 368 is only procedural and cannot abridge Part III.
3. 24th Constitutional Amendment (1971): Parliament amended Article 13 and 368 to assert unrestricted amending power.
4. Kesavananda Bharati (1973 - 13 Judge Bench): Overruled Golak Nath, upheld 24th Amendment, but introduced the Doctrine of Basic Structure. Parliament can amend everything EXCEPT basic structure.
5. Minerva Mills (1980): Struck down Section 4 and 55 of the 42nd Amendment. Held that harmony between Part III (Fundamental Rights) and Part IV (DPSP) is an essential facet of basic structure.`,
    createdAt: '2026-08-03T15:00:00Z',
  },
  {
    id: 'res_upsc_polity_video',
    conceptId: 'upsc_polity_constitution',
    domainId: 'upsc_civil',
    title: 'UPSC Masterclass: Understanding Judicial Review & Separation of Powers',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=sample_upsc_polity',
    durationFormatted: '38:40',
    timestamps: [
      { timeSeconds: 0, timeFormatted: '00:00', title: 'Constitutional Supremacy vs Parliamentary Supremacy', transcriptSnippet: 'In the UK, parliament is supreme. In India, the Constitution is supreme.' },
      { timeSeconds: 620, timeFormatted: '10:20', title: 'Articles 13, 32, and 226 Mechanism', transcriptSnippet: 'Article 13 provides the teeth for judicial review, declaring any law inconsistent with Part III void.' },
      { timeSeconds: 1280, timeFormatted: '21:20', title: 'Basic Structure Doctrine in GS Paper II Mains', transcriptSnippet: 'When answering GS II questions on executive overreach, always link to the Minerva Mills and Indira Gandhi v Raj Narain precedents.' },
    ],
    content: `Video Lecture Transcript:
00:00 - Constitutional Supremacy: India adopted constitutional supremacy, distinguishing our legal framework from British parliamentary sovereignty.
10:20 - Mechanism of Judicial Review: Articles 13, 32, and 226 empower the Supreme Court and High Courts to strike down executive and legislative actions that infringe constitutional mandates.
21:20 - Analytical synthesis for UPSC Mains answers: Balancing legislative prerogative with judicial independence.`,
    createdAt: '2026-08-07T09:00:00Z',
  },

  // ==========================================
  // School STEM: Newton's Laws
  // ==========================================
  {
    id: 'res_school_newton_text',
    conceptId: 'school_newton_laws',
    domainId: 'school_stem',
    title: 'Newtonian Dynamics, Inertia, and Conservation of Momentum',
    type: 'text_lesson',
    content: `Chapter: Laws of Motion & Classical Mechanics (Class 11 CBSE/ICSE Physics).
Isaac Newton formulated the three fundamental laws governing translational kinematics and dynamics:

1. First Law (Law of Inertia):
   - Every object remains at rest or in uniform linear motion unless acted upon by a non-zero external net force.
   - Inertia is directly proportional to mass (kg).

2. Second Law (Fundamental Equation of Dynamics):
   - The rate of change of linear momentum of a body is directly proportional to the applied net force and occurs in the direction of the force:
     F_net = dp/dt = d(mv)/dt = m(dv/dt) = m * a (for constant mass).
   - SI Unit: Newton (N) = kg·m/s^2.
   - Impulse J = ∫ F dt = Δp (change in linear momentum).

3. Third Law (Action-Reaction Principle):
   - Whenever body A exerts a force on body B (Action), body B simultaneously exerts an equal and opposite force on body A (Reaction):
     F_AB = - F_BA.
   - Critical Invariant: Action and reaction act on TWO DIFFERENT BODIES and therefore NEVER cancel each other out!

Conservation of Linear Momentum:
In an isolated system with zero external force (F_ext = 0):
P_initial = P_final => m1*v1_initial + m2*v2_initial = m1*v1_final + m2*v2_final.`,
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'res_school_newton_pdf',
    conceptId: 'school_newton_laws',
    domainId: 'school_stem',
    title: 'Secondary Board Physics Revision Guide: Free Body Diagrams & Equations.pdf',
    type: 'pdf',
    fileName: 'CBSE_Class11_Laws_of_Motion_Revision.pdf',
    fileSize: '2.8 MB',
    pageCount: 12,
    content: `[NATIONAL SECONDARY BOARD REVISION DOSSIER: CLASS 11 PHYSICS]
Key Topic: Free Body Diagrams (FBD) and Constraint Relations

STANDARD PROBLEM-SOLVING PROTOCOL:
Step 1: Isolate the body of interest.
Step 2: Draw all external forces acting ON the body:
  - Weight W = mg pointing vertically downward towards Earth center.
  - Normal reaction force N perpendicular to the contact surface.
  - Tension T pulling away from the body along the taut string.
  - Friction force f = μN opposing relative sliding velocity.
Step 3: Resolve forces into orthogonal Cartesian axes (along motion direction and perpendicular).
Step 4: Set Σ F_parallel = m * a, and Σ F_perpendicular = 0.

SAMPLE EXAMPLES:
- Atwood Machine (Two masses m1, m2 over frictionless pulley):
  Acceleration a = ((m1 - m2) / (m1 + m2)) * g.
  Tension T = (2 * m1 * m2 / (m1 + m2)) * g.`,
    createdAt: '2026-08-04T10:00:00Z',
  },

  // ==========================================
  // CS Foundations: Arrays & Contiguous Memory
  // ==========================================
  {
    id: 'res_cs_arrays_text',
    conceptId: 'arrays',
    domainId: 'cs_foundations',
    title: 'Contiguous Memory Allocation & Cache-Aware Array Engineering',
    type: 'text_lesson',
    content: `Unit: Linear Data Structures - Contiguous Arrays.
An array is a linear collection of elements of homogeneous data type placed in contiguous memory locations.

Core Properties & Memory Addressing:
- Address Calculation Formula:
  Address(A[i]) = BaseAddress + i * sizeof(Element).
  For 2D row-major order: Address(A[r][c]) = BaseAddress + (r * TotalCols + c) * sizeof(Element).
  For 2D col-major order: Address(A[r][c]) = BaseAddress + (c * TotalRows + r) * sizeof(Element).
- Time Complexity:
  * Index Access (A[i]): O(1) instantaneous calculation.
  * Append at End (Dynamic Array): O(1) amortized.
  * Insertion at Arbitrary Index: O(n) due to shifting elements.
  * Deletion at Arbitrary Index: O(n) due to shifting elements.
  * Search (Unsorted): O(n) linear scan.
  * Search (Sorted): O(log n) via Binary Search.
- Hardware & CPU Cache Optimization:
  Due to spatial locality, modern CPU prefetchers load adjacent array elements into L1/L2 caches in 64-byte cache lines. Traversing arrays sequentially maximizes cache hit ratios (>98%), running orders of magnitude faster than pointer-chasing in linked lists.`,
    createdAt: '2026-08-01T09:00:00Z',
  },
];
