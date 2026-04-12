import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Station = {
  id: string;
  name: string;
  nameEn: string;
  numbering: string;
  x: number;
  y: number;
  size: number;
}

export type Edge = {
  id: string;
  station1Id: string;
  station2Id: string;
  lineId: string;
};

export type Line = {
  id: string;
  name: string;
  color: string;
};

type MapState = {
  stations: Record<string, Station>;
  lines: Record<string, Line>;
  edges: Record<string, Edge>;
  selectedStationId: string | null;
  selectedLineId: string | null;
  selectedEdgeId: string | null;
  editMode: "select" | "connect" | "move" | "delete";
  connectionStartId: string | null;
  showLegend: boolean;
  useStationGradients: boolean;
  autoNumbering: boolean;
  sortNumbering: boolean;
  lineOrder: string[];

  addStation: (x: number, y: number) => string;
  updateStation: (id: string, updates: Partial<Station>) => void;
  removeStation: (id: string) => void;

  addLine: (name: string, color: string) => string;
  updateLine: (id: string, updates: Partial<Line>) => void;
  removeLine: (id: string) => void;
  reorderLines: (startIndex: number, endIndex: number) => void;

  addEdge: (s1: string, s2: string, lineId: string, isShiftPressed?: boolean) => string | null;
  removeEdge: (id: string) => void;

  selectStation: (id: string | null, isShiftPressed?: boolean) => void;
  selectLine: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setEditMode: (mode: "select" | "connect" | "move" | "delete") => void;
  setConnectionStart: (id: string | null) => void;
  toggleLegend: () => void;
  toggleStationGradients: () => void;
  toggleAutoNumbering: () => void;
  toggleSortNumbering: () => void;
  resetMap: () => void;
  importData: (data: {
    stations: Record<string, Station>;
    lines: Record<string, Line>;
    edges: Record<string, Edge>;
    lineOrder?: string[];
    useStationGradients?: boolean;
    autoNumbering?: boolean;
    sortNumbering?: boolean;
  }) => void;
};

export const useMapStore = create<MapState>()(
  persist(
    (set, get) => ({
      stations: {},
      lines: {},
      edges: {},
      selectedStationId: null,
      selectedLineId: null,
      selectedEdgeId: null,
      editMode: "select",
      connectionStartId: null,
      showLegend: true,
      useStationGradients: true,
      autoNumbering: true,
      sortNumbering: true,
      lineOrder: [],

      addStation: (x, y) => {
        const id = nanoid();
        set((state) => ({
          stations: {
            ...state.stations,
            [id]: {
              id,
              name: "新駅",
              nameEn: "New Station",
              numbering: "",
              x,
              y,
              size: 36,
            },
          },
        }));
        return id;
      },

      updateStation: (id, updates) => {
        set((state) => ({
          stations: {
            ...state.stations,
            [id]: { ...state.stations[id], ...updates },
          },
        }));
      },

      removeStation: (id) => {
        set((state) => {
          const newStations = { ...state.stations };
          delete newStations[id];

          // Remove all edges connected to this station
          const newEdges = { ...state.edges };
          for (const edgeId in newEdges) {
            if (
              newEdges[edgeId].station1Id === id ||
              newEdges[edgeId].station2Id === id
            ) {
              delete newEdges[edgeId];
            }
          }

          return {
            stations: newStations,
            edges: newEdges,
            selectedStationId:
              state.selectedStationId === id ? null : state.selectedStationId,
            connectionStartId:
              state.connectionStartId === id ? null : state.connectionStartId,
          };
        });
      },

      addLine: (name, color) => {
        const id = nanoid();
        set((state) => ({
          lines: {
            ...state.lines,
            [id]: { id, name, color },
          },
          lineOrder: [...state.lineOrder, id],
          selectedLineId: id,
        }));
        return id;
      },

      updateLine: (id, updates) => {
        set((state) => ({
          lines: {
            ...state.lines,
            [id]: { ...state.lines[id], ...updates },
          },
        }));
      },

      removeLine: (id) => {
        set((state) => {
          const newLines = { ...state.lines };
          delete newLines[id];

          // Remove all edges associated with this line
          const newEdges = { ...state.edges };
          for (const edgeId in newEdges) {
            if (newEdges[edgeId].lineId === id) {
              delete newEdges[edgeId];
            }
          }

          return {
            lines: newLines,
            edges: newEdges,
            lineOrder: state.lineOrder.filter((lineId) => lineId !== id),
            selectedLineId:
              state.selectedLineId === id ? null : state.selectedLineId,
          };
        });
      },

      reorderLines: (startIndex, endIndex) => {
        set((state) => {
          const newOrder = [...state.lineOrder];
          const [removed] = newOrder.splice(startIndex, 1);
          newOrder.splice(endIndex, 0, removed);
          return { lineOrder: newOrder };
        });
      },

      addEdge: (s1, s2, lineId, isShiftPressed) => {
        if (s1 === s2) return null;

        // Check if edge already exists for this line
        const exists = Object.values(get().edges).some(
          (e) =>
            e.lineId === lineId &&
            ((e.station1Id === s1 && e.station2Id === s2) ||
              (e.station1Id === s2 && e.station2Id === s1)),
        );
        if (exists) return null;

        const id = nanoid();
        set((state) => {
          const st1 = state.stations[s1];
          const st2 = state.stations[s2];

          // Auto-numbering logic
          let updatedS2 = st2;
          if (state.autoNumbering && st1 && st2) {
            const s1Numbers = st1.numbering.split(/[\s,]+/).filter(Boolean);
            const s2Numbers = st2.numbering.split(/[\s,]+/).filter(Boolean);

            const lastN1 = s1Numbers[s1Numbers.length - 1];
            if (lastN1) {
              const match = lastN1.match(/^([A-Z]+)(\d+)$/i);
              if (match) {
                const prefix = match[1];
                const num = parseInt(match[2], 10);
                const nextNum = isShiftPressed ? num - 1 : num + 1;

                // Check if s2 already has this prefix
                const hasPrefix = s2Numbers.some((n2) => n2.startsWith(prefix));
                if (!hasPrefix && nextNum >= 1) {
                  const newNumbers = [...s2Numbers];
                  newNumbers.push(
                    `${prefix}${String(nextNum).padStart(2, "0")}`,
                  );
                  updatedS2 = { ...st2, numbering: newNumbers.join(" ") };
                }
              }
            }
          }

          return {
            edges: {
              ...state.edges,
              [id]: { id, station1Id: s1, station2Id: s2, lineId },
            },
            stations:
              updatedS2 !== st2
                ? {
                    ...state.stations,
                    [s2]: updatedS2,
                  }
                : state.stations,
            // Chain connection by making the second station the new start
            connectionStartId: s2,
          };
        });
        return id;
      },

      removeEdge: (id) => {
        set((state) => {
          const newEdges = { ...state.edges };
          delete newEdges[id];
          return {
            edges: newEdges,
            selectedEdgeId:
              state.selectedEdgeId === id ? null : state.selectedEdgeId,
          };
        });
      },

      selectStation: (id, isShiftPressed) => {
        const state = get();

        if (state.editMode === "connect" && state.selectedLineId && id) {
          if (state.connectionStartId && state.connectionStartId !== id) {
            // Connect and then set 'id' as the new start (chaining)
            state.addEdge(
              state.connectionStartId,
              id,
              state.selectedLineId,
              isShiftPressed,
            );
          } else {
            // Set first station
            state.setConnectionStart(id);
          }
        }

        if (state.editMode === "delete" && id) {
          state.removeStation(id);
          return;
        }

        set({ selectedStationId: id });
      },

      selectLine: (id) => set({ selectedLineId: id }),
      selectEdge: (id) => set({ selectedEdgeId: id }),
      setEditMode: (mode) => set({ editMode: mode, connectionStartId: null }),
      setConnectionStart: (id) => set({ connectionStartId: id }),
      toggleLegend: () => set((state) => ({ showLegend: !state.showLegend })),
      toggleStationGradients: () =>
        set((state) => ({ useStationGradients: !state.useStationGradients })),
      toggleAutoNumbering: () =>
        set((state) => ({ autoNumbering: !state.autoNumbering })),
      toggleSortNumbering: () =>
        set((state) => ({ sortNumbering: !state.sortNumbering })),

      resetMap: () =>
        set({
          stations: {},
          lines: {},
          edges: {},
          lineOrder: [],
          selectedStationId: null,
          selectedLineId: null,
          selectedEdgeId: null,
          connectionStartId: null,
          useStationGradients: true,
          autoNumbering: true,
          sortNumbering: true,
        }),

      importData: (data) =>
        set({
          stations: data.stations || {},
          lines: data.lines || {},
          edges: data.edges || {},
          lineOrder: data.lineOrder || Object.keys(data.lines || {}),
          useStationGradients: data.useStationGradients ?? true,
          autoNumbering: data.autoNumbering ?? true,
          sortNumbering: data.sortNumbering ?? true,
          selectedStationId: null,
          selectedLineId: null,
          selectedEdgeId: null,
          connectionStartId: null,
        }),
    }),
    {
      name: "trainmap-graph-storage",
      version: 1,
      // biome-ignore lint/suspicious/noExplicitAny: off
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // If migrating from older version without lineOrder, initialize it from lines
          if (persistedState?.lines) {
            persistedState.lineOrder = Object.keys(persistedState.lines);
          } else {
            persistedState.lineOrder = [];
          }
        }
        return persistedState;
      },
    },
  ),
);
