// Invalidates in-flight template results before account or staff projection resets.
let epoch = 0;
export const preparationTemplateScopeEpoch = () => epoch;
export function invalidatePreparationTemplateScope() { epoch += 1; }
