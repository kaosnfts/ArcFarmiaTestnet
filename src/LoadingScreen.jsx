// src/LoadingScreen.jsx
import React, { useState } from "react";
import loadingBg from "./assets/arc-farmia-loading-bg.png";

import claireImg from "./assets/claire.png";
import caitlinImg from "./assets/caitlin.png";
import gnosoullaImg from "./assets/gnosoulla.png";
import samImg from "./assets/sam.png";
import timImg from "./assets/tim.png";
import simonImg from "./assets/simon.png";

const CHARACTERS = [
  {
    id: "claire",
    name: "Claire Corbett",
    role: "Group Chief Financial Officer",
    img: claireImg,
  },
  {
    id: "caitlin",
    name: "Caitlin Read",
    role: "Chief Commercial Officer",
    img: caitlinImg,
  },
  {
    id: "gnosoulla",
    name: "Gnosoulla",
    role: "Chief People & Culture Officer",
    img: gnosoullaImg,
  },
  {
    id: "sam",
    name: "Sam",
    role: "Director of Community and Ecosystem at Circle",
    img: samImg,
  },
  {
    id: "tim",
    name: "Tim",
    role: "President, Americas",
    img: timImg,
  },
  {
    id: "simon",
    name: "Simon Foster",
    role: "Group Chief Executive Officer",
    img: simonImg,
  },
];

function LoadingScreen({ onConnect }) {
  const [activeId, setActiveId] = useState(CHARACTERS[0].id);
  const activeChar = CHARACTERS.find((c) => c.id === activeId);

  return (
    <div className="loading-screen">
      {/* Fundo pixel art */}
      <div
        className="loading-bg"
        style={{ backgroundImage: `url(${loadingBg})` }}
      />
      <div className="loading-overlay" />

      {/* Card central: logo + connect wallet */}
      <div className="loading-content">
        <div className="loading-logo">
          <span className="loading-logo-arc">ARC</span>
          <span className="loading-logo-farmia">FARMIA</span>
        </div>

        <div className="loading-subtitle">
          GROW · HARVEST · INTERACT ON ARC
        </div>

        <div className="loading-progress">
          <div className="loading-progress-inner" />
        </div>

        <button className="btn-connect-wallet" onClick={onConnect}>
          <span className="btn-connect-glow" />
          <span className="btn-connect-icon">🪙</span>
          <span>CONNECT WALLET</span>
        </button>

        <div className="loading-tip">
          CONNECT YOUR WALLET TO ENTER THE FARM 🌾
        </div>

        <span className="loading-firefly f1" />
        <span className="loading-firefly f2" />
        <span className="loading-firefly f3" />
      </div>

      {/* NPCs GRANDES NO FUNDO DO BACKGROUND */}
      <div className="loading-characters-bar">
        <div className="loading-characters-title">
          <span>ARC NETWORK TEAM</span>
        </div>

        <div className="loading-characters">
          {CHARACTERS.map((char) => (
            <button
              key={char.id}
              type="button"
              className={
                "loading-character loading-character-" +
                char.id +
                (char.id === activeId ? " active" : "")
              }
              onClick={() => setActiveId(char.id)}
            >
              <img
                src={char.img}
                alt={char.name}
                className="loading-character-img"
              />
            </button>
          ))}
        </div>

        {activeChar && (
          <div className="loading-character-bubble">
            <div className="loading-character-name">{activeChar.name}</div>
            <div className="loading-character-role">
              {activeChar.role}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadingScreen;
