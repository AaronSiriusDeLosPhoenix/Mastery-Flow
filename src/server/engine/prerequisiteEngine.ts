import { Concept, ConceptMastery, SystemConfig } from '../db/types.js';

export interface PrerequisiteCheckResult {
  satisfied: boolean;
  missingPrerequisites: {
    conceptId: string;
    conceptName: string;
    currentMastery: number;
    requiredThreshold: number;
  }[];
}

/**
 * Checks if all prerequisites for a target concept meet the configured threshold.
 * Supports evaluating against either hybrid mastery or direct BKT knowledge probability.
 */
export function checkPrerequisites(
  targetConcept: Concept,
  conceptMasteries: Record<string, ConceptMastery>,
  conceptsMap: Map<string, Concept>,
  threshold: number,
  options?: { useBktDirectly?: boolean }
): PrerequisiteCheckResult {
  const missingPrerequisites: PrerequisiteCheckResult['missingPrerequisites'] = [];

  for (const prereqId of targetConcept.prerequisites) {
    const prereqMastery = conceptMasteries[prereqId];
    const prereqConcept = conceptsMap.get(prereqId);
    
    // Evaluate against BKT mastery if explicitly requested and available, else hybrid mastery
    const currentScore = prereqMastery
      ? (options?.useBktDirectly && prereqMastery.bktMastery !== undefined
          ? prereqMastery.bktMastery
          : prereqMastery.mastery)
      : 0;

    if (currentScore < threshold) {
      missingPrerequisites.push({
        conceptId: prereqId,
        conceptName: prereqConcept ? prereqConcept.name : prereqId,
        currentMastery: currentScore,
        requiredThreshold: threshold,
      });
    }
  }

  return {
    satisfied: missingPrerequisites.length === 0,
    missingPrerequisites,
  };
}

/**
 * Returns topologically sorted concept list ensuring prerequisites come first
 */
export function getTopologicalOrder(concepts: Concept[]): Concept[] {
  const sorted: Concept[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Cycle detected in prerequisite graph at ${id}`);
    }
    visiting.add(id);
    const concept = conceptMap.get(id);
    if (concept) {
      for (const p of concept.prerequisites) {
        visit(p);
      }
      visited.add(id);
      sorted.push(concept);
    }
    visiting.delete(id);
  }

  for (const c of concepts) {
    if (!visited.has(c.id)) {
      visit(c.id);
    }
  }

  return sorted;
}
