import {
  Download,
  Eraser,
  ExternalLink,
  Info,
  Link,
  MousePointer2,
  Move,
  Plus,
  RotateCcw,
  Route,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/mapStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Switch } from "./ui/switch";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

export function EditorSidebar() {
  const {
    stations,
    selectedStationId,
    updateStation,
    removeStation,
    lines,
    addLine,
    updateLine,
    removeLine,
    selectedLineId,
    selectLine,
    editMode,
    setEditMode,
    edges,
    showLegend,
    toggleLegend,
    resetMap,
    importData,
  } = useMapStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedStation = selectedStationId
    ? stations[selectedStationId]
    : null;
  const linesArray = Object.values(lines);

  const handleAddLine = () => {
    const id = addLine(`New Line ${linesArray.length + 1}`, "#EE7B00");
    selectLine(id);
  };

  const handleExport = () => {
    const data = { stations, lines, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trainmap-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importData(data);
      } catch (_err) {
        alert("ファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="w-80 border-l bg-card h-full flex flex-col shrink-0">
      <div className="p-4 border-b flex items-center justify-between font-semibold">
        Editor
      </div>

      <div className="p-4 border-b">
        <ToggleGroup
          type="single"
          value={editMode}
          onValueChange={(val) => val && setEditMode(val as typeof editMode)}
          className="justify-start gap-1"
        >
          <ToggleGroupItem value="select" className="flex-1 text-xs">
            <MousePointer2 className="size-3 mr-2" />
            選択
          </ToggleGroupItem>
          <ToggleGroupItem value="connect" className="flex-1 text-xs">
            <Link className="size-3 mr-2" />
            接続
          </ToggleGroupItem>
          <ToggleGroupItem value="move" className="flex-1 text-xs">
            <Move className="size-3 mr-2" />
            移動
          </ToggleGroupItem>
          <ToggleGroupItem
            value="delete"
            className="flex-1 text-xs text-destructive data-[state=on]:text-destructive"
          >
            <Eraser className="size-3 mr-2" />
            削除
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 flex flex-col gap-8">
          {/* Station Properties */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <Info className="size-3" />
              Station Info
            </h3>

            {!selectedStation ? (
              <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center border border-dashed">
                駅を選択してプロパティを編集します。
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="station-name">Name</Label>
                  <Input
                    id="station-name"
                    value={selectedStation.name}
                    onChange={(e) =>
                      updateStation(selectedStation.id, {
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="station-name-en">English Name</Label>
                  <Input
                    id="station-name-en"
                    value={selectedStation.nameEn}
                    onChange={(e) =>
                      updateStation(selectedStation.id, {
                        nameEn: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="station-number">Numbering</Label>
                  <Input
                    id="station-number"
                    placeholder="M17 C07"
                    value={selectedStation.numbering}
                    onChange={(e) =>
                      updateStation(selectedStation.id, {
                        numbering: e.target.value,
                      })
                    }
                  />
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => removeStation(selectedStation.id)}
                >
                  <Trash2 className="size-3 mr-2" />
                  駅を削除
                </Button>
              </div>
            )}
          </section>

          {/* Lines Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                <Route className="size-3" />
                Lines
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="legend-toggle"
                    className="text-[10px] font-bold uppercase text-muted-foreground/60"
                  >
                    Legend
                  </Label>
                  <Switch
                    id="legend-toggle"
                    checked={showLegend}
                    onCheckedChange={toggleLegend}
                    className="scale-75 origin-right"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  className="h-8 shadow-sm"
                >
                  <Plus className="size-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {linesArray.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center border border-dashed">
                路線がありません。
              </div>
            ) : (
              <div className="space-y-2">
                {linesArray.map((line) => {
                  const isSelected = selectedLineId === line.id;
                  const lineEdges = Object.values(edges).filter(
                    (e) => e.lineId === line.id,
                  );
                  const stationCount = new Set(
                    lineEdges.flatMap((e) => [e.station1Id, e.station2Id]),
                  ).size;

                  return (
                    <div
                      key={line.id}
                      className={cn(
                        "p-3 border rounded-lg transition-all cursor-pointer",
                        isSelected
                          ? "ring-2 ring-primary border-transparent bg-primary/5"
                          : "bg-background hover:bg-muted/30",
                      )}
                      onClick={() => selectLine(isSelected ? null : line.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="size-4 rounded-full border shadow-inner shrink-0"
                          style={{ backgroundColor: line.color }}
                        />
                        <Input
                          className="h-8 border-none bg-transparent p-0 text-sm font-medium focus-visible:ring-0"
                          value={line.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            updateLine(line.id, { name: e.target.value })
                          }
                        />
                        <Input
                          type="color"
                          className="size-6 p-0 border-0 rounded overflow-hidden shrink-0 cursor-pointer"
                          value={line.color}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            updateLine(line.id, { color: e.target.value })
                          }
                        />
                      </div>

                      {isSelected && (
                        <div className="mt-3 pt-3 border-t space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="text-[10px] text-muted-foreground flex justify-between px-1">
                            <span>Active Selection</span>
                            <span>
                              {stationCount} Stations • {lineEdges.length} Edges
                            </span>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-8 text-xs text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLine(line.id);
                            }}
                          >
                            Delete Line
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>

      {/* File Operations (Fixed footer at the bottom) */}
      <div className="p-4 border-t bg-muted/5 space-y-4">
        <div className="flex items-center justify-between px-1">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Project Management
            </Label>
            <a 
                href="https://github.com/e6nlaq/trainmap-maker#使い方" 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold italic"
            >
                HELP / README <ExternalLink className="size-2.5" />
            </a>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 text-[11px]"
          >
            <Download className="size-3 mr-2" />
            エクスポート
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-[11px]">
                <Upload className="size-3 mr-2" />
                インポート
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  マップをインポートしますか？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  現在の編集内容はすべて上書きされます。よろしいですか？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => fileInputRef.current?.click()}
                >
                  実行
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleFileChange}
          />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] text-destructive hover:text-destructive col-span-2"
              >
                <RotateCcw className="size-3 mr-2" />
                全リセット
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  全てのデータを消去しますか？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  駅、路線、接続情報が全て削除されます。この操作は取り消せません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={resetMap}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  全て消去
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
