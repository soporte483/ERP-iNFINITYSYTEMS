/**
 * CHECKPOINT: Infinity Systems ERP - Version 1.5 (Responsive & Task Optimization)
 */
import { pool, testConnection } from "./database";
import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import path from "path";

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('admin', 'gestion', 'soporte', 'tecnico')),
      name TEXT,
      phone TEXT,
      profile_picture TEXT
    );

    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      unique_id TEXT UNIQUE,
      name TEXT NOT NULL,
      location TEXT,
      branch TEXT,
      full_address TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id),
      problem TEXT,
      type TEXT,
      assigned_to TEXT,
      scheduled_time TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      contact_phone TEXT,
      attachment_url TEXT,
      sub_type TEXT,
      location TEXT,
      companion TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id),
      client_id INTEGER REFERENCES clients(id),
      type TEXT CHECK(type IN ('instalacion', 'mantenimiento_correctivo', 'mantenimiento_preventivo')),
      description TEXT,
      evidence_url TEXT,
      signature_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      client_name TEXT,
      client_address TEXT,
      service_date TEXT
    );

    CREATE TABLE IF NOT EXISTS report_items (
      id SERIAL PRIMARY KEY,
      report_id INTEGER REFERENCES reports(id),
      model TEXT,
      serial TEXT,
      name TEXT,
      type TEXT,
      quantity INTEGER
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      tecnico_id INTEGER REFERENCES users(id),
      client_name TEXT,
      location TEXT,
      problem TEXT,
      evidence_url TEXT,
      status TEXT DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id),
      user_id INTEGER REFERENCES users(id),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      title TEXT,
      type TEXT CHECK(type IN ('plano', 'volumetria')),
      location TEXT,
      status TEXT DEFAULT 'Pendiente',
      file_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default users
  const usersToSeed = [
    { username: "admin", password: "admin123", role: "admin", name: "Administrador Principal" },
    { username: "gestion", password: "gestion123", role: "gestion", name: "Gerente de Gestión" },
    { username: "soporte", password: "soporte123", role: "soporte", name: "Ingeniero de Soporte" },
    { username: "tecnico", password: "tecnico123", role: "tecnico", name: "Técnico de Campo" },
  ];

  for (const user of usersToSeed) {
    const existing = await pool.query("SELECT id FROM users WHERE username = $1", [user.username]);
    if (existing.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)",
        [user.username, user.password, user.role, user.name]
      );
    } else {
      await pool.query(
        "UPDATE users SET password = $1, role = $2, name = $3 WHERE username = $4",
        [user.password, user.role, user.name, user.username]
      );
    }
  }
}

async function startServer() {
  await testConnection();
  await initializeDatabase();

  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Auth API
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for user: ${username}`);
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE username = $1 AND password = $2",
        [username, password]
      );
      const user = result.rows[0];
      if (user) {
        console.log(`Login successful for user: ${username} (Role: ${user.role})`);
        res.json(user);
      } else {
        console.warn(`Login failed for user: ${username}`);
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Users API
  app.get("/api/users", async (req, res) => {
    try {
      const result = await pool.query("SELECT id, username, role, name FROM users");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    const { username, password, role, name, phone, profile_picture } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO users (username, password, role, name, phone, profile_picture) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [username, password, role, name, phone || null, profile_picture || null]
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { name, password, phone, profile_picture } = req.body;
    try {
      if (password) {
        await pool.query(
          "UPDATE users SET name = $1, password = $2, phone = $3, profile_picture = $4 WHERE id = $5",
          [name, password, phone || null, profile_picture || null, id]
        );
      } else {
        await pool.query(
          "UPDATE users SET name = $1, phone = $2, profile_picture = $3 WHERE id = $4",
          [name, phone || null, profile_picture || null, id]
        );
      }
      const updated = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
      res.json({ success: true, user: updated.rows[0] });
    } catch (err) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Reports API - All reports
  app.get("/api/reports", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT r.*,
               COALESCE(r.client_name, c.name) AS client_name,
               COALESCE(r.client_address, c.location) AS client_location,
               r.service_date,
               c.branch AS client_branch,
               c.unique_id AS client_unique_id,
               t.problem AS task_problem
        FROM reports r
        JOIN clients c ON r.client_id = c.id
        LEFT JOIN tasks t ON r.task_id = t.id
        ORDER BY r.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/:id/items", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM report_items WHERE report_id = $1",
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch report items" });
    }
  });

  app.get("/api/reports/client/:clientId", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM reports WHERE client_id = $1",
        [req.params.clientId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch client reports" });
    }
  });

  // Reports API - Create
  app.post("/api/reports", async (req, res) => {
    const { task_id, client_id, type, description, evidence_url, signature_url, items, client_name, client_address, service_date } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const reportResult = await client.query(
        `INSERT INTO reports (task_id, client_id, type, description, evidence_url, signature_url, client_name, client_address, service_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [task_id, client_id, type, description, evidence_url, signature_url, client_name || null, client_address || null, service_date || null]
      );
      const reportId = reportResult.rows[0].id;

      if (type === 'instalacion' && items) {
        for (const item of items) {
          await client.query(
            "INSERT INTO report_items (report_id, model, serial, name, type, quantity) VALUES ($1, $2, $3, $4, $5, $6)",
            [reportId, item.model, item.serial, item.name, item.type, item.quantity]
          );
        }
      }

      if (task_id) {
        await client.query("UPDATE tasks SET status = 'completed' WHERE id = $1", [task_id]);
        io.emit("task:updated", { id: task_id, status: 'completed' });
      }

      await client.query("COMMIT");
      res.json({ id: reportId });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: "Failed to create report" });
    } finally {
      client.release();
    }
  });

  // Clients API
  app.get("/api/clients", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM clients");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    const { unique_id, name, location, branch, full_address } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO clients (unique_id, name, location, branch, full_address) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [unique_id || null, name, location, branch, full_address]
      );
      const newId = result.rows[0].id;
      let uid = unique_id || `C${newId.toString().padStart(4, '0')}`;
      if (!unique_id) {
        await pool.query("UPDATE clients SET unique_id = $1 WHERE id = $2", [uid, newId]);
      }
      res.json({ id: newId, unique_id: uid });
    } catch (err) {
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  // Tasks API
  app.get("/api/tasks", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT t.*, c.name AS client_name, c.location AS client_location, c.branch AS client_branch, c.full_address AS client_address, c.unique_id AS client_unique_id
        FROM tasks t
        JOIN clients c ON t.client_id = c.id
        ORDER BY t.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    const { client_id, problem, type, assigned_to, scheduled_time, contact_phone, attachment_url, sub_type, location, companion } = req.body;
    try {
      const insertResult = await pool.query(
        `INSERT INTO tasks (client_id, problem, type, assigned_to, scheduled_time, contact_phone, attachment_url, sub_type, location, companion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [client_id, problem, type, JSON.stringify(assigned_to), scheduled_time, contact_phone || null, attachment_url || null, sub_type || null, location || null, companion || null]
      );
      const taskId = insertResult.rows[0].id;
      const taskResult = await pool.query(
        `SELECT t.*, c.name AS client_name, c.location AS client_location, c.branch AS client_branch, c.full_address AS client_address, c.unique_id AS client_unique_id
         FROM tasks t
         JOIN clients c ON t.client_id = c.id
         WHERE t.id = $1`,
        [taskId]
      );
      const task = taskResult.rows[0];
      io.emit("task:created", task);
      res.json(task);
    } catch (err) {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const { status } = req.body;
    try {
      await pool.query("UPDATE tasks SET status = $1 WHERE id = $2", [status, req.params.id]);
      io.emit("task:updated", { id: req.params.id, status });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Tickets API
  app.post("/api/tickets", async (req, res) => {
    const { tecnico_id, client_name, location, problem, evidence_url } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO tickets (tecnico_id, client_name, location, problem, evidence_url) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [tecnico_id, client_name, location, problem, evidence_url]
      );
      const newTicket = { id: result.rows[0].id, ...req.body, status: 'open' };
      io.emit("ticket:created", newTicket);
      res.json(newTicket);
    } catch (err) {
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  app.get("/api/tickets", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM tickets ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.put("/api/tickets/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await pool.query("UPDATE tickets SET status = $1 WHERE id = $2", [status, id]);
      io.emit("ticket:updated", { id, status });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  // Comments API
  app.post("/api/comments", async (req, res) => {
    const { task_id, user_id, comment } = req.body;
    try {
      await pool.query(
        "INSERT INTO comments (task_id, user_id, comment) VALUES ($1, $2, $3)",
        [task_id, user_id, comment]
      );
      io.emit("comment:added", { task_id, user_id, comment });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  app.get("/api/comments/:taskId", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT c.*, u.name AS user_name
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.task_id = $1`,
        [req.params.taskId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Documents API
  app.get('/api/documents', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post('/api/documents', async (req, res) => {
    const { title, type, location, file_url } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO documents (title, type, location, file_url) VALUES ($1, $2, $3, $4) RETURNING id',
        [title, type, location, file_url]
      );
      const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [result.rows[0].id]);
      const doc = docResult.rows[0];
      io.emit('document:created', doc);
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.put('/api/documents/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await pool.query('UPDATE documents SET status = $1 WHERE id = $2', [status, id]);
      io.emit('document:updated', { id, status });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update document" });
    }
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
