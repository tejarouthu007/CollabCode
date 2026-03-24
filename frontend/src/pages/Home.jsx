import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const Home = ({ roomId, setRoomId, username, setUsername }) => {
  const navigate = useNavigate();
  const { connectSocket, isConnected } = useSocket();

  const [joining, setJoining] = useState(false);

  const joinRoom = (e) => {
    e.preventDefault();

    if (username.trim() && roomId.trim()) {
      setJoining(true);
      connectSocket({ roomId, username });
    }
  };

  // Navigate after successful connection
  useEffect(() => {
    if (joining && isConnected) {
      navigate("/editor");
    }
  }, [joining, isConnected, navigate]);

  const generateRoomId = () => {
    const newRoomId = crypto.randomUUID();
    setRoomId(newRoomId);
    localStorage.setItem("roomId", newRoomId);
  };

  useEffect(() => {
    const hasCleared = localStorage.getItem("localStorageCleared");
    if (!hasCleared) {
      localStorage.removeItem("roomId");
      localStorage.removeItem("username");
      localStorage.setItem("localStorageCleared", true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-blue-800 via-blue-600 to-blue-400 rounded-full flex items-center justify-center text-2xl font-bold">
            CC
          </div>
        </div>
        <h1 className="text-4xl font-extrabold mb-2 tracking-tight">
          CollabCode Editor
        </h1>
        {/* <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Collaborate in real-time with powerful language support, chat, themes, and instant execution.
        </p> */}
      </div>

      {/* Join Room Form */}
      <form
        onSubmit={joinRoom}
        className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-4"
      >
        <h2 className="text-2xl font-semibold text-center">Join a Room</h2>

        <input
          type="text"
          placeholder="User Name"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            localStorage.setItem("username", e.target.value);
          }}
          required
          className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              localStorage.setItem("roomId", e.target.value);
            }}
            required
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={generateRoomId}
            className="px-4 py-2 bg-gradient-to-tr from-green-600 via-green-500 to-green-400 hover:to-green-500 hover:from-green-500 rounded-md font-semibold transition duration-300"
          >
            Generate
          </button>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-md font-semibold transition duration-300 flex items-center justify-center gap-2 bg-gradient-to-tr from-blue-800 via-blue-600 to-blue-400 hover:to-blue-600 hover:from-blue-600"
        >
          {joining && !isConnected ? (
            <span className="animate-pulse">Connecting...</span>
          ) : (
            "Join Room"
          )}
        </button>
      </form>
    </div>
  );
};

export default Home;
