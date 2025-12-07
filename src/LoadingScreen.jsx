// src/LoadingScreen.jsx
import React from "react";
import loadingBg from "./assets/arc-farmia-loading-bg.png"; // Import da arte

function LoadingScreen({ onConnect }) {
  return (
    <div className="loading-screen">
      {/* Background com a arte pixelizada */}
      <div
        className="loading-bg"
        style={{ backgroundImage: `url(${loadingBg})` }}
      />
      <div className="loading-overlay" />

      <div className="loading-content">
        <div className="loading-logo">
          <span className="loading-logo-arc">ARC</span>
          <span className="loading-logo-farmia">FARMIA</span>
        </div>

        <div className="loading-subtitle">
          Grow · Harvest · interact on Arc
        </div>

        <div className="loading-progress">
          <div className="loading-progress-inner" />
        </div>

        <button className="btn-connect-wallet" onClick={onConnect}>
          <span className="btn-connect-glow" />
          <span className="btn-connect-icon">🪙</span>
          <span>Connect wallet</span>
        </button>

        <div className="loading-tip">
          Connect your wallet to enter the farm 🌾
        </div>

        {/* Fireflies / partículas */}
        <span className="loading-firefly f1" />
        <span className="loading-firefly f2" />
        <span className="loading-firefly f3" />
      </div>
    </div>
  );
}

export default LoadingScreen;
