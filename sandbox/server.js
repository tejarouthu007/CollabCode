import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(cors({
    origin: ["https://collab-code-prod-001.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
}));

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temp directory
const BASE_TEMP = path.join(__dirname, "runs");

// Ensure /runs exists
if (!fs.existsSync(BASE_TEMP)) {
  fs.mkdirSync(BASE_TEMP, { recursive: true });
}

// Language → Docker Image
const languageImageMap = {
  python: "python:3.11-slim",
  javascript: "node:20",
  java: "eclipse-temurin:17-jdk-jammy",
  cpp: "gcc:latest",
  go: "golang:1.22",
  rust: "rust:latest",
  ruby: "ruby:latest",
  php: "php:latest"
};

// Command builder
function getCommand(language, mainFile) {
  switch (language) {
    case "python":
      return `python ${mainFile}`;
    case "javascript":
      return `node ${mainFile}`;
    case "java":
      const className = mainFile.replace(".java", "");
      return `javac ${mainFile} && java ${className}`;
    case "cpp":
      return `g++ ${mainFile} -o out && ./out`;
    case "go":
      return `go run ${mainFile}`;
    case "rust":
      return `rustc ${mainFile} && ./main`;
    case "ruby":
      return `ruby ${mainFile}`;
    case "php":
      return `php ${mainFile}`;
    default:
      return null;
  }
}

// Health check
app.get('/', (req, res) => {
  res.send('Code Runner VM is running');
});

// Main execution endpoint
app.post('/run', (req, res) => {
  const { files, language, main } = req.body;

  // Validation
  if (!files || !language || !main) {
    return res.json({ error: "Missing required fields" });
  }

  const image = languageImageMap[language];
  if (!image) {
    return res.json({ error: "Unsupported language" });
  }

  const mainExists = files.some(f => f.name === main);
  if (!mainExists) {
    return res.json({ error: "Main file not found" });
  }

  const command = getCommand(language, main);
  if (!command) {
    return res.json({ error: "Unsupported language command" });
  }

  const runId = Date.now().toString();
  const runDir = path.join(BASE_TEMP, runId);

  fs.mkdirSync(runDir, { recursive: true });

  // Write files
  for (const file of files) {
    const filePath = path.join(runDir, file.name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content);
  }

  // Convert path for Docker
  const runDirUnix = runDir.replace(/\\/g, "/");

  const dockerCmd = `docker run --rm --memory=100m --cpus=0.5 --pids-limit=64 --network=none -v "${runDirUnix}:/app" -w /app ${image} sh -c "${command}"`;

  console.log("Running:", dockerCmd);

  exec(dockerCmd, { timeout: 5000 }, (err, stdout, stderr) => {
    // Cleanup
    fs.rmSync(runDir, { recursive: true, force: true });

    res.json({
      command: command,
      output: stdout,
      error: err ? (stderr || err.message) : null
    });
  });
});

// Start server
app.listen(PORT, '0.0.0.0',() => {
  console.log(`Server running on port ${PORT}`);
});