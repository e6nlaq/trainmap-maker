import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/mapStore";

const GRID_SIZE = 20;

export function MapCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const stationsLayerRef = useRef<SVGGElement>(null);

  const {
    stations,
    lines,
    edges,
    lineOrder,
    addStation,
    updateStation,
    selectStation,
    selectedStationId,
    selectedLineId,
    selectedEdgeId,
    selectEdge,
    removeEdge,
    editMode,
    setEditMode,
    connectionStartId,
    setConnectionStart,
    showLegend,
    useStationGradients,
    sortNumbering,
  } = useMapStore();

  const stationsArray = useMemo(() => Object.values(stations), [stations]);
  const edgesArray = useMemo(() => Object.values(edges), [edges]);
  const linesArray = useMemo(() => {
    return lineOrder && lineOrder.length > 0
      ? lineOrder.map((id) => lines[id]).filter(Boolean)
      : Object.values(lines);
  }, [lines, lineOrder]);

  // Memoize edge grouping for parallel lines
  const edgeGroups = useMemo(() => {
    const groups: Record<string, typeof edgesArray> = {};
    for (const edge of edgesArray) {
      const pairId = [edge.station1Id, edge.station2Id].sort().join("-");
      if (!groups[pairId]) groups[pairId] = [];
      groups[pairId].push(edge);
    }
    return groups;
  }, [edgesArray]);

  // Pre-calculate which lines pass through each station (for gradients)
  const stationLineIdsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const edge of edgesArray) {
      if (!map[edge.station1Id]) map[edge.station1Id] = [];
      if (!map[edge.station2Id]) map[edge.station2Id] = [];
      map[edge.station1Id].push(edge.lineId);
      map[edge.station2Id].push(edge.lineId);
    }
    // De-duplicate
    for (const id in map) {
      map[id] = [...new Set(map[id])];
    }
    return map;
  }, [edgesArray]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Mouse move handler for preview line
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    svg.on("pointermove", (event) => {
      const coords = d3.pointer(event, gRef.current);
      setMousePos({ x: coords[0], y: coords[1] });
    });

    return () => {
      svg.on("pointermove", null);
    };
  }, []);

  // Setup Zoom and Double Click
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (e) => {
        g.attr("transform", e.transform);
      });

    svg.call(zoom).on("dblclick.zoom", null);

    svg.on("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const coords = d3.pointer(e, gRef.current);
      const x = Math.round(coords[0] / GRID_SIZE) * GRID_SIZE;
      const y = Math.round(coords[1] / GRID_SIZE) * GRID_SIZE;

      addStation(x, y);
    });

    return () => {
      svg.on(".zoom", null);
      svg.on("dblclick", null);
    };
  }, [addStation]);

  // Setup Dragging
  // biome-ignore lint/correctness/useExhaustiveDependencies: off
  useEffect(() => {
    if (!stationsLayerRef.current) return;

    const stationsLayer = d3.select(stationsLayerRef.current);

    const drag = d3
      .drag<SVGGElement, unknown>()
      .on("start", function () {
        if (editMode !== "move") return;
        d3.select(this).raise();
      })
      .on("drag", function (event) {
        if (editMode !== "move") return;
        const stationId = d3.select(this).attr("data-id");
        if (!stationId) return;

        const x = event.x;
        const y = event.y;
        d3.select(this).attr("transform", `translate(${x}, ${y}) scale(1.1)`);
        updateStation(stationId, { x, y });
      })
      .on("end", function (event) {
        if (editMode !== "move") return;
        const stationId = d3.select(this).attr("data-id");
        if (!stationId) return;

        const snappedX = Math.round(event.x / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(event.y / GRID_SIZE) * GRID_SIZE;
        updateStation(stationId, { x: snappedX, y: snappedY });
      });

    stationsLayer.selectAll<SVGGElement, unknown>(".station-group").call(drag);
  }, [editMode, updateStation, stationsArray.length]);

  const handleStationClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    selectStation(id, e.shiftKey);
  };

  const handleEdgeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editMode === "delete") {
      removeEdge(id);
    } else {
      selectEdge(id);
    }
  };

  const handleCanvasClick = () => {
    selectStation(null);
    selectEdge(null);
    setConnectionStart(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      selectStation(null);
      selectEdge(null);
      setConnectionStart(null);
    }
  };

  // Keyboard Shortcuts for Modes
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "1":
          setEditMode("select");
          break;
        case "2":
          setEditMode("connect");
          break;
        case "3":
          setEditMode("move");
          break;
        case "4":
          setEditMode("delete");
          break;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [setEditMode]);

  const startStation = connectionStartId ? stations[connectionStartId] : null;

  return (
    <div
      className="w-full h-full overflow-hidden bg-[#fbfbfb] absolute inset-0 outline-none"
      onClick={handleCanvasClick}
      onKeyDown={handleKeyDown}
      role="presentation"
      tabIndex={-1} // Ensure it can receive keyboard events if needed, but we use window listener
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className={cn(
          "active:cursor-grabbing touch-none transition-all",
          editMode === "move"
            ? "cursor-move"
            : editMode === "delete"
              ? "cursor-not-allowed"
              : "cursor-crosshair",
        )}
        aria-label="Train Map Canvas"
        role="img"
      >
        <defs>
          <pattern
            id="grid"
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="#e5e5e5" />
          </pattern>

          {/* Dynamic Gradients for Multi-line Stations */}
          {useStationGradients &&
            stationsArray.map((station) => {
              const lineIds = stationLineIdsMap[station.id] || [];
              const disabledLines = station.disabledLines || [];
              const linesAtStation = lineIds
                .filter((id) => !disabledLines.includes(id))
                .map((id) => lines[id])
                .filter(Boolean);

              if (linesAtStation.length <= 1) return null;

              return (
                <linearGradient
                  key={`grad-${station.id}`}
                  id={`grad-station-${station.id}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  {linesAtStation.map((line, i) => {
                    const offset = (i / (linesAtStation.length - 1)) * 100;
                    return (
                      <stop
                        key={line.id}
                        offset={`${offset}%`}
                        stopColor={line.color}
                      />
                    );
                  })}
                </linearGradient>
              );
            })}
        </defs>

        {/* Background Grid */}
        <rect
          width="10000"
          height="10000"
          x="-5000"
          y="-5000"
          fill="url(#grid)"
        />

        <g ref={gRef}>
          {/* Connection Preview Line */}
          {editMode === "connect" && startStation && (
            <line
              x1={startStation.x}
              y1={startStation.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke={
                selectedLineId
                  ? lines[selectedLineId]?.color
                  : "hsl(var(--primary))"
              }
              strokeWidth="4"
              strokeDasharray="8 4"
              className="opacity-50 pointer-events-none"
            />
          )}

          {/* Render Edges */}
          <g className="edges-layer">
            {Object.entries(edgeGroups).map(([_, rawGroup]) => {
              // IMPORTANT: Sort the group by the global lineOrder to ensure stable parallel positions
              const group = [...rawGroup].sort((a, b) => {
                return (
                  lineOrder.indexOf(a.lineId) - lineOrder.indexOf(b.lineId)
                );
              });

              return group.map((edge, index) => {
                const s1Raw = stations[edge.station1Id];
                const s2Raw = stations[edge.station2Id];
                if (!s1Raw || !s2Raw) return null;

                // Normalize direction geometrically (always left-to-right, then top-to-bottom)
                // for consistent offsets regardless of connection order or ID
                const isS1First = s1Raw.x < s2Raw.x || (s1Raw.x === s2Raw.x && s1Raw.y < s2Raw.y);
                const [s1, s2] = isS1First ? [s1Raw, s2Raw] : [s2Raw, s1Raw];

                const line = lines[edge.lineId];
                const isSelected = selectedEdgeId === edge.id;
                const isLineActive = selectedLineId === edge.lineId;

                // Calculate perpendicular offset for parallel lines
                const dx = s2.x - s1.x;
                const dy = s2.y - s1.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len === 0) return null;

                const nx = -dy / len;
                const ny = dx / len;

                const spacing = 12;
                const offset = (index - (group.length - 1) / 2) * spacing;

                const x1 = s1.x + nx * offset;
                const y1 = s1.y + ny * offset;
                const x2 = s2.x + nx * offset;
                const y2 = s2.y + ny * offset;

                return (
                  <g key={edge.id} className="edge-group">
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="transparent"
                      strokeWidth="24"
                      className="cursor-pointer"
                      onClick={(e) => handleEdgeClick(e, edge.id)}
                    />
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={line?.color || "#000"}
                      strokeWidth={isSelected ? 14 : 10}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      className="transition-all pointer-events-none"
                      style={{
                        opacity:
                          (selectedLineId && !isLineActive) ||
                          (editMode === "delete" && !isSelected)
                            ? 0.2
                            : 1,
                      }}
                    />
                  </g>
                );
              });
            })}
          </g>

          {/* Render Stations */}
          <g className="stations-layer" ref={stationsLayerRef}>
            {stationsArray.map((station) => {
              const disabledLines = station.disabledLines || [];
              const belongingLineIds = [
                ...new Set(
                  edgesArray
                    .filter(
                      (e) =>
                        e.station1Id === station.id ||
                        e.station2Id === station.id,
                    )
                    .map((e) => e.lineId)
                    .filter((lineId) => !disabledLines.includes(lineId)),
                ),
              ];
              const primaryLineId = belongingLineIds[0];
              const isMultiLine = belongingLineIds.length > 1;

              const stationColor = primaryLineId
                ? lines[primaryLineId]?.color || "#333"
                : "#ccc";

              const isSelected = selectedStationId === station.id;
              const isConnectionStart = connectionStartId === station.id;

              const rawNumberings = station.numbering
                .split(/[\s,]+/)
                .filter(Boolean);
              const numberings = sortNumbering
                ? [...rawNumberings].sort()
                : rawNumberings;
              const numItems = Math.max(1, numberings.length);
              const stSize = station.size || 36;
              const scale = stSize / 36;
              const stationWidth = stSize + (numItems - 1) * 24 * scale;

              return (
                <g
                  key={station.id}
                  data-id={station.id}
                  transform={`translate(${station.x}, ${station.y}) ${isSelected || isConnectionStart ? "scale(1.1)" : "scale(1)"}`}
                  onClick={(e) => handleStationClick(e, station.id)}
                  className={cn(
                    "station-group cursor-pointer group transition-transform duration-200 outline-none",
                    editMode === "move" && "cursor-move",
                    editMode === "delete" && "hover:opacity-50",
                  )}
                  role="button"
                  aria-label={`Station: ${station.name}`}
                  tabIndex={0}
                >
                  {(isSelected || isConnectionStart) && (
                    <rect
                      x={-(stationWidth + 24 * scale) / 2}
                      y={-(stSize + 24 * scale) / 2}
                      width={stationWidth + 24 * scale}
                      height={stSize + 24 * scale}
                      rx={(stSize + 24 * scale) / 2}
                      fill="hsl(var(--primary))"
                      className={cn(
                        "opacity-20",
                        isConnectionStart ? "animate-pulse" : "",
                      )}
                    />
                  )}

                  <rect
                    x={-stationWidth / 2}
                    y={-stSize / 2}
                    width={stationWidth}
                    height={stSize}
                    rx={isMultiLine ? 4 * scale : stSize / 2}
                    fill="white"
                    stroke={
                      isSelected
                        ? "hsl(var(--primary))"
                        : isMultiLine && useStationGradients
                          ? `url(#grad-station-${station.id})`
                          : isMultiLine
                            ? "#333"
                            : stationColor
                    }
                    strokeWidth={isSelected ? 5 * scale : 3 * scale}
                    className="transition-all"
                  />

                  <g
                    transform={`translate(${-(numItems - 1) * 12 * scale}, 0)`}
                  >
                    {numberings.map((num, i) => {
                      const match = num.match(/^([A-Z]+)(\d+)$/i);
                      const alpha = match ? match[1] : "";
                      const digit = match ? match[2] : num;
                      const xPos = i * 24 * scale;
                      return (
                        <text
                          key={`${station.id}-${num}`}
                          x={xPos}
                          textAnchor="middle"
                          className="select-none pointer-events-none font-bold"
                          style={{ fill: "#333" }}
                        >
                          <tspan
                            x={xPos}
                            y={-2 * scale}
                            style={{ fontSize: `${10 * scale}px` }}
                          >
                            {alpha}
                          </tspan>
                          <tspan
                            x={xPos}
                            y={10 * scale}
                            style={{ fontSize: `${12 * scale}px` }}
                          >
                            {digit}
                          </tspan>
                        </text>
                      );
                    })}
                  </g>

                  {isSelected && (
                    <rect
                      x={-(stationWidth + 12 * scale) / 2}
                      y={-(stSize / 2 + 6 * scale)}
                      width={stationWidth + 12 * scale}
                      height={stSize + 12 * scale}
                      rx={(stSize + 12 * scale) / 2}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2 * scale}
                      strokeDasharray={`${4 * scale} ${2 * scale}`}
                      className="animate-[spin_10s_linear_infinite]"
                      style={{ transformOrigin: "center" }}
                    />
                  )}

                  <text
                    y={stSize / 2 + 14 * scale}
                    textAnchor="middle"
                    className="font-bold fill-[#222] select-none pointer-events-none"
                    style={{
                      fontSize: `${13 * scale}px`,
                      paintOrder: "stroke",
                      stroke: "white",
                      strokeWidth: 3 * scale,
                    }}
                  >
                    {station.name}
                  </text>
                  <text
                    y={stSize / 2 + 26 * scale}
                    textAnchor="middle"
                    className="font-bold fill-[#666] select-none pointer-events-none uppercase tracking-tighter"
                    style={{
                      fontSize: `${10 * scale}px`,
                      paintOrder: "stroke",
                      stroke: "white",
                      strokeWidth: 2 * scale,
                    }}
                  >
                    {station.nameEn}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <div className="absolute top-4 left-4 p-3 bg-background/80 backdrop-blur border rounded-md shadow-sm pointer-events-none text-xs space-y-1">
        <div className="font-semibold text-primary mb-1">
          e6nlaq式路線図メーカー
        </div>
        <div className="text-muted-foreground flex items-center gap-2">
          モード:{" "}
          {editMode === "select"
            ? "選択"
            : editMode === "connect"
              ? "接続"
              : editMode === "move"
                ? "移動"
                : "削除"}
        </div>
        <div className="text-muted-foreground">
          {editMode === "select" && "駅・線をクリックして情報を表示・編集"}
          {editMode === "connect" && "2駅から接続を作成"}
          {editMode === "move" && "駅をドラッグして移動"}
          {editMode === "delete" && "駅・線をクリックして削除"}
        </div>
      </div>

      {/* Legend (Fixed at Bottom-Right) */}
      {showLegend && linesArray.length > 0 && (
        <div className="absolute bottom-4 right-4 p-4 bg-background/80 backdrop-blur border rounded-md shadow-sm pointer-events-none text-xs min-w-[120px] max-h-[300px] overflow-hidden flex flex-col gap-2">
          <div className="font-semibold text-primary border-b pb-1.5 mb-1 tracking-tight">
            凡例 (Legend)
          </div>
          <div className="space-y-2 overflow-y-auto">
            {linesArray.map((line) => (
              <div key={line.id} className="flex items-center gap-2">
                <div
                  className="size-3 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: line.color }}
                />
                <span className="font-medium truncate">{line.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
