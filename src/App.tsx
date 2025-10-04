import React, { useState } from "react";
import Section from "./components/Section";
import SheetConfigForm from "./components/SheetConfigForm";
import KerfInput from "./components/KerfInput";
import PanelListForm from "./components/PanelListForm";
import LayoutView from "./components/LayoutView";
import type { PlannerInputs, Panel } from "./types";

type Mode = "inputs" | "layout";

const initialPanels: Panel[] = [
  { id: "p1", width: 600, height: 300, qty: 2 },
  { id: "p2", width: 400, height: 400, qty: 1 },
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
          <h1 className="text-xl font-bold">OptiCut</h1>
          <div className="text-sm text-gray-400">Zero-waste cut planner</div>
        </div>
      </header>


      {mode === "inputs" ? (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 pb-24 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
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
        © {new Date().getFullYear()} OptiCut
      </footer>
    </main>
  );
}

export default App;
