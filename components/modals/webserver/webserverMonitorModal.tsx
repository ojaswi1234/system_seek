import React, { useEffect } from "react";
import "./webserver.css";

interface WebserverMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WebserverMonitorModal = ({
  isOpen,
  onClose,
}: WebserverMonitorModalProps) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sendData = async (userData: { url: string; name: string }) => {
    try {
      const res = await fetch("/api/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const rawBody = await res.text();
      const contentType = res.headers.get("content-type") || "";

      const data =
        rawBody && contentType.includes("application/json")
          ? JSON.parse(rawBody)
          : rawBody || null;

      if (!res.ok) {
        throw new Error(
          `Request failed (${res.status} ${res.statusText})${data ? `: ${typeof data === "string" ? data : JSON.stringify(data)}` : ""}`,
        );
      }

      console.log("Response from server:", data);
    } catch (err) {
      console.error("Error sending data:", err);
    }
  };

  return (
    <div className="modal backdrop-blur-md">
      <div className="modal-content">
        <span className="close" onClick={onClose}>
          ×
        </span>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Add New Monitor</h2>
          <p className="text-gray-600 mb-4">
            Enter the details of the website you want to track.
          </p>

          <input
            type="text"
            placeholder="Google"
            className="w-full p-2 border border-gray-300 rounded mb-4 text-black outline-none focus:border-black"
            id="nameData"
          />

          <input
            type="text"
            placeholder="https://example.com"
            className="w-full p-2 border border-gray-300 rounded mb-4 text-black outline-none focus:border-black"
            id="urlData"
          />

          <button
            className="w-full bg-black text-white py-2 rounded uppercase tracking-widest text-sm hover:bg-zinc-800 transition-colors"
            onClick={() => {
              const nameElement = document.getElementById(
                "nameData",
              ) as HTMLInputElement;
              const urlElement = document.getElementById(
                "urlData",
              ) as HTMLInputElement;

              const nameData = nameElement.value;
              const urlData = urlElement.value;

              if (nameData && urlData) {
                sendData({ name: nameData, url: urlData });
              } else {
                alert("Please fill in both fields");
              }
            }}
          >
            Save Monitor
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebserverMonitorModal;
