import type React from 'react';
import type { OrgLogoId } from './orgLogos';
import { orgLogos as internalMap } from './orgLogos';
// Re-export to avoid mixing non-component exports in the main logo component file.
export const ORG_LOGO_MAP: Record<OrgLogoId, React.FC<{ size?: number; className?: string }>> = internalMap;
