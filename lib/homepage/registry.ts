import type { HomepageSectionType } from "./view-model";
export const homepageSectionRegistry:Record<HomepageSectionType,{className:string}>={hero:{className:"hero"},content:{className:"intro-band cms-managed-section"},reminders:{className:"life cms-reminders-section"}};
export function isHomepageSectionType(value: string): value is HomepageSectionType { return Object.prototype.hasOwnProperty.call(homepageSectionRegistry, value); }
