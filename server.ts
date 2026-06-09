/**
 * CHECKPOINT: Infinity Systems ERP - Version 1.5 (Responsive & Task Optimization)
 */
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { Server } from "socket.io";
import http from "http";
import path from "path";

const db = new Database("erp.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'gestion', 'soporte', 'tecnico')),
    name TEXT,
    phone TEXT,
    profile_picture TEXT
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_id TEXT UNIQUE,
    name TEXT NOT NULL,
    location TEXT,
    branch TEXT,
    full_address TEXT
  );
`);

// Migration for new user columns
const userTableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
const hasPhoneColumn = userTableInfo.some(col => col.name === 'phone');
if (!hasPhoneColumn) {
  db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
}
const hasProfilePictureColumn = userTableInfo.some(col => col.name === 'profile_picture');
if (!hasProfilePictureColumn) {
  db.exec("ALTER TABLE users ADD COLUMN profile_picture TEXT");
}

// Migration: Add 'full_address' column to clients if it doesn't exist
const clientTableInfo = db.prepare("PRAGMA table_info(clients)").all() as any[];
const hasAddressColumn = clientTableInfo.some(col => col.name === 'full_address');
if (!hasAddressColumn) {
  db.exec("ALTER TABLE clients ADD COLUMN full_address TEXT");
}

// Migration: Add 'unique_id' column to clients if it doesn't exist
const hasUniqueId = clientTableInfo.some(col => col.name === 'unique_id');
if (!hasUniqueId) {
  db.exec("ALTER TABLE clients ADD COLUMN unique_id TEXT");
  // Update existing clients with a generated unique ID based on their ID
  db.exec("UPDATE clients SET unique_id = 'C' || printf('%04d', id) WHERE unique_id IS NULL");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    problem TEXT,
    type TEXT,
    assigned_to TEXT, -- JSON array of user IDs or names
    scheduled_time TEXT,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );
`);

// Migration: Add 'type' column to tasks if it doesn't exist
const tableInfo = db.prepare("PRAGMA table_info(tasks)").all() as any[];
const hasTypeColumn = tableInfo.some(col => col.name === 'type');
if (!hasTypeColumn) {
  db.exec("ALTER TABLE tasks ADD COLUMN type TEXT");
}

const hasContactPhone = tableInfo.some(col => col.name === 'contact_phone');
if (!hasContactPhone) {
  db.exec("ALTER TABLE tasks ADD COLUMN contact_phone TEXT");
}

const hasAttachmentUrl = tableInfo.some(col => col.name === 'attachment_url');
if (!hasAttachmentUrl) {
  db.exec("ALTER TABLE tasks ADD COLUMN attachment_url TEXT");
}

const hasSubType = tableInfo.some(col => col.name === 'sub_type');
if (!hasSubType) db.exec("ALTER TABLE tasks ADD COLUMN sub_type TEXT");

const hasLocation = tableInfo.some(col => col.name === 'location');
if (!hasLocation) db.exec("ALTER TABLE tasks ADD COLUMN location TEXT");

const hasCompanion = tableInfo.some(col => col.name === 'companion');
if (!hasCompanion) db.exec("ALTER TABLE tasks ADD COLUMN companion TEXT");

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    client_id INTEGER,
    type TEXT CHECK(type IN ('instalacion', 'mantenimiento_correctivo', 'mantenimiento_preventivo')),
    description TEXT,
    evidence_url TEXT,
    signature_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS report_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER,
    model TEXT,
    serial TEXT,
    name TEXT,
    type TEXT,
    quantity INTEGER,
    FOREIGN KEY(report_id) REFERENCES reports(id)
  );
`);

const reportTableInfo = db.prepare("PRAGMA table_info(reports)").all() as any[];
const hasClientNameCol = reportTableInfo.some(col => col.name === 'client_name');
if (!hasClientNameCol) {
  db.exec("ALTER TABLE reports ADD COLUMN client_name TEXT");
  db.exec("ALTER TABLE reports ADD COLUMN client_address TEXT");
  db.exec("ALTER TABLE reports ADD COLUMN service_date TEXT");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tecnico_id INTEGER,
    client_name TEXT,
    location TEXT,
    problem TEXT,
    evidence_url TEXT,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tecnico_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    user_id INTEGER,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    type TEXT CHECK(type IN ('plano', 'volumetria')),
    location TEXT,
    status TEXT DEFAULT 'Pendiente',
    file_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Ensure initial users exist
const usersToSeed = [
  { username: "admin", password: "admin123", role: "admin", name: "Administrador Principal" },
  { username: "gestion", password: "gestion123", role: "gestion", name: "Gerente de Gestión" },
  { username: "soporte", password: "soporte123", role: "soporte", name: "Ingeniero de Soporte" },
  { username: "tecnico", password: "tecnico123", role: "tecnico", name: "Técnico de Campo" }
];

const checkUser = db.prepare("SELECT * FROM users WHERE username = ?");
const insertUser = db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)");
const updateUser = db.prepare("UPDATE users SET password = ?, role = ?, name = ? WHERE username = ?");

for (const user of usersToSeed) {
  const existing = checkUser.get(user.username);
  if (!existing) {
    insertUser.run(user.username, user.password, user.role, user.name);
  } else {
    // Optional: Force default passwords for these specific users to ensure access
    updateUser.run(user.password, user.role, user.name, user.username);
  }
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Auth API (Simple for demo)
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for user: ${username}`);
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      console.log(`Login successful for user: ${username} (Role: ${user.role})`);
      res.json(user);
    } else {
      console.warn(`Login failed for user: ${username}`);
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Users API
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, role, name FROM users").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { username, password, role, name, phone, profile_picture } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (username, password, role, name, phone, profile_picture) VALUES (?, ?, ?, ?, ?, ?)")
        .run(username, password, role, name, phone || null, profile_picture || null);
      res.json({ id: result.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { name, password, phone, profile_picture } = req.body;
    
    try {
      if (password) {
        db.prepare("UPDATE users SET name = ?, password = ?, phone = ?, profile_picture = ? WHERE id = ?").run(name, password, phone || null, profile_picture || null, id);
      } else {
        db.prepare("UPDATE users SET name = ?, phone = ?, profile_picture = ? WHERE id = ?").run(name, phone || null, profile_picture || null, id);
      }
      
      const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      res.json({ success: true, user: updatedUser });
    } catch (err) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Reports API - All reports
  app.get("/api/reports", (req, res) => {
    const reports = db.prepare(`
      SELECT r.*, 
             COALESCE(r.client_name, c.name) as client_name, 
             COALESCE(r.client_address, c.location) as client_location,
             r.service_date,
             c.branch as client_branch, 
             c.unique_id as client_unique_id, 
             t.problem as task_problem
      FROM reports r
      JOIN clients c ON r.client_id = c.id
      LEFT JOIN tasks t ON r.task_id = t.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(reports);
  });

  app.get("/api/reports/:id/items", (req, res) => {
    const items = db.prepare("SELECT * FROM report_items WHERE report_id = ?").all(req.params.id);
    res.json(items);
  });
  app.get("/api/clients", (req, res) => {
    const clients = db.prepare("SELECT * FROM clients").all();
    res.json(clients);
  });

  app.post("/api/clients", (req, res) => {
    const { unique_id, name, location, branch, full_address } = req.body;
    let uid = unique_id || null;
    const result = db.prepare("INSERT INTO clients (unique_id, name, location, branch, full_address) VALUES (?, ?, ?, ?, ?)").run(uid, name, location, branch, full_address);
    if (!uid) {
      uid = `C${result.lastInsertRowid.toString().padStart(4, '0')}`;
      db.prepare("UPDATE clients SET unique_id = ? WHERE id = ?").run(uid, result.lastInsertRowid);
    }
    res.json({ id: result.lastInsertRowid, unique_id: uid });
  });

  // Tasks API
  app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare(`
      SELECT t.*, c.name as client_name, c.location as client_location, c.branch as client_branch, c.full_address as client_address, c.unique_id as client_unique_id
      FROM tasks t 
      JOIN clients c ON t.client_id = c.id
      ORDER BY t.created_at DESC
    `).all();
    res.json(tasks);
  });

  app.post("/api/tasks", (req, res) => {
    const { client_id, problem, type, assigned_to, scheduled_time, contact_phone, attachment_url, sub_type, location, companion } = req.body;
    const result = db.prepare(`
      INSERT INTO tasks (client_id, problem, type, assigned_to, scheduled_time, contact_phone, attachment_url, sub_type, location, companion) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(client_id, problem, type, JSON.stringify(assigned_to), scheduled_time, contact_phone || null, attachment_url || null, sub_type || null, location || null, companion || null);
    
    const task = db.prepare(`
      SELECT t.*, c.name as client_name, c.location as client_location, c.branch as client_branch, c.full_address as client_address, c.unique_id as client_unique_id
      FROM tasks t
      JOIN clients c ON t.client_id = c.id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    io.emit("task:created", task);
    res.json(task);
  });

  app.patch("/api/tasks/:id", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(status, req.params.id);
    io.emit("task:updated", { id: req.params.id, status });
    res.json({ success: true });
  });

  // Reports API
  app.post("/api/reports", (req, res) => {
    const { task_id, client_id, type, description, evidence_url, signature_url, items, client_name, client_address, service_date } = req.body;
    
    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO reports (task_id, client_id, type, description, evidence_url, signature_url, client_name, client_address, service_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(task_id, client_id, type, description, evidence_url, signature_url, client_name || null, client_address || null, service_date || null);
      
      const reportId = result.lastInsertRowid;

      if (type === 'instalacion' && items) {
        const insertItem = db.prepare(`
          INSERT INTO report_items (report_id, model, serial, name, type, quantity) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const item of items) {
          insertItem.run(reportId, item.model, item.serial, item.name, item.type, item.quantity);
        }
      }

      if (task_id) {
        db.prepare("UPDATE tasks SET status = 'completed' WHERE id = ?").run(task_id);
        io.emit("task:updated", { id: task_id, status: 'completed' });
      }
      
      return reportId;
    });

    const reportId = transaction();
    res.json({ id: reportId });
  });

  app.get("/api/reports/client/:clientId", (req, res) => {
    const reports = db.prepare("SELECT * FROM reports WHERE client_id = ?").all(req.params.clientId);
    res.json(reports);
  });

  // Tickets API
  app.post("/api/tickets", (req, res) => {
    const { tecnico_id, client_name, location, problem, evidence_url } = req.body;
    const result = db.prepare(`
      INSERT INTO tickets (tecnico_id, client_name, location, problem, evidence_url) 
      VALUES (?, ?, ?, ?, ?)
    `).run(tecnico_id, client_name, location, problem, evidence_url);
    const newTicket = { id: result.lastInsertRowid, ...req.body, status: 'open' };
    io.emit("ticket:created", newTicket);
    res.json(newTicket);
  });

  app.get("/api/tickets", (req, res) => {
    const tickets = db.prepare("SELECT * FROM tickets ORDER BY created_at DESC").all();
    res.json(tickets);
  });

  app.put("/api/tickets/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE tickets SET status = ? WHERE id = ?").run(status, id);
    io.emit("ticket:updated", { id, status });
    res.json({ success: true });
  });

  // Comments API
  app.post("/api/comments", (req, res) => {
    const { task_id, user_id, comment } = req.body;
    db.prepare("INSERT INTO comments (task_id, user_id, comment) VALUES (?, ?, ?)").run(task_id, user_id, comment);
    io.emit("comment:added", { task_id, user_id, comment });
    res.json({ success: true });
  });

  app.get("/api/comments/:taskId", (req, res) => {
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE task_id = ?
    `).all(req.params.taskId);
    res.json(comments);
  });

  // Documents
  app.get('/api/documents', (req, res) => {
    const documents = db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all();
    res.json(documents);
  });

  app.post('/api/documents', (req, res) => {
    const { title, type, location, file_url } = req.body;
    const stmt = db.prepare('INSERT INTO documents (title, type, location, file_url) VALUES (?, ?, ?, ?)');
    const info = stmt.run(title, type, location, file_url);
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(info.lastInsertRowid);
    io.emit('document:created', doc);
    res.json(doc);
  });

  app.put('/api/documents/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const stmt = db.prepare('UPDATE documents SET status = ? WHERE id = ?');
    stmt.run(status, id);
    io.emit('document:updated', { id, status });
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  io.on("connection", (socket) => {
    console.log("A user connected");
  });
}

startServer();
