import { useCallback, useEffect, useRef, useState } from 'react';

export function useVirtualScroll() {
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 1024, height: 600 });

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;

    const updateSize = () => {
      setViewportSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scrollToTop = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, []);

  const onScroll = (event) => setScrollTop(event.currentTarget.scrollTop);

  return {
    scrollRef,
    scrollTop,
    viewportWidth: viewportSize.width,
    viewportHeight: viewportSize.height,
    onScroll,
    scrollToTop,
  };
}

export function getVirtualRange({
  rowCount,
  rowHeight,
  scrollTop,
  viewportHeight,
  overscan = 4,
}) {
  const maxStart = Math.max(0, rowCount - 1);
  const start = Math.min(
    maxStart,
    Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  );
  const visibleRows = Math.ceil(viewportHeight / rowHeight) + overscan * 2;

  return {
    start,
    end: Math.min(rowCount, start + visibleRows + 1),
    totalHeight: Math.max(0, rowCount * rowHeight),
  };
}
