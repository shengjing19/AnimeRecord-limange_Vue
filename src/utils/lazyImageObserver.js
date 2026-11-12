export const LAZY_ROOT_MARGIN = 520;

const viewportRootKey = {};
const observerRecords = new WeakMap();

function getRootKey(root) {
  return root || viewportRootKey;
}

function getObserverRecord(root) {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  const rootKey = getRootKey(root);
  let record = observerRecords.get(rootKey);
  if (record) return record;

  const callbacks = new WeakMap();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting && entry.intersectionRatio <= 0) return;

        const callback = callbacks.get(entry.target);
        if (!callback) return;

        observer.unobserve(entry.target);
        callbacks.delete(entry.target);
        callback();
      });
    },
    {
      root,
      rootMargin: `${LAZY_ROOT_MARGIN}px 0px`,
      threshold: 0
    }
  );

  record = { observer, callbacks };
  observerRecords.set(rootKey, record);
  return record;
}

export function observeLazyImageTarget(target, root, onVisible) {
  const record = getObserverRecord(root);
  if (!record) {
    onVisible();
    return () => {};
  }

  record.callbacks.set(target, onVisible);
  record.observer.observe(target);

  return () => {
    record.callbacks.delete(target);
    record.observer.unobserve(target);
  };
}
