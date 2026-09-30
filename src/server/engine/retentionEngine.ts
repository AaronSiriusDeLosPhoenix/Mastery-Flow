import { ConceptMastery, SystemConfig } from '../db/types.js';

/**
 * Calculates current retention using Ebbinghaus-style exponential forgetting curve:
 * retention = mastery * exp(-decay_rate * days_since_last_review)
 */
export function calculateRetention(
  mastery: number,
  daysSinceLastReview: number,
  decayRate: number
): number {
  if (daysSinceLastReview <= 0) {
    return mastery;
  }
  // Exponential decay model
  const retention = mastery * Math.exp(-decayRate * daysSinceLastReview);
  return Math.round(Math.max(0.0, Math.min(mastery, retention)) * 1000) / 1000;
}

/**
 * Evaluates whether a concept is experiencing critical retention decay requiring review
 */
export function isReviewNeeded(
  conceptMastery: ConceptMastery,
  config: SystemConfig
): { needed: boolean; reason?: string } {
  // If concept was never attempted or is very low mastery, they need practice rather than review
  if (conceptMastery.attemptsCount === 0 || conceptMastery.mastery < 0.50) {
    return { needed: false };
  }

  // If retention has fallen significantly below historical mastery (e.g. drop >= 20% or retention < 0.60)
  const retentionDrop = conceptMastery.mastery - conceptMastery.retention;
  if (retentionDrop >= 0.18 || (conceptMastery.mastery >= config.masteryThreshold && conceptMastery.retention < 0.65)) {
    return {
      needed: true,
      reason: `Historical mastery is ${(conceptMastery.mastery * 100).toFixed(0)}%, but retention has decayed to ${(conceptMastery.retention * 100).toFixed(0)}% after ${conceptMastery.daysSinceLastReview.toFixed(0)} days without spaced retrieval practice.`,
    };
  }

  return { needed: false };
}
