import type React from 'react';
import type { OrgLogoId } from './orgLogos';
// orgLogos.tsx only exports the dispatcher component; recreate a map if needed later.
// Placeholder: if individual logo components are required as a map, they should be exported separately.
// For now we expose an empty map to satisfy imports without causing build failure.
export const ORG_LOGO_MAP = {} as Record<OrgLogoId, React.FC<{ size?: number; className?: string }>>;
