import React, { useEffect } from 'react';
import './webserver.css';

const WebserverMonitorModal = ({ isOpen, onClose }) => {
    useEffect(() => {
        const handleEscape = (event: { key: string; }) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
    <div className="modal backdrop-blur-md ">
            <div className="modal-content">
                <span className="close" onClick={onClose}>×</span>
                <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Add New Monitor</h2>
          <p className="text-gray-600 mb-4">Enter the details of the website you want to track.</p>
          
          {/* We can build the form here next */}
          <input 
            type="text" 
            placeholder="https://example.com" 
            className="w-full p-2 border border-gray-300 rounded mb-4 text-black outline-none focus:border-black"
          />
          <button className="w-full bg-black text-white py-2 rounded uppercase tracking-widest text-sm hover:bg-zinc-800 transition-colors">
            Save Monitor
          </button>
        </div>
            </div>
        </div>
    );
}

export default WebserverMonitorModal;