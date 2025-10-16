import { useState } from "react";
import Section from "./components/Section";
import SheetConfigForm from "./components/SheetConfigForm";
import KerfInput from "./components/KerfInput";
import PanelListForm from "./components/PanelListForm";
import LayoutView from "./components/LayoutView";
import type { PlannerInputs, Panel } from "./types";

type Mode = "inputs" | "layout";

const initialPanels: Panel[] = [
  // Plywood - structural carcass and shelving
  { id: "p1", label: "Side Panel",        width: 600,  height: 1200, qty: 2, material: "plywood" },
  { id: "p2", label: "Top and Bottom",    width: 1100, height: 600,  qty: 2, material: "plywood" },
  { id: "p3", label: "Fixed Shelf",       width: 1100, height: 300,  qty: 1, material: "plywood" },
  { id: "p4", label: "Adjustable Shelf",  width: 1100, height: 300,  qty: 2, material: "plywood" },
  { id: "p5", label: "Back Panel",        width: 1100, height: 1200, qty: 1, material: "plywood" },

  // MDF - drawer components and interior dividers
  { id: "p6", label: "Drawer Front",      width: 520,  height: 180,  qty: 4, material: "mdf" },
  { id: "p7", label: "Drawer Side",       width: 500,  height: 120,  qty: 8, material: "mdf" },
  { id: "p8", label: "Compartment Wall",  width: 500,  height: 250,  qty: 3, material: "mdf" },
  { id: "p9", label: "Support Rail",      width: 80,   height: 800,  qty: 4, material: "mdf" },

  // Acrylic - glass-like door panels
  { id: "p10", label: "Door Panel",       width: 400,  height: 500,  qty: 2, material: "acrylic" },

  // Solid wood - face frame (horizontal and vertical grain)
  { id: "p11", label: "Face Rail",        width: 1100, height: 70,   qty: 2, material: "wood-h" },
  { id: "p12", label: "Face Stile",       width: 70,   height: 700,  qty: 2, material: "wood-v" },
];


function App() {
  const [mode, setMode] = useState<Mode>("inputs");

  const [inputs, setInputs] = useState<PlannerInputs>({
    sheet: { width: 2440, height: 1220 },
    kerf: 3.2,
    panels: initialPanels,
  });

  const setSheet = (sheet: PlannerInputs["sheet"]) =>
    setInputs((prev) => ({ ...prev, sheet }));

  const setKerf = (kerf: number) =>
    setInputs((prev) => ({ ...prev, kerf }));

  const setPanels = (panels: Panel[]) =>
    setInputs((prev) => ({ ...prev, panels }));

  const reset = () =>
    setInputs({
      sheet: { width: 2440, height: 1220 },
      kerf: 3.2,
      panels: [],
    });

  const goToLayout = () => setMode("layout");
  const backToInputs = () => setMode("inputs");

  return (
    <main className="min-h-screen bg-black text-gray-100">
      <header className="border-b border-gray-900 bg-gray-950">
        <div className="flex w-full items-center justify-between px-10 py-4">
          <div className="flex items-center">
            <img 
              src="src\assets\logo.png" 
              alt="CutWise Logo" 
              className="h-9 w-9"
            />
            <h1 className="text-xl font-semibold tracking-tight">CutWise</h1>
          </div>
          <div className="text-sm text-gray-400">Zero-waste cut planner</div>
        </div>
      </header>


      {mode === "inputs" ? (
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 pb-24 md:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Section title="Sheet Configuration">
              <SheetConfigForm value={inputs.sheet} onChange={setSheet} />
            </Section>

            <Section title="Kerf">
              <div className="max-w-xs">
                <KerfInput value={inputs.kerf} onChange={setKerf} />
              </div>
            </Section>

            <Section
              title="Panels"
              right={
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-900"
                >
                  Reset
                </button>
              }
            >
              <PanelListForm items={inputs.panels} onChange={setPanels} />
            </Section>
          </div>

          <aside className="space-y-4">
            <Section title="Summary">
              <ul className="space-y-1 text-sm text-gray-300">
                <li>
                  Sheet: <span className="text-gray-100">{inputs.sheet.width} × {inputs.sheet.height} mm</span>
                </li>
                <li>
                  Kerf: <span className="text-gray-100">{inputs.kerf} mm</span>
                </li>
                <li>
                  Panels: <span className="text-gray-100">{inputs.panels.reduce((acc, p) => acc + p.qty, 0)}</span>
                </li>
              </ul>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={goToLayout}
                  className="w-full rounded-xl bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-500"
                >
                  Continue to Layout
                </button>
              </div>
            </Section>

            <Section title="Tips">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-400">
                <li>Use millimeters for consistency.</li>
                <li>Set kerf to match your blade width.</li>
                <li>Add panels in the sizes you actually need.</li>
              </ol>
            </Section>
          </aside>
        </div>
      ) : (
        <LayoutView inputs={inputs} onBack={backToInputs} />
      )}

      <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-900 bg-black py-3 text-center text-[10px] text-gray-500">
        © {new Date().getFullYear()} CutWise
      </footer>
    </main>
  );
}

export default App;
