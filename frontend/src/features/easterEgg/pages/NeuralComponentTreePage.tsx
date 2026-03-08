// # Filename: src/features/fun/pages/NeuralComponentTreePage.tsx
// ✅ New Code

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "../styles/neuralTree.css";

import { NEURAL_TREE } from "../components/neuralTreeData";
import type {
  NeuralParticle,
  NeuralStats,
  NeuralTreeNode,
  NodeEntry,
  PositionedNeuralTreeNode,
} from "../components/neuralTreeTypes";

const NODE_W = 150;
const NODE_H = 60;
const PAD_X = 20;
const PAD_Y = 90;

const TYPE_HEX: Record<string, string> = {
  root: "#00fff7",
  hook: "#bf5fff",
  section: "#ff9500",
  form: "#ffe033",
  modal: "#ff4daa",
  leaf: "#39ff6e",
};

function cloneTree(
  node: NeuralTreeNode,
  depth = 0,
  parent: PositionedNeuralTreeNode | null = null
): PositionedNeuralTreeNode {
  const cloned: PositionedNeuralTreeNode = {
    ...node,
    depth,
    parent,
    px: 0,
    py: 0,
    _x: 0,
    children: [],
  };

  cloned.children = node.children.map((child) =>
    cloneTree(child, depth + 1, cloned)
  );

  return cloned;
}

function flattenTree(
  node: PositionedNeuralTreeNode,
  result: PositionedNeuralTreeNode[] = []
): PositionedNeuralTreeNode[] {
  result.push(node);

  node.children.forEach((child) => {
    flattenTree(child, result);
  });

  return result;
}

function shiftSubtree(node: PositionedNeuralTreeNode, delta: number): void {
  node._x += delta;

  node.children.forEach((child) => {
    shiftSubtree(child, delta);
  });
}

function resolveConflicts(
  nodes: PositionedNeuralTreeNode[],
  depth: number
): void {
  const atDepth = nodes.filter((node) => node.depth === depth);

  for (let index = 1; index < atDepth.length; index += 1) {
    const previous = atDepth[index - 1];
    const current = atDepth[index];
    const gap = NODE_W + PAD_X;

    if (current._x - previous._x < gap) {
      shiftSubtree(current, gap - (current._x - previous._x));
    }
  }
}

function layoutTree(root: NeuralTreeNode): PositionedNeuralTreeNode[] {
  const clonedRoot = cloneTree(root);
  const allNodes = flattenTree(clonedRoot);

  const maxDepth = Math.max(...allNodes.map((node) => node.depth));

  allNodes.forEach((node) => {
    if (!node.children.length) {
      node._x = 0;
    }
  });

  for (let depth = maxDepth; depth >= 0; depth -= 1) {
    const level = allNodes.filter((node) => node.depth === depth);

    level.forEach((node) => {
      if (!node.children.length) {
        return;
      }

      const childXs = node.children.map((child) => child._x);
      node._x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    });

    resolveConflicts(allNodes, depth);
  }

  const minX = Math.min(...allNodes.map((node) => node._x));

  allNodes.forEach((node) => {
    node._x -= minX;
    node.px = node._x + NODE_W / 2;
    node.py = node.depth * (NODE_H + PAD_Y) + NODE_H / 2 + 80;
  });

  return allNodes;
}

function bezier(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const u = 1 - t;

  return (
    u * u * u * p0 +
    3 * u * u * t * p1 +
    3 * u * t * t * p2 +
    t * t * t * p3
  );
}

export default function NeuralComponentTreePage() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const uiLayerRef = useRef<HTMLDivElement | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const spontaneousTimeoutRef = useRef<number | null>(null);
  const periodicVolleyRef = useRef<number | null>(null);
  const autoVolleyOneRef = useRef<number | null>(null);
  const autoVolleyTwoRef = useRef<number | null>(null);

  const particlesRef = useRef<NeuralParticle[]>([]);
  const nodeMapRef = useRef<Record<string, NodeEntry>>({});
  const allNodesRef = useRef<PositionedNeuralTreeNode[]>([]);
  const firingSetRef = useRef<Set<string>>(new Set());

  const [stats, setStats] = useState<NeuralStats>({
    totalFires: 0,
    activeCount: 0,
    volleys: 0,
    nodes: 0,
  });

  const legendItems = useMemo(
    () => [
      { label: "Root Page", color: "var(--node-root)" },
      { label: "Hooks", color: "var(--node-hook)" },
      { label: "Sections", color: "var(--node-section)" },
      { label: "Forms", color: "var(--node-form)" },
      { label: "Modals", color: "var(--node-modal)" },
      { label: "Leaves", color: "var(--node-leaf)" },
    ],
    []
  );

  const updateStats = useCallback((updater: (prev: NeuralStats) => NeuralStats) => {
    setStats((previous) => updater(previous));
  }, []);

  const getCenterOffset = useCallback((): number => {
    const nodes = allNodesRef.current;

    if (!nodes.length || !pageRef.current) {
      return 0;
    }

    const maxX = Math.max(...nodes.map((node) => node.px)) + NODE_W / 2;
    return (pageRef.current.clientWidth - maxX) / 2;
  }, []);

  const resizeCanvas = useCallback(() => {
    const pageEl = pageRef.current;
    const canvasEl = canvasRef.current;
    const svgEl = svgRef.current;

    if (!pageEl || !canvasEl || !svgEl) {
      return;
    }

    canvasEl.width = pageEl.clientWidth;
    canvasEl.height = pageEl.clientHeight;

    svgEl.setAttribute("width", String(pageEl.clientWidth));
    svgEl.setAttribute("height", String(pageEl.clientHeight));
  }, []);

  const getChildren = useCallback((nodeId: string): string[] => {
    const foundNode = allNodesRef.current.find((node) => node.id === nodeId);
    return foundNode ? foundNode.children.map((child) => child.id) : [];
  }, []);

  const flashEdge = useCallback((fromId: string, toId: string, color: string) => {
    const path = document.getElementById(`edge-${fromId}-${toId}`);

    if (!path) {
      return;
    }

    path.setAttribute("stroke", color);
    path.setAttribute("opacity", "0.9");
    path.setAttribute("stroke-width", "2.5");

    window.setTimeout(() => {
      path.setAttribute("opacity", "0.22");
      path.setAttribute("stroke-width", "1.5");
    }, 350);
  }, []);

  const fireNodeVisual = useCallback(
    (nodeId: string, delay = 0) => {
      window.setTimeout(() => {
        const entry = nodeMapRef.current[nodeId];

        if (!entry) {
          return;
        }

        const element = entry.el;
        const ring = element.querySelector(
          ".neural-tree-node-ring"
        ) as HTMLDivElement | null;

        element.classList.remove("firing");
        void element.offsetWidth;
        element.classList.add("firing");

        if (ring) {
          ring.classList.remove("ring-active");
          void ring.offsetWidth;
          ring.classList.add("ring-active");
        }

        const children = getChildren(nodeId);

        children.forEach((childId) => {
          flashEdge(nodeId, childId, entry.hex);
        });

        children.forEach((childId) => {
          const fromEntry = nodeMapRef.current[nodeId];
          const toEntry = nodeMapRef.current[childId];

          if (!fromEntry || !toEntry) {
            return;
          }

          const offsetX = getCenterOffset();

          const fx = fromEntry.node.px + offsetX;
          const fy = fromEntry.node.py;
          const tx = toEntry.node.px + offsetX;
          const ty = toEntry.node.py;

          particlesRef.current.push({
            t: 0,
            speed: 0.018 + Math.random() * 0.012,
            fx,
            fy,
            tx,
            ty,
            cp1x: fx,
            cp1y: fy + (ty - fy) * 0.5,
            cp2x: tx,
            cp2y: ty - (ty - fy) * 0.5,
            color: entry.hex,
            onArrive: null,
            arrived: false,
            trail: [],
          });
        });

        firingSetRef.current.add(nodeId);

        updateStats((previous) => ({
          ...previous,
          totalFires: previous.totalFires + 1,
          activeCount: firingSetRef.current.size,
        }));

        window.setTimeout(() => {
          element.classList.remove("firing");
          firingSetRef.current.delete(nodeId);

          updateStats((previous) => ({
            ...previous,
            activeCount: firingSetRef.current.size,
          }));
        }, 600);
      }, delay);
    },
    [flashEdge, getCenterOffset, getChildren, updateStats]
  );

  const fireNodeById = useCallback(
    (nodeId: string, cascade = true, delay = 0) => {
      window.setTimeout(() => {
        const entry = nodeMapRef.current[nodeId];

        if (!entry) {
          return;
        }

        const element = entry.el;
        const ring = element.querySelector(
          ".neural-tree-node-ring"
        ) as HTMLDivElement | null;

        element.classList.remove("firing");
        void element.offsetWidth;
        element.classList.add("firing");

        if (ring) {
          ring.classList.remove("ring-active");
          void ring.offsetWidth;
          ring.classList.add("ring-active");
        }

        const children = getChildren(nodeId);

        children.forEach((childId) => {
          flashEdge(nodeId, childId, entry.hex);
        });

        firingSetRef.current.add(nodeId);

        updateStats((previous) => ({
          ...previous,
          totalFires: previous.totalFires + 1,
          activeCount: firingSetRef.current.size,
        }));

        window.setTimeout(() => {
          element.classList.remove("firing");
          firingSetRef.current.delete(nodeId);

          updateStats((previous) => ({
            ...previous,
            activeCount: firingSetRef.current.size,
          }));
        }, 600);

        if (!cascade) {
          return;
        }

        children.forEach((childId) => {
          const fromEntry = nodeMapRef.current[nodeId];
          const toEntry = nodeMapRef.current[childId];

          if (!fromEntry || !toEntry) {
            return;
          }

          const offsetX = getCenterOffset();

          const fx = fromEntry.node.px + offsetX;
          const fy = fromEntry.node.py;
          const tx = toEntry.node.px + offsetX;
          const ty = toEntry.node.py;

          particlesRef.current.push({
            t: 0,
            speed: 0.018 + Math.random() * 0.012,
            fx,
            fy,
            tx,
            ty,
            cp1x: fx,
            cp1y: fy + (ty - fy) * 0.5,
            cp2x: tx,
            cp2y: ty - (ty - fy) * 0.5,
            color: entry.hex,
            onArrive: () => {
              fireNodeById(childId, true, 0);
            },
            arrived: false,
            trail: [],
          });
        });
      }, delay);
    },
    [flashEdge, getCenterOffset, getChildren, updateStats]
  );

  const triggerFullVolley = useCallback(() => {
    updateStats((previous) => ({
      ...previous,
      volleys: previous.volleys + 1,
    }));

    const rootNode = allNodesRef.current.find((node) => node.id === "TenantsPage");

    if (!rootNode) {
      return;
    }

    const visited = new Set<string>();
    const baseDelay = 180;

    function bfs(items: Array<{ id: string; delay: number }>): void {
      if (!items.length) {
        return;
      }

      const nextItems: Array<{ id: string; delay: number }> = [];

      items.forEach(({ id, delay }) => {
        if (visited.has(id)) {
          return;
        }

        visited.add(id);
        fireNodeVisual(id, delay);

        const children = getChildren(id);

        children.forEach((childId, index) => {
          nextItems.push({
            id: childId,
            delay: delay + baseDelay + index * 40,
          });
        });
      });

      if (nextItems.length) {
        const nextDelay = Math.min(...nextItems.map((item) => item.delay));

        window.setTimeout(() => {
          bfs(nextItems);
        }, nextDelay);
      }
    }

    bfs([{ id: rootNode.id, delay: 0 }]);
  }, [fireNodeVisual, getChildren, updateStats]);

  const renderTree = useCallback(() => {
    const svgEl = svgRef.current;
    const uiLayerEl = uiLayerRef.current;

    if (!svgEl || !uiLayerEl) {
      return;
    }

    const positionedNodes = layoutTree(NEURAL_TREE);
    const offsetX = getCenterOffset();

    allNodesRef.current = positionedNodes;
    nodeMapRef.current = {};

    svgEl.innerHTML = "";
    uiLayerEl.innerHTML = "";

    positionedNodes.forEach((node) => {
      node.children.forEach((child) => {
        const x1 = node.px + offsetX;
        const y1 = node.py;
        const x2 = child.px + offsetX;
        const y2 = child.py;

        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );

        const cy1 = y1 + (y2 - y1) * 0.5;
        const cy2 = y2 - (y2 - y1) * 0.5;

        path.setAttribute(
          "d",
          `M${x1},${y1} C${x1},${cy1} ${x2},${cy2} ${x2},${y2}`
        );
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", TYPE_HEX[node.type]);
        path.setAttribute("stroke-width", "1.5");
        path.setAttribute("opacity", "0.22");
        path.id = `edge-${node.id}-${child.id}`;

        svgEl.appendChild(path);
      });
    });

    positionedNodes.forEach((node) => {
      const hex = TYPE_HEX[node.type];
      const el = document.createElement("div");

      el.className = "neural-tree-node";
      el.id = `node-${node.id}`;
      el.style.left = `${node.px + offsetX}px`;
      el.style.top = `${node.py}px`;
      el.style.color = hex;

      el.innerHTML = `
        <div
          class="neural-tree-node-body"
          style="border-color:${hex}; box-shadow:0 0 8px 1px ${hex}33;"
        >
          <span class="neural-tree-node-label">${node.id}</span>
          <div
            class="neural-tree-node-soma"
            style="background:${hex}; box-shadow:0 0 6px 2px ${hex};"
          ></div>
        </div>
        <div
          class="neural-tree-node-ring"
          style="border-color:${hex}; color:${hex};"
        ></div>
      `;

      el.addEventListener("click", (event: MouseEvent) => {
        event.stopPropagation();
        fireNodeById(node.id, true, 0);
      });

      uiLayerEl.appendChild(el);

      nodeMapRef.current[node.id] = {
        node,
        el,
        hex,
      };
    });

    updateStats((previous) => ({
      ...previous,
      nodes: positionedNodes.length,
    }));
  }, [fireNodeById, getCenterOffset, updateStats]);

  const animateParticles = useCallback(() => {
    const canvasEl = canvasRef.current;

    if (!canvasEl) {
      animationFrameRef.current = window.requestAnimationFrame(animateParticles);
      return;
    }

    const context = canvasEl.getContext("2d");

    if (!context) {
      animationFrameRef.current = window.requestAnimationFrame(animateParticles);
      return;
    }

    context.clearRect(0, 0, canvasEl.width, canvasEl.height);

    particlesRef.current = particlesRef.current.filter((particle) => particle.t < 1.02);

    particlesRef.current.forEach((particle) => {
      particle.t += particle.speed;

      if (particle.t > 1) {
        particle.t = 1;
      }

      const x = bezier(
        particle.t,
        particle.fx,
        particle.cp1x,
        particle.cp2x,
        particle.tx
      );
      const y = bezier(
        particle.t,
        particle.fy,
        particle.cp1y,
        particle.cp2y,
        particle.ty
      );

      particle.trail.push({ x, y });

      if (particle.trail.length > 18) {
        particle.trail.shift();
      }

      if (particle.trail.length > 1) {
        for (let index = 1; index < particle.trail.length; index += 1) {
          const alpha = index / particle.trail.length;

          context.beginPath();
          context.moveTo(
            particle.trail[index - 1].x,
            particle.trail[index - 1].y
          );
          context.lineTo(particle.trail[index].x, particle.trail[index].y);
          context.strokeStyle = particle.color;
          context.globalAlpha = alpha * 0.85;
          context.lineWidth = alpha * 3.5;
          context.lineCap = "round";
          context.stroke();
        }
      }

      context.globalAlpha = 1;
      context.beginPath();
      context.arc(x, y, 5, 0, Math.PI * 2);
      context.fillStyle = "#ffffff";
      context.shadowColor = particle.color;
      context.shadowBlur = 18;
      context.fill();
      context.shadowBlur = 0;

      if (particle.t >= 1 && !particle.arrived) {
        particle.arrived = true;

        if (particle.onArrive) {
          particle.onArrive();
        }
      }
    });

    context.globalAlpha = 1;
    animationFrameRef.current = window.requestAnimationFrame(animateParticles);
  }, []);

  const runRandomSpontaneous = useCallback(() => {
    const leaves = allNodesRef.current.filter((node) => !node.children.length);

    if (leaves.length) {
      const randomLeaf = leaves[Math.floor(Math.random() * leaves.length)];
      fireNodeVisual(randomLeaf.id, 0);
    }

    spontaneousTimeoutRef.current = window.setTimeout(() => {
      runRandomSpontaneous();
    }, 800 + Math.random() * 1400);
  }, [fireNodeVisual]);

  useEffect(() => {
    resizeCanvas();
    allNodesRef.current = layoutTree(NEURAL_TREE);
    renderTree();
    animateParticles();

    autoVolleyOneRef.current = window.setTimeout(() => {
      triggerFullVolley();
    }, 600);

    autoVolleyTwoRef.current = window.setTimeout(() => {
      triggerFullVolley();
    }, 3200);

    spontaneousTimeoutRef.current = window.setTimeout(() => {
      runRandomSpontaneous();
    }, 4500);

    periodicVolleyRef.current = window.setInterval(() => {
      triggerFullVolley();
    }, 8000);

    const handleResize = () => {
      resizeCanvas();
      renderTree();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      if (spontaneousTimeoutRef.current) {
        window.clearTimeout(spontaneousTimeoutRef.current);
      }

      if (periodicVolleyRef.current) {
        window.clearInterval(periodicVolleyRef.current);
      }

      if (autoVolleyOneRef.current) {
        window.clearTimeout(autoVolleyOneRef.current);
      }

      if (autoVolleyTwoRef.current) {
        window.clearTimeout(autoVolleyTwoRef.current);
      }
    };
  }, [
    animateParticles,
    renderTree,
    resizeCanvas,
    runRandomSpontaneous,
    triggerFullVolley,
  ]);

  return (
    <div ref={pageRef} className="neural-tree-page">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Orbitron:wght@400;700;900&display=swap"
        rel="stylesheet"
      />

      <div className="neural-tree-grid" />
      <canvas ref={canvasRef} className="neural-tree-canvas" />
      <svg ref={svgRef} className="neural-tree-svg" />
      <div ref={uiLayerRef} className="neural-tree-ui" />

      <div className="neural-tree-hud">
        <div className="neural-tree-hud-pill">
          TOTAL FIRES
          <span className="neural-tree-hud-val">{stats.totalFires}</span>
        </div>
        <div className="neural-tree-hud-pill">
          ACTIVE NOW
          <span className="neural-tree-hud-val">{stats.activeCount}</span>
        </div>
        <div className="neural-tree-hud-pill">
          NODES
          <span className="neural-tree-hud-val">{stats.nodes}</span>
        </div>
        <div className="neural-tree-hud-pill">
          VOLLEYS
          <span className="neural-tree-hud-val">{stats.volleys}</span>
        </div>
      </div>

      <button
        type="button"
        className="neural-tree-fire-btn"
        onClick={triggerFullVolley}
      >
        ⚡ FIRE ALL NEURONS
      </button>

      <div className="neural-tree-legend">
        {legendItems.map((item) => (
          <div key={item.label} className="neural-tree-legend-row">
            <div
              className="neural-tree-legend-dot"
              style={{ background: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}