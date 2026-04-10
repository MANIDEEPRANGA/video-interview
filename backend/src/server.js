import express from "express";
import path from "path";
import cors from "cors";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";
import { exec } from "child_process";   // ✅ added
import fs from "fs";                    // ✅ added

import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { inngest, functions } from "./lib/inngest.js";

import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoute.js";

const app = express();

const __dirname = path.resolve();

// middleware
app.use(express.json());
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
app.use(clerkMiddleware());

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);

// ✅ HEALTH CHECK
app.get("/health", (req, res) => {
  res.status(200).json({ msg: "api is up and running" });
});

// 🔥 NEW: CODE EXECUTION ROUTE
app.post("/run", (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: "No code provided",
    });
  }

  try {
    // Save code to temp file
    fs.writeFileSync("temp.js", code);

    // Execute code using Node.js
    exec("node temp.js", (error, stdout, stderr) => {
      if (error) {
        return res.json({
          success: false,
          error: stderr || error.message,
        });
      }

      res.json({
        success: true,
        output: stdout || "No output",
      });
    });
  } catch (err) {
    res.json({
      success: false,
      error: err.message,
    });
  }
});

// make app ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(
      path.join(__dirname, "../frontend", "dist", "index.html")
    );
  });
}

// START SERVER
const startServer = async () => {
  try {
    await connectDB();
    app.listen(ENV.PORT, () =>
      console.log("Server is running on port:", ENV.PORT)
    );
  } catch (error) {
    console.error("💥 Error starting the server", error);
  }
};

startServer();