import { useRef, useState, useEffect, ReactNode } from "react";

export function NewsTicker({
  width,
  speed = 50,
  spacing = 20,
  children,
}: {
  /** Max width of the ticker */
  width: number;
  /** Speed of scroll in pixels per second */
  speed?: number;
  /** Spacing between items in pixels */
  spacing?: number;
  /** Elements to display in the ticker */
  children: ReactNode[];
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);

  // Measure width of one set of items
  useEffect(() => {
    if (contentRef.current) {
      // `scrollWidth` doesn't include trimmable margin, so to get `fullWidth` we have to add
      // back the rightmost spacing (otherwise content jumps)
      const fullWidth = contentRef.current.scrollWidth + spacing;
      setContentWidth(fullWidth / 2);
    }
  }, [children, spacing]);

  // Animate via requestAnimationFrame
  useEffect(() => {
    if (contentWidth == null || contentWidth < width) return;

    let animationId: number;
    let lastTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (lastTimestamp !== null) {
        const delta = timestamp - lastTimestamp;
        setOffset((prev) => {
          let next = prev + (speed * delta) / 1000;
          if (next >= contentWidth) {
            next -= contentWidth;
          }
          return next;
        });
      }
      lastTimestamp = timestamp;
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationId);
  }, [width, speed, contentWidth]);

  const containerStyle: React.CSSProperties = {
    width: `${width}px`,
    overflow: "hidden",
    WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
    maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
  };

  const contentStyle: React.CSSProperties = {
    display: "flex",
    transform: `translateX(-${offset}px)`,
  };

  if (contentWidth != null && contentWidth <= width) {
    return (
      <div className="flex" style={{ gap: spacing }}>
        {children}
      </div>
    );
  }

  const items = children.map((child, idx) => (
    <div key={idx} style={{ marginRight: spacing }}>
      {child}
    </div>
  ));

  return (
    <div style={containerStyle}>
      <div style={contentStyle} ref={contentRef}>
        {items}
        {items}
      </div>
    </div>
  );
}
