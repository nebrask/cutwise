import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

client.connect().catch((err) => {
  console.error("Database connection failed:", err);
  process.exit(1);
});

const parsePanels = (val) => {
  try {
    const panels = typeof val === "string" ? JSON.parse(val) : val;
    if (!Array.isArray(panels)) return [];
    return panels.map((p) => ({
      id: String(p?.id ?? cryptoRandomId()),
      label: String(p?.label ?? ""),
      width: Number(p?.width),
      height: Number(p?.height),
      qty: Number(p?.qty ?? 1),
      material: String(p?.material ?? "").trim(),
    }));
  } catch {
    return [];
  }
};

function cryptoRandomId() {
  return "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

app.post("/api/projects", async (req, res) => {
  try {
    const { name, panels, sheet_width, sheet_height, kerf } = req.body;
    if (!name || !Array.isArray(panels) || panels.length === 0)
      return res.status(400).json({ error: "Missing project data" });

    const cleanPanels = parsePanels(panels);
    const result = await client.query(
      `INSERT INTO projects (name, panels, sheet_width, sheet_height, kerf)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, JSON.stringify(cleanPanels), Number(sheet_width), Number(sheet_height), Number(kerf)]
    );

    res.json({ id: result.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM projects WHERE id = $1", [
      req.params.id,
    ]);
    if (!result.rows.length)
      return res.status(404).json({ error: "Project not found" });

    const row = result.rows[0];
    const panels = parsePanels(row.panels);

    res.json({
      id: row.id,
      name: row.name,
      panels,
      sheet_width: Number(row.sheet_width),
      sheet_height: Number(row.sheet_height),
      kerf: Number(row.kerf),
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});


app.put("/api/projects/:id", async (req, res) => {
  try {
    const { name, panels, sheet_width, sheet_height, kerf } = req.body;
    if (!name || !Array.isArray(panels) || panels.length === 0)
      return res.status(400).json({ error: "Missing project data" });

    const cleanPanels = parsePanels(panels); 

    await client.query(
      `UPDATE projects
       SET name=$1, panels=$2, sheet_width=$3, sheet_height=$4, kerf=$5, updated_at=NOW()
       WHERE id=$6`,
      [name, JSON.stringify(cleanPanels), Number(sheet_width), Number(sheet_height), Number(kerf), req.params.id]
    );

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
