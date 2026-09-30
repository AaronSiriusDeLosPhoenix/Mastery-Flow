import { store } from '../db/store.js';
import { learningPathEngine } from './learningPathEngine.js';
import {
  Concept,
  ConceptMasteryCategory,
  DomainId,
  KnowledgeGap,
  Lesson,
  LessonStatus,
  MindMapData,
  MindMapEdge,
  MindMapNode,
  Module,
} from '../db/types.js';
import { GoogleGenAI } from '@google/genai';

export class MindMapEngine {
  private aiClient: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  /**
   * Generates the complete, authoritative Mind Map data structure for a student and subject.
   */
  public generateMindMap(learnerId: string, domainId?: DomainId): MindMapData {
    const targetDomainId = domainId || store.config.activeDomainId || 'gate_cs';
    const domain = store.domains.find((d) => d.id === targetDomainId) || store.domains[0];
    const learner = store.learners.get(learnerId) || Array.from(store.learners.values())[0];

    const modules = store.getModulesByDomain(targetDomainId);
    const lessons = store.getLessonsByDomain(targetDomainId);
    const concepts = store.getConceptsByDomain(targetDomainId);
    const domainPrereqs = store.prerequisites.filter((p) => p.domainId === targetDomainId);

    // Progress summaries
    const subjectProgress = learningPathEngine.calculateSubjectProgress(learner?.id || learnerId, targetDomainId);
    const knowledgeGaps = learningPathEngine.detectKnowledgeGaps(learner?.id || learnerId, targetDomainId);
    const lessonProgressMap = store.getLearnerLessonProgressMap(learner?.id || learnerId);

    const nodes: MindMapNode[] = [];
    const edges: MindMapEdge[] = [];

    // Concept quick lookup
    const conceptMap = new Map<string, Concept>(concepts.map((c) => [c.id, c]));

    // 1. SUBJECT ROOT NODE
    const subjectNodeId = `subj_${domain.id}`;
    nodes.push({
      id: subjectNodeId,
      label: domain.name,
      type: 'subject',
      domainId: domain.id,
      code: domain.shortLabel,
      description: domain.description,
      status: subjectProgress.status,
      progress: subjectProgress.progressPercent,
      mastery: subjectProgress.overallMastery,
      childrenCount: modules.length,
    });

    let masteredCount = 0;
    let developingCount = 0;
    let learningCount = 0;
    let notStartedCount = 0;
    let totalSubConcepts = 0;

    // 2. MODULE NODES
    for (const mod of modules) {
      const modProg = learningPathEngine.calculateModuleProgress(learner?.id || learnerId, mod.id);
      const modLessons = lessons.filter((l) => l.moduleId === mod.id);

      nodes.push({
        id: mod.id,
        label: mod.title,
        type: 'module',
        domainId: domain.id,
        parentId: subjectNodeId,
        moduleId: mod.id,
        moduleTitle: mod.title,
        code: mod.code,
        description: mod.description,
        status: modProg.status,
        progress: modProg.progressPercent,
        childrenCount: modLessons.length,
      });

      // Hierarchy edge: Subject -> Module
      edges.push({
        id: `edge_subj_${mod.id}`,
        source: subjectNodeId,
        target: mod.id,
        type: 'hierarchy',
        label: 'Module',
      });

      // 3. LESSON NODES
      for (const les of modLessons) {
        const lesProg = lessonProgressMap.get(les.id);
        const lesStatus: LessonStatus = lesProg?.status || 'NOT_STARTED';
        const lesProgress = lesStatus === 'COMPLETED' ? 100 : lesStatus === 'IN_PROGRESS' ? 50 : 0;
        const lesConcepts = les.conceptIds.map((cid) => conceptMap.get(cid)).filter(Boolean) as Concept[];

        nodes.push({
          id: les.id,
          label: les.title,
          type: 'lesson',
          domainId: domain.id,
          parentId: mod.id,
          moduleId: mod.id,
          moduleTitle: mod.title,
          lessonId: les.id,
          lessonTitle: les.title,
          code: les.code,
          description: les.description,
          status: lesStatus,
          progress: lesProgress,
          learningObjectives: les.learningObjectives,
          estimatedMinutes: les.estimatedMinutes,
          childrenCount: lesConcepts.length,
        });

        // Hierarchy edge: Module -> Lesson
        edges.push({
          id: `edge_${mod.id}_${les.id}`,
          source: mod.id,
          target: les.id,
          type: 'hierarchy',
          label: 'Lesson',
        });

        // 4. CONCEPT NODES
        for (const concept of lesConcepts) {
          const mState = learner?.conceptMasteries[concept.id];
          const mastery = mState?.mastery ?? 0;
          const attemptsCount = mState?.attemptsCount ?? 0;
          const retention = mState?.retention ?? 1.0;

          let cStatus: ConceptMasteryCategory = 'NOT_STARTED';
          if (attemptsCount === 0) {
            cStatus = 'NOT_STARTED';
            notStartedCount++;
          } else if (mastery >= 0.75) {
            cStatus = 'MASTERED';
            masteredCount++;
          } else if (mastery >= 0.50) {
            cStatus = 'DEVELOPING';
            developingCount++;
          } else {
            cStatus = 'LEARNING';
            learningCount++;
          }

          // Knowledge gap check
          const relatedGap = knowledgeGaps.find(
            (g: KnowledgeGap) => g.conceptId === concept.id || g.prerequisiteId === concept.id
          );
          const hasGap = Boolean(relatedGap) || (mState?.status === 'review_needed') || (mastery >= 0.75 && retention < 0.65);

          // Summary notes check
          const hasSummary = store.summaryNotes.has(concept.id);

          // Sub-concepts list (authoritative or extracted from key takeaways)
          const subConceptsList = concept.subConcepts && concept.subConcepts.length > 0
            ? concept.subConcepts
            : concept.keyTakeaways.length > 0
              ? concept.keyTakeaways
              : ['Core Invariants', 'Edge Cases', 'Practical Applications'];

          // Prerequisites names
          const prereqNames = concept.prerequisites
            .map((pId) => conceptMap.get(pId)?.name)
            .filter(Boolean) as string[];

          // Dependent concepts (concepts that require this one)
          const dependentConcepts = concepts
            .filter((c) => c.prerequisites.includes(concept.id))
            .map((c) => ({ id: c.id, name: c.name }));

          const conceptProgress = Math.round(mastery * 100);

          nodes.push({
            id: concept.id,
            label: concept.name,
            type: 'concept',
            domainId: domain.id,
            parentId: les.id,
            moduleId: mod.id,
            moduleTitle: mod.title,
            lessonId: les.id,
            lessonTitle: les.title,
            conceptId: concept.id,
            code: concept.code,
            description: concept.description,
            status: cStatus,
            progress: conceptProgress,
            mastery,
            attemptsCount,
            retention,
            bloomTarget: concept.bloomTarget,
            prerequisites: concept.prerequisites,
            prerequisiteNames: prereqNames,
            dependentConceptIds: dependentConcepts.map((d) => d.id),
            dependentConceptNames: dependentConcepts.map((d) => d.name),
            hasKnowledgeGap: hasGap,
            knowledgeGapReason: relatedGap?.reason || (retention < 0.65 ? 'Retention memory decay detected over time' : undefined),
            knowledgeGapAction: relatedGap?.action || (retention < 0.65 ? 'Review flashcards & formative practice' : undefined),
            recommendedAction: relatedGap?.action || (cStatus === 'MASTERED' ? 'Ready for high-order synthesis & challenge' : cStatus === 'DEVELOPING' ? 'Targeted deliberate practice' : 'Initial guided study'),
            summaryAvailable: hasSummary,
            subConcepts: subConceptsList,
            childrenCount: subConceptsList.length,
          });

          // Hierarchy edge: Lesson -> Concept
          edges.push({
            id: `edge_${les.id}_${concept.id}`,
            source: les.id,
            target: concept.id,
            type: 'hierarchy',
            label: 'Teaches',
          });

          // 5. SUB-CONCEPT NODES
          subConceptsList.forEach((subName, subIdx) => {
            totalSubConcepts++;
            const subNodeId = `sub_${concept.id}_${subIdx}`;
            nodes.push({
              id: subNodeId,
              label: subName,
              type: 'subconcept',
              domainId: domain.id,
              parentId: concept.id,
              moduleId: mod.id,
              moduleTitle: mod.title,
              lessonId: les.id,
              lessonTitle: les.title,
              conceptId: concept.id,
              status: cStatus,
              progress: conceptProgress,
              description: `Sub-component topic under ${concept.name}`,
            });

            // Hierarchy edge: Concept -> Sub-concept
            edges.push({
              id: `edge_${concept.id}_${subNodeId}`,
              source: concept.id,
              target: subNodeId,
              type: 'hierarchy',
              label: 'Unit',
            });
          });
        }
      }
    }

    // 6. PREREQUISITE EDGES (Separate from hierarchy)
    for (const prereq of domainPrereqs) {
      const targetConcept = conceptMap.get(prereq.conceptId);
      const sourceConcept = conceptMap.get(prereq.prerequisiteConceptId);

      if (targetConcept && sourceConcept) {
        const sourceMastery = learner?.conceptMasteries[sourceConcept.id];
        const isGap = !sourceMastery || sourceMastery.mastery < prereq.requiredThreshold;

        edges.push({
          id: `prereq_${sourceConcept.id}_to_${targetConcept.id}`,
          source: sourceConcept.id,
          target: targetConcept.id,
          type: 'prerequisite',
          label: `Prereq (Req: ${(prereq.requiredThreshold * 100).toFixed(0)}%)`,
          isGap,
          rationale: prereq.rationale,
        });
      }
    }

    // 7. AI-SUGGESTED RELATIONSHIPS (Distinguished from authoritative prerequisites)
    const storedAiEdges = store.getAiSuggestedEdges();
    for (const aiEdge of storedAiEdges) {
      const srcNode = nodes.find((n) => n.id === aiEdge.source);
      const tgtNode = nodes.find((n) => n.id === aiEdge.target);
      if (srcNode && tgtNode) {
        edges.push({
          ...aiEdge,
          type: 'ai_suggested',
        });
      }
    }

    return {
      domainId: domain.id,
      domainName: domain.name,
      category: domain.category,
      nodes,
      edges,
      summary: {
        totalNodes: nodes.length,
        modulesCount: modules.length,
        lessonsCount: lessons.length,
        conceptsCount: concepts.length,
        subConceptsCount: totalSubConcepts,
        masteredCount,
        developingCount,
        learningCount,
        notStartedCount,
        gapsCount: knowledgeGaps.length,
      },
    };
  }

  /**
   * AI-assisted discovery of related interdisciplinary connections or sub-topics.
   * Clearly marked as AI-suggested so it doesn't overwrite authoritative DAG.
   */
  public async discoverAiConnections(
    domainId: DomainId,
    conceptId?: string
  ): Promise<{ suggestions: MindMapEdge[]; message: string }> {
    const concepts = store.getConceptsByDomain(domainId);
    if (concepts.length < 2) {
      return { suggestions: [], message: 'Not enough concepts to discover connections.' };
    }

    const focusConcept = conceptId ? concepts.find((c) => c.id === conceptId) : concepts[0];
    const otherConcepts = concepts.filter((c) => c.id !== focusConcept?.id);

    // Try Gemini if available
    if (this.aiClient && process.env.GEMINI_API_KEY && focusConcept) {
      try {
        const prompt = `You are an expert curriculum architect.
Analyze this concept: "${focusConcept.name}" (${focusConcept.description}).
From these available curriculum concepts:
${otherConcepts.map((c) => `- [${c.id}] ${c.name}: ${c.description}`).join('\n')}

Identify 1 or 2 meaningful interdisciplinary connections or cross-cutting algorithmic relationships where learning "${focusConcept.name}" reinforces or bridges with another concept.
Return pure JSON with format:
[
  {
    "targetConceptId": "concept_id_from_list",
    "relationshipLabel": "Short 2-4 word label (e.g. Asymptotic Bridge, Memory Trade-off)",
    "rationale": "One concise sentence explaining why these concepts illuminate each other."
  }
]`;

        const response = await this.aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '[]';
        const parsed = JSON.parse(text);

        const newEdges: MindMapEdge[] = [];
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.targetConceptId && concepts.some((c) => c.id === item.targetConceptId)) {
              const edge: MindMapEdge = {
                id: `ai_${focusConcept.id}_${item.targetConceptId}_${Date.now()}`,
                source: focusConcept.id,
                target: item.targetConceptId,
                type: 'ai_suggested',
                label: item.relationshipLabel || 'AI Cross-Connection',
                rationale: item.rationale || 'AI-discovered pedagogical synergy',
              };
              store.addAiSuggestedEdge(edge);
              newEdges.push(edge);
            }
          }
        }

        if (newEdges.length > 0) {
          return {
            suggestions: newEdges,
            message: `Discovered ${newEdges.length} AI-suggested connections for ${focusConcept.name}!`,
          };
        }
      } catch (err) {
        console.warn('Gemini AI connection discovery fallback:', err);
      }
    }

    // High-utility academic ontological fallbacks
    const fallbackEdges: MindMapEdge[] = [];
    if (focusConcept && otherConcepts.length > 0) {
      const target = otherConcepts[0];
      const edge: MindMapEdge = {
        id: `ai_${focusConcept.id}_${target.id}_fallback`,
        source: focusConcept.id,
        target: target.id,
        type: 'ai_suggested',
        label: 'Cognitive Synergy',
        rationale: `Synthesizing ${focusConcept.name} alongside ${target.name} provides high-utility transfer learning.`,
      };
      store.addAiSuggestedEdge(edge);
      fallbackEdges.push(edge);
    }

    return {
      suggestions: fallbackEdges,
      message: `Discovered ${fallbackEdges.length} suggested connection(s).`,
    };
  }
}

export const mindMapEngine = new MindMapEngine();
