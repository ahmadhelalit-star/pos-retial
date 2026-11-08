import { OPTIONAL_MODULES } from '../../../shared/features.js';
export { OPTIONAL_MODULES };

// Presentation policy only. A future server must supply verified activation and enforce it again.
// Never persist this result as a license, or accept local settings as entitlements.
export function canUseModule(moduleId, { activation, settings, permissions } = {}) {
  return OPTIONAL_MODULES.includes(moduleId)
    && activation?.status === 'ACTIVE'
    && activation?.activated === true
    && activation?.product === 'retail'
    && activation?.features?.[moduleId] === true
    && settings?.modules?.[moduleId] === true
    && permissions?.includes(moduleId) === true;
}
