import { WebsiteDocument, WebsiteRecord } from "@/lib/validations/website";

export type DeviceMode = "desktop" | "tablet" | "mobile";

export type StudioView = "gallery" | "editor";

export interface EditorState {
  website: WebsiteRecord | null;
  document: WebsiteDocument;
  selectedSectionId: string | null;
  deviceMode: DeviceMode;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  canUndo: boolean;
  canRedo: boolean;
}

let entityCounter = 1000;
export function generateId(prefix = "entity"): string {
  entityCounter += 1;
  return `${prefix}_${entityCounter}`;
}
