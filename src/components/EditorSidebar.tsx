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
  ChevronUp,
  ChevronDown,
  Camera,
} from "lucide-react";
import { useRef, useState } from "react";
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
    lineOrder,
    reorderLines,
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
  const [includeLegendInExport, setIncludeLegendInExport] = useState(true);
  const [isProjectMenuExpanded, setIsProjectMenuExpanded] = useState(false);

  const selectedStation = selectedStationId
    ? stations[selectedStationId]
    : null;
  
  const orderedLines = (lineOrder && lineOrder.length > 0)
    ? lineOrder.map(id => lines[id]).filter(Boolean)
    : Object.values(lines);

  const handleAddLine = () => {
    const colors = [
      "#FF9500", "#F62E36", "#009BBF", "#00BB85", "#8F76D6",
      "#00AC9B", "#C1A470", "#9C5E31", "#B5B5AC", "#E60012"
    ];
    const sequenceColor = colors[orderedLines.length % colors.length];
    const id = addLine(`路線 ${orderedLines.length + 1}`, sequenceColor);
    selectLine(id);
  };

  const handleExport = () => {
    const data = { stations, lines, edges, lineOrder };
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

  const handleExportPng = () => {
    const svg = document.querySelector('svg[aria-label="Train Map Canvas"]') as SVGSVGElement | null;
    if (!svg) return;

    const width = svg.clientWidth;
    const height = svg.clientHeight;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);

      if (includeLegendInExport && orderedLines.length > 0) {
        const padding = 16;
        const itemHeight = 20;
        const legendWidth = 160;
        const legendHeight = orderedLines.length * itemHeight + 40;
        const x = width - legendWidth - padding;
        const y = height - legendHeight - padding;

        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.roundRect(x, y, legendWidth, legendHeight, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#e5e5e5";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#333";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("凡例 (Legend)", x + 12, y + 24);
        
        ctx.strokeStyle = "#eee";
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 32);
        ctx.lineTo(x + legendWidth - 12, y + 32);
        ctx.stroke();

        orderedLines.forEach((line, i) => {
          const iy = y + 50 + i * itemHeight;
          ctx.fillStyle = line.color;
          ctx.beginPath();
          ctx.arc(x + 18, iy - 4, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#333";
          ctx.font = "11px sans-serif";
          ctx.fillText(line.name, x + 30, iy);
        });
      }

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `trainmap-${new Date().getTime()}.png`;
      downloadLink.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
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
      <div className="p-4 border-b flex items-center justify-between font-bold">
        エディター
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
              駅情報
            </h3>

            {!selectedStation ? (
              <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center border border-dashed">
                駅を選択してプロパティを編集します。
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="station-name">駅名</Label>
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
                  <Label htmlFor="station-name-en">駅名 (英語)</Label>
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
                  <Label htmlFor="station-number">ナンバリング</Label>
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

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                        >
                            <Trash2 className="size-3 mr-2" />
                            この駅を削除
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>駅を削除しますか？</AlertDialogTitle>
                            <AlertDialogDescription>
                                「{selectedStation.name}」駅を削除します。この駅に関連するすべての区間（線）も削除されます。よろしいですか？
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => removeStation(selectedStation.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                削除する
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </section>

          {/* Lines Section */}
          <section className="space-y-4 pb-12">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                <Route className="size-3" />
                路線
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="legend-toggle"
                    className="text-[10px] font-bold uppercase text-muted-foreground/60"
                  >
                    凡例
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
                  追加
                </Button>
              </div>
            </div>

            {orderedLines.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center border border-dashed">
                路線がありません。
              </div>
            ) : (
              <div className="space-y-2">
                {orderedLines.map((line, index) => {
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
                            className="flex flex-col gap-0.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="size-5 h-5 w-5"
                                disabled={index === 0}
                                onClick={() => reorderLines(index, index - 1)}
                            >
                                <ChevronUp className="size-3" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="size-5 h-5 w-5"
                                disabled={index === orderedLines.length - 1}
                                onClick={() => reorderLines(index, index + 1)}
                            >
                                <ChevronDown className="size-3" />
                            </Button>
                        </div>

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
                            <span>選択中</span>
                            <span>
                              {stationCount} 駅 • {lineEdges.length} 区間
                            </span>
                          </div>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-8 text-xs text-destructive hover:bg-destructive/10"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    この路線を削除
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>路線を削除しますか？</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        路線「{line.name}」を削除します。この路線に含まれるすべての接続情報も削除されます。よろしいですか？
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeLine(line.id);
                                        }}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        削除する
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* File Operations (Collapsible footer at the bottom) */}
      <div className={cn(
        "p-4 border-t bg-muted/10 transition-all duration-300 relative",
        isProjectMenuExpanded ? "h-auto" : "h-14"
      )}>
        <div 
            className="flex items-center justify-between px-1 cursor-pointer select-none h-6"
            onClick={() => setIsProjectMenuExpanded(!isProjectMenuExpanded)}
        >
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer">
            プロジェクト管理
          </Label>
          <div className="flex items-center gap-2">
            <a
                href="https://github.com/e6nlaq/trainmap-maker#使い方"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold mr-2"
                onClick={(e) => e.stopPropagation()}
            >
                使い方を表示 <ExternalLink className="size-2.5" />
            </a>
            <Button
                variant="ghost"
                size="icon"
                className="size-6 h-6 w-6"
            >
                {isProjectMenuExpanded ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
            </Button>
          </div>
        </div>

        {isProjectMenuExpanded && (
            <div className="grid grid-cols-2 gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] col-span-2 bg-primary/5 hover:bg-primary/10 border-primary/20"
                    >
                    <Camera className="size-3 mr-2" />
                    画像として保存 (PNG)
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>画像エクスポート設定</AlertDialogTitle>
                    <AlertDialogDescription>
                        現在のキャンバス表示範囲をPNG画像として保存します。
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center justify-between">
                        <Label htmlFor="export-legend">凡例を含める</Label>
                        <Switch 
                            id="export-legend" 
                            checked={includeLegendInExport} 
                            onCheckedChange={setIncludeLegendInExport} 
                        />
                        </div>
                    </div>
                    <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={handleExportPng}>
                        保存する
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>

                <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-8 text-[11px]"
                >
                <Download className="size-3 mr-2" />
                書き出し (JSON)
                </Button>

                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-[11px]">
                    <Upload className="size-3 mr-2" />
                    読み込み
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>マップを読み込みますか？</AlertDialogTitle>
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
                    すべてリセット
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>
                        データを完全に消去しますか？
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        駅、路線、接続情報がすべて削除されます。この操作は取り消せません。
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={resetMap}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        消去する
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </div>
        )}
      </div>
    </div>
  );
}
