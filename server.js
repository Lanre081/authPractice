require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = {
  openapi: '3.0.0',
  info: { title: 'Auth API', version: '1.0.0' },
  paths: {
    '/auth/signup': { post: { summary: 'Sign up a new user' } },
    '/auth/login': { post: { summary: 'Login a user' } },
    '/auth/logout': { post: { summary: 'Logout a user' } },
    '/public/info': { get: { summary: 'Public info' } },
    '/protected/profile': { get: { summary: 'Protected profile' } },
    '/protected/dashboard': { get: { summary: 'Protected dashboard' } },
  }
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req, res) => {
  res.send("Hello! My server is working.");
});

app.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: "Invalid login credentials" });
  }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: data.user
  });
});

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = data.user;
  req.token = token;
  next();
};

app.post("/auth/logout", authMiddleware, async (req, res) => {
  const { error } = await supabase.auth.admin?.signOut(req.token) || await supabase.auth.signOut();
  res.status(200).json({ message: "Successfully logged out" });
});

app.get("/public/info", (req, res) => {
  res.status(200).json({ message: "Welcome stranger! This info is public." });
});

app.get("/protected/profile", authMiddleware, (req, res) => {
  res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    created_at: req.user.created_at
  });
});

app.get("/protected/dashboard", authMiddleware, (req, res) => {
  res.status(200).json({ message: "Welcome to your dashboard. This is protected data." });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Server running and connected to Supabase");
});
