import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from "url";
import path from 'path';
import { exec } from "child_process";

dotenv.config();
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_TEMP = path.join(__dirname, "runs");

// Ensure /runs exists
if (!fs.existsSync(BASE_TEMP)) {
  fs.mkdirSync(BASE_TEMP, { recursive: true });
}

router.post('', async (req, res) => {
  const { files, command } = req.body;
  
  const runId = Date.now().toString();
  const runDir = path.join(BASE_TEMP, runId);

  // Create run directory
  fs.mkdirSync(runDir, { recursive: true });

  // Write files
  for (const file of files) {
    const filePath = path.join(runDir, file.name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content);
  }

  // Windows → Docker path fix
  const runDirUnix = runDir.replace(/\\/g, "/");

  const dockerCmd = `docker run --rm -v "${runDirUnix}:/app" -w /app python:3.11-slim ${command}`;

  console.log("Running:", dockerCmd);

  exec(dockerCmd, { timeout: 5000 }, (err, stdout, stderr) => {
    fs.rmSync(runDir, { recursive: true, force: true });

    res.json({
      stdout,
      stderr,
      error: err ? err.message : null
    });
  });
});

export default router;
