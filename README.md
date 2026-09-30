# MasteryFlow
### Evidence-Driven Adaptive Learning & Intervention Engine
**YUVA Megathon 2026 EduGenAI Challenge — Track 4: MasteryFlow**

---

## 1. Executive Summary & Challenge Alignment
Current learning platforms typically treat mastery as a superficial metric—calculating basic percentage-correct scores or relying entirely on non-deterministic Large Language Models (LLMs) to hallucinate student progress. 

**MasteryFlow** introduces a **deterministic, evidence-driven learner model** backed by cognitive science principles. MasteryFlow calculates true comprehension using a multi-signal evidence vector that accounts for correctness, self-reported confidence, question cognitive depth, response duration, and independence from hints.

### Core Architectural Mandate
- **No LLM Mastery Calculations:** The deterministic engine remains the sole authority for learner state, prerequisite traversal, and action recommendations.
- **Explainable Multi-Signal Evidence:** Every recommendation explains *why* it was selected with an inspectable evidence breakdown.
- **Anti-Guessing & Brute-Force Resistance:** Rapid clicking, multiple retries, and hint crutches trigger heuristic damping, preventing false mastery inflation.
- **Ebbinghaus Forgetting Model:** Spaced retrieval tracking proactively flags decayed concepts for review before foundational knowledge collapses.
- **Human-in-the-Loop Governance:** Educators maintain complete override authority with immutable audit trails.

---

## 2. Mathematical Formulations

### A. Multi-Signal Evidence Score ($E$)
For any attempted question $q$ by learner $L$, the raw evidence $E$ is computed across five cognitive signals:

$$E = w_1 \cdot S_{\text{correct}} + w_2 \cdot S_{\text{conf}} + w_3 \cdot S_{\text{diff}} + w_4 \cdot S_{\text{speed}} + w_5 \cdot S_{\text{indep}}$$

**Default Weights:**
- $w_1 = 0.45$ (Correctness)
- $w_2 = 0.20$ (Self-Assessed Confidence: $0.2 \to 1.0$)
- $w_3 = 0.15$ (Question Difficulty: Easy $0.6$, Medium $0.85$, Hard $1.0$)
- $w_4 = 0.10$ (Response-Time Signal: Penalizes rapid clicks $<3\text{s}$ or severe overtime)
- $w_5 = 0.10$ (Independence Signal: Penalizes hint usage and repeated retries)

#### Anti-Guessing Damping
If an attempt is submitted in $<3.0\text{s}$, or involves $\ge 2$ retries, or has confidence $<35\%$ paired with hint dependency:
$$E_{\text{damped}} = E \times 0.50$$
Uncertainty $U$ increases by $+0.15$.

### B. Mastery State Exponential Smoothing
Mastery updates incrementally upon each attempt using exponential smoothing:
$$\text{Mastery}_{t} = (1 - \alpha) \cdot \text{Mastery}_{t-1} + \alpha \cdot E$$
*Default learning rate $\alpha = 0.35$ (fully configurable in Admin Settings).*

### C. Retention & Forgetting Decay (Ebbinghaus Model)
Memory decay is modeled as an exponential curve based on days elapsed since the last review:
$$\text{Retention}(t) = \text{Mastery} \times e^{-\lambda \cdot \Delta t}$$
*Where $\lambda = 0.045\text{/day}$ and $\Delta t$ is days since last active practice on that concept.*
When $\text{Retention} < 0.65$ on a concept with historical mastery $\ge 0.75$, the engine triggers a **`REVIEW`** action.

### D. Model Uncertainty ($U$)
Tracks the epistemic confidence of the engine ($0.0 \to 1.0$):
- **Decreases** when answers are correct, independent ($\text{hints} = 0$), and confident.
- **Increases** during early cold-start ($\le 2$ attempts), when guessing is detected, or when high confidence conflicts with an incorrect answer (misconception penalty).

---

## 3. Prerequisite Dependency Graph (DAG)
The demonstration course **Data Structures Fundamentals** features 10 concepts organized into a strict cognitive DAG:

```
[Arrays] ───────────┬──────────────┬─────────────┬──────────────────┐
  │                 │              │             │                  │
  ▼                 ▼              ▼             ▼                  │
[Linked Lists]   [Stacks]       [Queues]   [Searching & Sorting]    │
                                                 │                  │
                                                 ▼                  │
[Recursion] ──────────────────────────┐      [Hashing]              │
  │                                   │                             │
  ▼                                   │                             │
[Trees] ────────────┬─────────────────┘                             │
  │                 │                                               │
  ▼                 ▼                                               │
[BST]            [Graphs]                                           │
```

### Action Logic Matrix
1. **`TEACHER_INTERVENTION`**: Triggered if consecutive failures $\ge 3$ or learner is stuck in recursive loops.
2. **`REVIEW`**: Triggered when previously mastered concepts experience retention decay ($\text{Retention} < 65\%$).
3. **`REMEDIATE_PREREQUISITE`**: Triggered if candidate concept's prerequisites have mastery $< 70\%$.
4. **`PRACTICE`**: Triggered if concept mastery $< 75\%$ or if basic accuracy is solid but high-order **Transfer** accuracy $< 50\%$.
5. **`ADVANCE`**: Triggered when prerequisites are satisfied and learner is cleared for the next topical unit.
6. **`CHALLENGE`**: Triggered when concept mastery $\ge 88\%$ and transfer accuracy $\ge 75\%$.

---

## 4. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   (Dashboard, DAG Graph, Diagnostic, Learn, Audit)    │
└──────────────────────────┬─────────────────────────────┘
                           │ REST / JSON
┌──────────────────────────▼─────────────────────────────┐
│                 Express Server (/api/*)                │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌─────────────────┐
│Mastery Engine│   │Retention Eng.│   │Prerequisite Eng.│
└──────┬───────┘   └──────┬───────┘   └────────┬────────┘
       │                  │                    │
       └──────────────────┼────────────────────┘
                          ▼
               ┌──────────────────────┐
               │    Decision Engine   │
               │   ("Why This Next")  │
               └──────────┬───────────┘
                          ▼
               ┌──────────────────────┐
               │ Persistent DataStore │
               │ (Learners, Attempts) │
               └──────────────────────┘
```

---

## 5. Automated Evaluation & Stress-Test Center
MasteryFlow features an in-app verification suite that tests 6 core adversarial scenarios against the real mathematical engine:

| Test ID | Test Scenario | Expected Result | Pass Criteria |
|---|---|---|---|
| **TEST 1** | Easy Correct $\to$ Hard Transfer Failure | Mastery remains below threshold ($<75\%$) | Transfer failure caps mastery inflation |
| **TEST 2** | Strong Target Concept with Weak Prerequisite | System blocks progression | Returns `REMEDIATE_PREREQUISITE` |
| **TEST 3** | Repeated Rapid Guessing ($<3\text{s}$, 3 retries) | Anti-guessing filter triggers | $50\%$ evidence damping + uncertainty increase |
| **TEST 4** | 21-Day Gap Without Practice | Ebbinghaus decay recognized | Returns `REVIEW` recommendation |
| **TEST 5** | Faculty Pedagogical Override | Override replaces autonomous output | Auditable log persisted with justification |
| **TEST 6** | Same Headline Score $\to$ Different History | Autonomous actions diverge | Student A $\to$ `ADVANCE`, Student B $\to$ `REMEDIATE` |

---

## 6. Pre-Seeded Demonstration Personas

1. **Alex Rivera (`student_a`)**:
   - High performer, independent learner, strong prerequisite foundations.
   - High confidence ($0.90$), 0 hints used, $85\%$ transfer accuracy.
   - **Recommendation:** `ADVANCE` to Binary Search Trees.

2. **Blake Chen (`student_b`)**:
   - Struggling with prerequisite foundations (Arrays: $52\%$, Recursion: $42\%$).
   - Low confidence ($0.35$), heavy hint usage ($5+$), 4 retries, poor transfer.
   - **Recommendation:** `REMEDIATE_PREREQUISITE` targeting Arrays.

3. **Maya Patel (`student_c`)**:
   - Stuck learner with 4 consecutive failures on Recursion base cases.
   - **Recommendation:** `TEACHER_INTERVENTION` with faculty alert.

4. **Jordan Lee (`student_new`)**:
   - Fresh student ready to take the 10-question Cold-Start Diagnostic assessment.

5. **Prof. Alistair Vance (`teacher_1`)**:
   - Course director with cohort monitoring, stuck learner triage, and override authority.

---

## 7. Setup & Run Instructions

```bash
# 1. Install dependencies
npm install

# 2. Run the full-stack development server
npm run dev

# The applet runs on http://0.0.0.0:3000
```

### Environment Variables (`.env`)
```env
GEMINI_API_KEY="your-api-key"   # Optional: For Gemini concept intuition and teacher advice
PORT=3000                      # Default server port
```
*Note: If no Gemini API key is provided, the engine automatically uses deterministic pedagogical fallbacks with zero interruption.*

---

## 8. Guided Judge Demo Flow (Step-by-Step)
Click the prominent **DEMO MODE** button in the header navigation to launch the 16-step guided walkthrough covering every judging criteria for Track 4: MasteryFlow!
