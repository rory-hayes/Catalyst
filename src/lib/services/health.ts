import { differenceInDays } from "date-fns";

export type HealthInputs = {
  now: Date;
  closeDate: Date | null;
  lastActivityAt: Date | null;
  nextStep: string | null;
  stageMovedCount30d: number;
  missingRequiredFields: number;
};

export function deriveHealth(inputs: HealthInputs): "GREEN" | "YELLOW" | "RED" {
  const { now, closeDate, lastActivityAt, nextStep, stageMovedCount30d, missingRequiredFields } = inputs;

  if (!nextStep || (closeDate !== null && closeDate < now)) {
    return "RED";
  }

  if (lastActivityAt !== null && differenceInDays(now, lastActivityAt) >= 14) {
    return "RED";
  }

  if (stageMovedCount30d >= 2 || missingRequiredFields > 0) {
    return "YELLOW";
  }

  return "GREEN";
}

export function computeStale(lastUpdateAt: Date | null, staleDays: number, now = new Date()): boolean {
  if (!lastUpdateAt) {
    return true;
  }

  return differenceInDays(now, lastUpdateAt) >= staleDays;
}
