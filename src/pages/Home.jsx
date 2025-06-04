import React from "react";
import OverviewMap from "../components/OverviewMap";

export function Home() {
  return (
    <div className="home" style={{ position: "relative", height: "100vh", width: "100%", marginTop: "-60px", zIndex: 1 }}>
      <OverviewMap />
    </div>
  );
}