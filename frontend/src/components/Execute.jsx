import React, { useState } from "react";

const languages = [
  "javascript",
  "python",
  "java",
  "cpp",
  "go",
  "rust",
  "ruby",
  "php"
];

const VITE_SANDBOX_URL = import.meta.env.VITE_SANDBOX_URL;

const Execute = ({ files, activeFile }) => {
  const [output, setOutput] = useState("Run to view output");
  const [language, setLanguage] = useState("python");

  const runCommand = async () => {
    setOutput("Running...\n");

    const mergedFiles = files.map(file => ({
      name: `${file.name}.${file.extension}`,
      content: file.content
    }));
    const main = `${activeFile.name}.${activeFile.extension}`;

    try {
      const res = await fetch(`${VITE_SANDBOX_URL}/run/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: mergedFiles,
          language,
          main
        })
      });

      const data = await res.json();

      console.log(data);
      setOutput(
        ("> " + data.command + "\n\n") +
        (data.output || "") +
        (data.error ? "\n" + data.error : "")
      );
    } catch (err) {
      setOutput("Error: " + err.message);
    }
  };

  return (
    <div>
      {/* Top Bar */}
      <div style={{ display: "flex", padding: "10px", borderBottom: "1px solid #ccc", gap: "10px" }}>
        
        {/* Language */}
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          {languages.map((lang) => (
            <option key={lang} value={lang} className="bg-gray-800 text-white">{lang}</option>
          ))}
        </select>

        {/* Run */}
        <button
          onClick={runCommand}
          className="bg-blue-700 text-white px-5 py-2 rounded-md hover:bg-blue-600"
        >
          Run
        </button>
      </div>

      {/* Output */}
      <pre
        style={{
          height: "90vh",
          background: "#000",
          color: "#0f0",
          margin: 0,
          padding: "10px",
          overflow: "auto"
        }}
      >
        {output}
      </pre>
    </div>
  );
};

export default Execute;