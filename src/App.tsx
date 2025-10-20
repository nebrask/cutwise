import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { DownloadIcon, UploadIcon, CopyIcon } from "@radix-ui/react-icons";
import Section from "./components/Section";
import SheetConfigForm from "./components/SheetConfigForm";
import KerfInput from "./components/KerfInput";
import PanelListForm from "./components/PanelListForm";
import LayoutView from "./components/LayoutView";
import type { PlannerInputs, Panel } from "./types";

type Mode = "inputs" | "layout";

const defaultProjectName = "Cabinet Design";
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

  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [displayProjectName, setDisplayProjectName] = useState("");
  const [savedProjectId, setSavedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [modalMode, setModalMode] = useState<"save" | "load">("save");

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

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

  const saveProject = async () => {
    if (!projectName.trim()) {
      alert("Please enter a project name");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          panels: inputs.panels,
          sheet_width: inputs.sheet.width,
          sheet_height: inputs.sheet.height,
          kerf: inputs.kerf,
        }),
      });
      const data = await res.json();
      setSavedProjectId(data.id);
      setDisplayProjectName(projectName);
    } catch (err) {
      alert("Error saving project: " + String(err));
    }
    setLoading(false);
  };

  const loadProject = async () => {
    if (!projectId.trim()) {
      alert("Please enter a project ID");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Project not found");
      const project = await res.json();

      setInputs({
        panels: project.panels,
        sheet: { width: project.sheet_width, height: project.sheet_height },
        kerf: project.kerf,
      });
      setDisplayProjectName(project.name);
      setProjectId("");
      setShowProjectModal(false);
    } catch (err) {
      alert("Error loading project: " + String(err));
    }
    setLoading(false);
  };

  const openSaveModal = () => {
    setProjectId("");
    setProjectName("");
    setSavedProjectId("");
    setModalMode("save");
    setShowProjectModal(true);
  };

  const openLoadModal = () => {
    setProjectId("");
    setProjectName("");
    setModalMode("load");
    setShowProjectModal(true);
  };

  const goToLayout = () => setMode("layout");
  const backToInputs = () => setMode("inputs");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="min-h-screen bg-black text-gray-100">
      <header className="border-b border-gray-900 bg-gray-950">
        <div className="flex w-full items-center justify-between px-10 py-4">
          <div className="flex items-center">
            <img
              src="/logo.png"
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
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
              <button
                onClick={openSaveModal}
                className="flex-1 group relative rounded-xl border border-gray-700 bg-gray-900/50 px-4 py-3 font-medium text-gray-200 overflow-hidden hover:border-cyan-500/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center gap-2">
                  <UploadIcon className="h-4 w-4" />
                  Save Project
                </div>
              </button>

              <button
                onClick={openLoadModal}
                className="flex-1 group relative rounded-xl border border-gray-700 bg-gray-900/50 px-4 py-3 font-medium text-gray-200 overflow-hidden hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center gap-2">
                  <DownloadIcon className="h-4 w-4" />
                  Load Project
                </div>
              </button>
            </div>

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
                  Project: <span className="text-gray-100">{displayProjectName || defaultProjectName}</span>
                </li>
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

      <Dialog.Root open={showProjectModal} onOpenChange={setShowProjectModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-2xl
                       data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 duration-300"
          >
            <Dialog.Title className="text-xl font-semibold text-gray-100 mb-1">
              {modalMode === "save" ? "Save Project" : "Load Project"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-400 mb-4">
              {modalMode === "save"
                ? "Give your project a name to save it"
                : "Enter a project ID to load"}
            </Dialog.Description>

            <div className="space-y-3">
              {modalMode === "save" ? (
                <>
                  <input
                    type="text"
                    placeholder="Project name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
                  />
                  <button
                    onClick={saveProject}
                    disabled={loading || !projectName.trim()}
                    className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 font-medium text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                  {savedProjectId && (
                    <div className="rounded-lg bg-gray-900 p-3 border border-gray-700">
                      <p className="text-xs text-gray-400 mb-2">Project ID (save this to load later):</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-cyan-400 break-all flex-1">{savedProjectId}</p>
                        <button
                          onClick={() => copyToClipboard(savedProjectId)}
                          className="flex-shrink-0 p-1.5 hover:bg-gray-800 rounded transition-colors"
                          title="Copy ID"
                        >
                          <CopyIcon className="h-4 w-4 text-gray-400 hover:text-cyan-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Paste project ID"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                  <button
                    onClick={loadProject}
                    disabled={loading || !projectId.trim()}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? "Loading..." : "Load"}
                  </button>
                </>
              )}

              <Dialog.Close asChild>
                <button
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-700 px-4 py-2.5 font-medium text-gray-300 hover:bg-gray-900 transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-900 bg-black py-3 text-center text-[10px] text-gray-500">
        © {new Date().getFullYear()} CutWise
      </footer>
    </main>
  );
}

export default App;