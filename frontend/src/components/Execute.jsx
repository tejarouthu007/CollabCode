import React, { useState } from "react";

const Execute = ({ files }) => {
  const [output, setOutput] = useState("Run to view output");
  const [command, setCommand] = useState("python main.py");

  const runCommand = async () => {
    setOutput("Running...\n");

    const mergedFiles = files.map(file => ({
        name: `${file.name}.${file.extension}`,
        content: file.content
    }));

    try {
      const res = await fetch("http://localhost:3000/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: mergedFiles,
          command
        })
      });

      const data = await res.json();

      setOutput(
        (data.stdout || "") +
        (data.stderr || "") +
        (data.error ? "\n" + data.error : "")
      );
    } catch (err) {
      setOutput("Error: " + err.message);
    }
  };

  return (
    <div>
        <div style={{ display: "flex", padding: "10px", borderBottom: "1px solid #ccc" }}>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            style={{ flex: 1, padding: "8px" }}
            placeholder="Enter command (e.g., python main.py)"
          />
          <button onClick={runCommand} 
            className={`bg-blue-700 flex items-center gap-2 text-white px-5 py-2 rounded-md 
            hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 
            transition disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            Run
          </button>
        </div>

        {/* Output Terminal */}
        <pre
          style={{
            height: "200px",
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
