import type { ComponentType } from "react";
import type { ToolResult } from "@/data/services/types";

export interface ServiceToolProps {
  /** Call once, on the first interaction. */
  onStart: () => void;
  /** Live inputs, so the visual can follow the visitor as they type. */
  onChange: (data: Record<string, unknown>) => void;
  /** The answer, or null when inputs no longer give one. */
  onResult: (result: ToolResult | null) => void;
}

export interface ServiceVisualProps {
  data: Record<string, unknown>;
  result: ToolResult | null;
}

export interface ServiceModule {
  Tool: ComponentType<ServiceToolProps>;
  Visual: ComponentType<ServiceVisualProps>;
}
