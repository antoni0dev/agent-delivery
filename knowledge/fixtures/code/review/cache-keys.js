export function accountResourceKey({ accountId, resourceId }) {
  return ["resource", resourceId];
}

export function localLabelKey(resourceId) {
  return ["local-label", resourceId];
}
