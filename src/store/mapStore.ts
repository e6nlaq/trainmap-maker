import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";

export type Station = {
  id: string;
  name: string;
  nameEn: string;
  numbering: string;
  x: number;
  y: number;
};

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

  addStation: (x: number, y: number) => string;
  updateStation: (id: string, updates: Partial<Station>) => void;
  removeStation: (id: string) => void;

  addLine: (name: string, color: string) => string;
  updateLine: (id: string, updates: Partial<Line>) => void;
  removeLine: (id: string) => void;

  addEdge: (s1: string, s2: string, lineId: string) => string | null;
  removeEdge: (id: string) => void;

  selectStation: (id: string | null) => void;
  selectLine: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setEditMode: (mode: "select" | "connect" | "move" | "delete") => void;
  setConnectionStart: (id: string | null) => void;
  toggleLegend: () => void;
  resetMap: () => void;
  importData: (data: { stations: Record<string, Station>, lines: Record<string, Line>, edges: Record<string, Edge> }) => void;
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

      addStation: (x, y) => {
        const id = nanoid();
        set((state) => ({
          stations: {
            ...state.stations,
            [id]: { id, name: "新駅", nameEn: "New Station", numbering: "", x, y },
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
            if (newEdges[edgeId].station1Id === id || newEdges[edgeId].station2Id === id) {
              delete newEdges[edgeId];
            }
          }

          return {
            stations: newStations,
            edges: newEdges,
            selectedStationId: state.selectedStationId === id ? null : state.selectedStationId,
            connectionStartId: state.connectionStartId === id ? null : state.connectionStartId,
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
            selectedLineId: state.selectedLineId === id ? null : state.selectedLineId,
          };
        });
      },

      addEdge: (s1, s2, lineId) => {
        if (s1 === s2) return null;
        
        // Check if edge already exists for this line
        const exists = Object.values(get().edges).some(
          (e) =>
            e.lineId === lineId &&
            ((e.station1Id === s1 && e.station2Id === s2) ||
              (e.station1Id === s2 && e.station2Id === s1))
        );
        if (exists) return null;

        const id = nanoid();
        set((state) => ({
          edges: {
            ...state.edges,
            [id]: { id, station1Id: s1, station2Id: s2, lineId },
          },
          // Chain connection by making the second station the new start
          connectionStartId: s2
        }));
        return id;
      },

      removeEdge: (id) => {
        set((state) => {
          const newEdges = { ...state.edges };
          delete newEdges[id];
          return {
            edges: newEdges,
            selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
          };
        });
      },

      selectStation: (id) => {
        const state = get();
        
        if (state.editMode === "connect" && state.selectedLineId && id) {
          if (state.connectionStartId && state.connectionStartId !== id) {
            // Connect and then set 'id' as the new start (chaining)
            state.addEdge(state.connectionStartId, id, state.selectedLineId);
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

      resetMap: () => set({
        stations: {},
        lines: {},
        edges: {},
        selectedStationId: null,
        selectedLineId: null,
        selectedEdgeId: null,
        connectionStartId: null
      }),

      importData: (data) => set({
        stations: data.stations || {},
        lines: data.lines || {},
        edges: data.edges || {},
        selectedStationId: null,
        selectedLineId: null,
        selectedEdgeId: null,
        connectionStartId: null
      }),
    }),
    {
      name: "trainmap-graph-storage",
    }
  )
);
