export type ActivityKind = "face" | "object" | "sleep" | "game";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  createdAt: number;
  profileId?: string;
  profileName?: string;
};

const STORAGE_KEY = "deteccion-movimientos.activity-events";
const MAX_EVENTS = 80;

export function loadActivityEvents(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ActivityEvent[];
    return Array.isArray(parsed) ? parsed.filter((event) => Boolean(event.id)) : [];
  } catch {
    return [];
  }
}

export function saveActivityEvents(events: ActivityEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
}

export function createActivityEvent(
  input: Omit<ActivityEvent, "id" | "createdAt">,
): ActivityEvent {
  return {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };
}
