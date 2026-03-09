// # Filename: src/components/ui/collapse/Collapse.tsx
// ✅ New Code

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type CollapsePhase =
  | "collapsed"
  | "expanding"
  | "expanded"
  | "collapsing";

type Props = {
  isOpen: boolean;
  children: ReactNode;
  durationMs?: number;
  unmountOnExit?: boolean;
  className?: string;
  contentClassName?: string;
  onExpandStart?: () => void;
  onExpandEnd?: () => void;
  onCollapseStart?: () => void;
  onCollapseEnd?: () => void;
};

/**
 * usePrefersReducedMotion
 *
 * Detects whether the user prefers reduced motion.
 */
function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Collapse
 *
 * Enterprise-grade height animation component.
 *
 * Responsibilities:
 * - Animate between open/closed states using measured content height
 * - Handle dynamic content changes while expanded
 * - Respect reduced-motion accessibility preferences
 * - Support optional unmount-on-exit behavior
 * - Provide lifecycle callbacks for consumers
 */
export default function Collapse({
  isOpen,
  children,
  durationMs = 320,
  unmountOnExit = false,
  className = "",
  contentClassName = "",
  onExpandStart,
  onExpandEnd,
  onCollapseStart,
  onCollapseEnd,
}: Props) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);

  const prefersReducedMotion = usePrefersReducedMotion();

  const [phase, setPhase] = useState<CollapsePhase>(
    isOpen ? "expanded" : "collapsed",
  );
  const [isMounted, setIsMounted] = useState(isOpen || !unmountOnExit);
  const [height, setHeight] = useState<string>(isOpen ? "auto" : "0px");

  const shouldAnimate = useMemo(() => {
    return !prefersReducedMotion;
  }, [prefersReducedMotion]);

  /**
   * Step 1: Clear any pending transition timeout.
   */
  const clearTransitionTimeout = () => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  };

  /**
   * Step 2: Read the content height safely.
   */
  const getContentHeight = (): number => {
    return innerRef.current?.scrollHeight ?? 0;
  };

  useEffect(() => {
    return () => {
      clearTransitionTimeout();
    };
  }, []);

  useLayoutEffect(() => {
    const outerEl = outerRef.current;
    const innerEl = innerRef.current;

    if (!outerEl || !innerEl) {
      return;
    }

    clearTransitionTimeout();

    if (!shouldAnimate) {
      if (isOpen) {
        setIsMounted(true);
        setPhase("expanded");
        setHeight("auto");
        onExpandStart?.();
        onExpandEnd?.();
      } else {
        onCollapseStart?.();
        setPhase("collapsed");
        setHeight("0px");
        onCollapseEnd?.();

        if (unmountOnExit) {
          setIsMounted(false);
        }
      }

      return;
    }

    if (isOpen) {
      setIsMounted(true);
      onExpandStart?.();
      setPhase("expanding");

      const nextHeight = getContentHeight();
      setHeight("0px");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(`${nextHeight}px`);
        });
      });

      transitionTimeoutRef.current = window.setTimeout(() => {
        setPhase("expanded");
        setHeight("auto");
        onExpandEnd?.();
      }, durationMs);

      return;
    }

    onCollapseStart?.();
    setPhase("collapsing");

    const currentHeight = getContentHeight();
    setHeight(`${currentHeight}px`);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setHeight("0px");
      });
    });

    transitionTimeoutRef.current = window.setTimeout(() => {
      setPhase("collapsed");
      onCollapseEnd?.();

      if (unmountOnExit) {
        setIsMounted(false);
      }
    }, durationMs);
  }, [
    durationMs,
    isOpen,
    onCollapseEnd,
    onCollapseStart,
    onExpandEnd,
    onExpandStart,
    shouldAnimate,
    unmountOnExit,
  ]);

  useEffect(() => {
    const innerEl = innerRef.current;

    if (!innerEl || !isMounted) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (phase === "expanded") {
        setHeight("auto");
        return;
      }

      if (phase === "expanding") {
        setHeight(`${innerEl.scrollHeight}px`);
      }
    });

    observer.observe(innerEl);

    return () => {
      observer.disconnect();
    };
  }, [isMounted, phase, children]);

  if (!isMounted && unmountOnExit) {
    return null;
  }

  return (
    <div
      ref={outerRef}
      className={["overflow-hidden", className].join(" ").trim()}
      style={{
        height,
        opacity: phase === "collapsed" ? 0 : 1,
        transition: shouldAnimate
          ? `height ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${durationMs}ms ease`
          : "none",
        pointerEvents: isOpen ? "auto" : "none",
      }}
      aria-hidden={!isOpen}
      data-phase={phase}
    >
      <div
        ref={innerRef}
        className={contentClassName}
        style={{
          transition: shouldAnimate
            ? `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${durationMs}ms ease`
            : "none",
          transform: isOpen ? "translateY(0px)" : "translateY(-4px)",
          opacity: isOpen ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}