<template>
  <section ref="containerRef" id="competences" class="skill-graph-wrapper">
    <svg
      ref="svgRef"
      :width="width"
      :height="height"
      role="img"
      :aria-labelledby="titleId + ' ' + descId"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="xMidYMid meet"
      class="skill-graph-svg"
    >
      <title :id="titleId">Compétences clés</title>
      <desc :id="descId">
        Graphe force-directed reliant les compétences par catégories.
      </desc>
      <g ref="graphGroup" :transform="centerTransform"></g>
    </svg>

    <div class="sr-only" aria-live="polite" ref="liveRef"></div>

    <table class="sr-only" aria-hidden="false">
      <caption>
        Tableau des compétences
      </caption>
      <thead>
        <tr>
          <th>Catégorie</th>
          <th>Compétence</th>
          <th>Niveau</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(s, i) in skills" :key="i">
          <td>{{ s.category || "Compétences" }}</td>
          <td>{{ s.title }}</td>
          <td>{{ s.level }}%</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  nextTick,
} from "vue";
import * as d3 from "d3";

interface Skill {
  title: string;
  level?: string | number;
  description?: string;
  category?: string;
}

type NodeKind = "root" | "category" | "skill" | "detail";

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  kind: NodeKind;
  radius: number; // visual radius
  collisionRadius?: number; // measured radius used for collision only
  group?: string;
  level?: number;
  description?: string;
  detailKind?: "name" | "level" | "description";
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  strength?: number;
}

const props = defineProps<{ skills?: Skill[]; technos?: Skill[] }>();

const containerRef = ref<HTMLElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const graphGroup = ref<SVGGElement | null>(null);
const liveRef = ref<HTMLElement | null>(null);

const width = ref(480);
const height = ref(420);
const expandedCategory = ref<string | null>(null);
const currentDepth = ref<number>(1); // niv
const selectedSkillId = ref<string | null>(null);

const titleId = "skillChartTitle";
const descId = "skillChartDesc";
const centerTransform = computed(
  () => `translate(${width.value / 2}, ${height.value / 2})`,
);

const { data: fetchedTechnos } = await useAsyncData("technos-force-graph", () =>
  queryCollection("technos")
    .select("title", "level", "description", "category", "priority")
    .all(),
);

const graphSkills = computed(() => {
  const explicitSkills = props.skills ?? props.technos ?? [];
  if (explicitSkills.length > 0) {
    return explicitSkills;
  }

  return (
    fetchedTechnos.value?.map((item: any) => ({
      title: item.title || "Untitled",
      level: item.level ?? "///",
      description: item.description ?? "///",
      category: item.category ?? "Compétences",
    })) || []
  );
});

// expose for template fallback table
const skills = graphSkills;

let ro: ResizeObserver | null = null;
let simulation: d3.Simulation<GraphNode, undefined> | null = null;

function announce(text: string) {
  if (liveRef.value) {
    liveRef.value.textContent = text;
  }
}

function measure() {
  const measuredWidth = containerRef.value?.clientWidth || 480;
  width.value = Math.max(320, measuredWidth);
  height.value = Math.max(420, Math.round(width.value * 0.78));
}

function wrapLabel(label: string, maxCharsPerLine: number) {
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    if (word.length > maxCharsPerLine) {
      const chunks = word.match(
        new RegExp(`.{1,${Math.max(6, maxCharsPerLine - 2)}}`, "g"),
      ) || [word];
      lines.push(...chunks.slice(0, -1));
      currentLine = chunks[chunks.length - 1] || "";
    } else {
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function stopSimulation() {
  simulation?.stop();
  simulation = null;
}

function isActiveCategoryNode(node: GraphNode) {
  return (
    node.kind === "category" &&
    currentDepth.value >= 2 &&
    expandedCategory.value === node.group
  );
}

function isFocusedSkillNode(node: GraphNode) {
  return (
    node.kind === "skill" &&
    currentDepth.value >= 3 &&
    selectedSkillId.value === node.id
  );
}

function isClickableNode(node: GraphNode) {
  if (node.kind === "root") {
    return currentDepth.value >= 2;
  }

  if (node.kind === "category") {
    return (
      currentDepth.value === 1 ||
      (currentDepth.value >= 3 && expandedCategory.value === node.group)
    );
  }

  if (node.kind === "skill") {
    return currentDepth.value === 2;
  }

  return true;
}

function isFixedNode(node: GraphNode) {
  return (
    node.kind === "root" ||
    isActiveCategoryNode(node) ||
    isFocusedSkillNode(node) ||
    node.kind === "detail"
  );
}

function render() {
  if (!graphGroup.value) {
    return;
  }

  stopSimulation();

  const graph = d3.select(graphGroup.value);
  graph.selectAll("*").remove();

  const skillNodes = (graphSkills.value || []).map((item, index) => ({
    id: `skill-${index}-${item.title}`,
    label: item.title,
    kind: "skill" as const,
    radius: 20,
    group: item.category?.trim() || "Compétences",
    level: item.level,
    description: item.description || "",
  }));

  const categoryNames = Array.from(
    new Set(skillNodes.map((item) => item.group)),
  );
  const categoryNodes: GraphNode[] = categoryNames.map((group, index) => ({
    id: `category-${index}-${group}`,
    label: group,
    kind: "category",
    radius: 22,
    group,
  }));

  const root: GraphNode = {
    id: "root",
    label: "Compétences clés",
    kind: "root",
    radius: currentDepth.value > 1 ? 24 : 34,
    fx: 0,
    fy: 0,
  };

  // Build visible nodes depending on current depth and expandedCategory
  let nodes: GraphNode[] = [];

  if (currentDepth.value === 2 && expandedCategory.value) {
    // Category detail level: show the root node, the active category and its skills.
    const activeCategory = categoryNodes.find(
      (c) => c.group === expandedCategory.value,
    );
    if (activeCategory) {
      nodes.push(activeCategory);
    }

    nodes.unshift(root);

    // include skills for expanded category
    const skillsToShow = skillNodes.filter(
      (s) => s.group === expandedCategory.value,
    );
    nodes.push(...(skillsToShow as GraphNode[]));
  } else if (
    currentDepth.value >= 3 &&
    expandedCategory.value &&
    selectedSkillId.value
  ) {
    // Skill detail level: show root, the active category, the selected skill and its details.
    const activeCategory = categoryNodes.find(
      (c) => c.group === expandedCategory.value,
    );
    const selectedSkill = skillNodes.find(
      (s) => s.id === selectedSkillId.value,
    );

    nodes = [root];

    if (activeCategory) {
      nodes.push(activeCategory);
    }

    if (selectedSkill) {
      const selectedSkillNode: GraphNode = {
        ...selectedSkill,
        radius: Math.max(selectedSkill.radius, 38),
        detailKind: "name",
      };
      const skillLevelNode: GraphNode = {
        id: `detail-level-${selectedSkill.id}`,
        label: `Niveau : ${selectedSkill.level}`,
        kind: "detail",
        radius: 18,
        group: selectedSkill.group,
        detailKind: "level",
      };
      const skillDescriptionNode: GraphNode = {
        id: `detail-description-${selectedSkill.id}`,
        label: selectedSkill.description || "Aucune description",
        kind: "detail",
        radius: 18,
        group: selectedSkill.group,
        detailKind: "description",
      };

      nodes.push(selectedSkillNode, skillLevelNode, skillDescriptionNode);
    }
  } else {
    // default overview: show root + all category nodes
    nodes = [root, ...categoryNodes];
  }

  // Build links
  const links: GraphLink[] = [];
  if (currentDepth.value === 1) {
    categoryNodes.forEach((category) => {
      links.push({ source: "root", target: category.id, strength: 0.22 });
    });
  } else if (currentDepth.value === 2 && expandedCategory.value) {
    // skills -> active category
    skillNodes
      .filter((s) => s.group === expandedCategory.value)
      .forEach((skill) => {
        links.push({
          source:
            categoryNodes.find((category) => category.group === skill.group)
              ?.id || "root",
          target: skill.id,
          strength: 0.9,
        });
      });

    const catId = categoryNodes.find(
      (c) => c.group === expandedCategory.value,
    )!.id;
    links.push({
      source: "root",
      target: catId,
      strength: 0.22,
    });
    links.push({
      source: catId,
      target: "root",
      strength: 0.22,
    });
  } else if (
    currentDepth.value >= 3 &&
    expandedCategory.value &&
    selectedSkillId.value
  ) {
    const catId = categoryNodes.find(
      (c) => c.group === expandedCategory.value,
    )!.id;
    const selectedSkill = skillNodes.find(
      (s) => s.id === selectedSkillId.value,
    );
    if (selectedSkill) {
      links.push({
        source: "root",
        target: catId,
        strength: 0.22,
      });
      links.push({
        source: catId,
        target: selectedSkill.id,
        strength: 0.95,
      });
      links.push({
        source: selectedSkill.id,
        target: `detail-level-${selectedSkill.id}`,
        strength: 0.6,
      });
      links.push({
        source: selectedSkill.id,
        target: `detail-description-${selectedSkill.id}`,
        strength: 0.6,
      });
    }
  }

  const linkSelection = graph
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "rgba(255,255,255,0.18)")
    .attr("stroke-width", 1.2);

  const nodeSelection = graph
    .append("g")
    .attr("class", "nodes")
    .selectAll<SVGGElement, GraphNode>("g")
    .data(nodes)
    .join("g")
    .attr("class", (d) => {
      const isFixed = isFixedNode(d);
      const isInteractive = isClickableNode(d);
      return `node node--${d.kind}${isFixed ? " node--fixed" : ""}${isInteractive ? " node--clickable" : ""}`;
    })
    .attr("tabindex", (d) => {
      return isClickableNode(d) ? 0 : null;
    })
    .attr("role", (d) => {
      return isClickableNode(d) ? "button" : null;
    })
    .style("cursor", (d) => {
      return isClickableNode(d) ? "pointer" : "default";
    })
    .attr("aria-label", (d) =>
      d.kind === "skill"
        ? `${d.label}, ${d.level}, ${d.group || "Compétences"}`
        : d.label,
    )
    .on("mouseenter focus", (_event, d) => {
      if (!isClickableNode(d)) return;

      announce(
        d.kind === "skill"
          ? `${d.label}: ${d.level} — ${d.description || d.group || "Compétence"}`
          : d.label,
      );
      // highlight connected links and dim others
      try {
        const targetId = d.id;
        linkSelection.classed("link--highlight", (l) => {
          const s =
            typeof l.source === "string"
              ? l.source
              : (l.source as GraphNode).id;
          const t =
            typeof l.target === "string"
              ? l.target
              : (l.target as GraphNode).id;
          return s === targetId || t === targetId;
        });
        linkSelection.classed("dimmed", (l) => {
          const s =
            typeof l.source === "string"
              ? l.source
              : (l.source as GraphNode).id;
          const t =
            typeof l.target === "string"
              ? l.target
              : (l.target as GraphNode).id;
          return !(s === targetId || t === targetId);
        });

        nodeSelection.classed("dimmed", (nd) => nd.id !== targetId);
        d3.select(_event.currentTarget as Element).classed("node--hover", true);
      } catch (e) {}
    })
    .on("mouseleave blur", (_event, d) => {
      if (!isClickableNode(d)) return;

      announce("");
      try {
        linkSelection
          .classed("link--highlight", false)
          .classed("dimmed", false);
        nodeSelection.classed("dimmed", false).classed("node--hover", false);
      } catch (e) {}
    });

  nodeSelection
    .append("circle")
    .attr("r", (d) => d.radius)
    .attr("fill", (d) => {
      if (d.kind === "root") return "rgba(255,255,255,0.9)";
      if (d.kind === "category") return "rgba(255,255,255,0.24)";
      return "rgba(255,255,255,0.64)";
    });

  const textSelection = nodeSelection
    .append("text")
    .attr("class", "node-label")
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .attr("font-size", (d) =>
      d.kind === "root" ? 13 : d.kind === "category" ? 12 : 11,
    )
    .attr("font-weight", (d) => (d.kind === "root" ? 700 : 600));
  textSelection.each(function (d) {
    const text = d3.select(this);
    const lines =
      d.kind === "detail" && d.detailKind === "description"
        ? wrapLabel(d.label, 26)
        : isFocusedSkillNode(d) && d.kind === "skill"
          ? wrapLabel(d.label, 16)
          : wrapLabel(
              d.label,
              d.kind === "skill" ? 16 : d.kind === "category" ? 18 : 14,
            );

    const offsetY =
      d.kind === "root"
        ? -d.radius - 20
        : isFocusedSkillNode(d)
          ? -d.radius - 18
          : d.kind === "detail" && d.detailKind === "description"
            ? -d.radius + 2
            : d.radius + (d.kind === "category" ? 14 : 12);
    const offsetX =
      d.kind === "detail" && d.detailKind === "description" ? d.radius + 12 : 0;

    text.attr("x", offsetX).attr("y", offsetY).attr("dy", 0);
    text.attr(
      "text-anchor",
      d.kind === "detail" && d.detailKind === "description"
        ? "start"
        : "middle",
    );
    text.selectAll("tspan").remove();

    lines.forEach((line, index) => {
      text
        .append("tspan")
        .attr("x", offsetX)
        .attr("dy", index === 0 ? 0 : "1.08em")
        .text(line);
    });

    // measure parent group bbox (text + circle) and set collisionRadius
    try {
      const g =
        (this.parentNode as SVGGElement) || (this as unknown as SVGGElement);
      const bbox = g.getBBox
        ? g.getBBox()
        : { x: 0, y: 0, width: 0, height: 0 };
      const padding = 8;
      const maxDistX = Math.max(
        Math.abs(bbox.x),
        Math.abs(bbox.x + bbox.width),
      );
      const maxDistY = Math.max(
        Math.abs(bbox.y),
        Math.abs(bbox.y + bbox.height),
      );
      const needed = Math.max(
        d.radius || 10,
        maxDistX + padding,
        maxDistY + padding,
      );
      d.collisionRadius = needed;
    } catch (e) {
      /* ignore measurement errors */
    }
  });

  // Drag + click behaviour
  function dragstarted(event: any, d: GraphNode) {
    if (!simulation) return;
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event: any, d: GraphNode) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event: any, d: GraphNode) {
    if (!simulation) return;
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  nodeSelection.on("click", (_event, d) => {
    if (!isClickableNode(d)) return;

    if (d.kind === "category") {
      if (currentDepth.value >= 3) {
        currentDepth.value = 2;
        selectedSkillId.value = null;
        render();
      } else {
        expandedCategory.value = d.group || null;
        currentDepth.value = 2;
        selectedSkillId.value = null;
        render();
      }
    } else if (d.kind === "root") {
      expandedCategory.value = null;
      selectedSkillId.value = null;
      currentDepth.value = 1;
      render();
    } else if (d.kind === "skill" && currentDepth.value === 2) {
      selectedSkillId.value = d.id;
      currentDepth.value = 3;
      render();
    }
  });

  // Attach drag only to non-central nodes
  nodeSelection
    .filter((d) => {
      return isClickableNode(d);
    })
    .call(
      d3
        .drag<SVGGElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended),
    );

  simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance((link) =>
          (link.target as GraphNode).kind === "skill" ? 90 : 150,
        )
        .strength((link) => link.strength ?? 0.5),
    )
    .force(
      "charge",
      d3.forceManyBody().strength((d) => {
        const node = d as GraphNode;
        return node.kind === "root"
          ? -700
          : node.kind === "category"
            ? -350
            : -120;
      }),
    )
    .force(
      "collide",
      d3
        .forceCollide<GraphNode>()
        .radius((d) => {
          return (d.collisionRadius ?? d.radius ?? 10) + 8;
        })
        .iterations(2),
    )
    .force("center", d3.forceCenter(0, 0))
    .alpha(1)
    .alphaDecay(0.05)
    .on("tick", () => {
      linkSelection
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

      nodeSelection.attr(
        "transform",
        (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`,
      );
    });
}

onMounted(async () => {
  await nextTick();
  measure();
  render();

  if (containerRef.value) {
    ro = new ResizeObserver(() => {
      measure();
      render();
    });
    ro.observe(containerRef.value);
  }
});

watch(
  () => graphSkills.value,
  () => {
    measure();
    render();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  stopSimulation();
  if (ro && containerRef.value) {
    ro.unobserve(containerRef.value);
    ro.disconnect();
  }
});
</script>

<style scoped>
.skill-graph-wrapper {
  width: 100%;
  max-width: 520px;
  margin-top: 20px;
  color: inherit;
  overflow: visible;
}

.skill-graph-svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.node {
  cursor: pointer;
}

.node text {
  pointer-events: none;
}

.node--root text {
  letter-spacing: 0.03em;
}

.node--category circle {
  fill-opacity: 0.25;
}

.node--skill circle {
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 1;
}

.node--anchor circle {
  fill: rgba(0, 150, 200, 0.95);
}

.node--anchor:hover {
  transform: scale(1.08);
}

.node--nav circle {
  fill: rgba(200, 150, 0, 0.95);
}

.node--nav:hover {
  transform: scale(1.06);
}

.node--hover {
  transform: scale(1.06);
}

.node.dimmed {
  opacity: 0.28;
}

.node--fixed {
  opacity: 0.92;
}

.node--fixed circle {
  fill: rgba(255, 255, 255, 0.24);
  stroke: rgba(0, 0, 0, 0.06);
}

.node--clickable {
  transition:
    transform 160ms ease,
    filter 160ms ease,
    opacity 160ms ease;
}

.node--clickable.node--hover {
  transform: scale(1.08);
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.18));
}

.links line.link--highlight {
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 2.6;
}

.links line.dimmed {
  opacity: 0.18;
}

.sr-only {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
  padding: 0;
  margin: -1px;
}
</style>
