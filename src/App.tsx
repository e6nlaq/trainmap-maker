import { EditorSidebar } from "./components/EditorSidebar";
import { MapCanvas } from "./components/MapCanvas";

function App() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <MapCanvas />
      </div>

      {/* Editor Sidebar */}
      <EditorSidebar />
    </div>
  );
}

export default App;
