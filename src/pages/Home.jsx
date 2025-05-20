import React from "react";
import MapComponent from "../components/MapComponent";

export function Home() {
  return (
    <div className="home" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: "50vh", width: "100%" }}>
        <MapComponent />
      </div>
      <div style={{ padding: "1rem", maxWidth: "800px", margin: "0 auto" }}>
        <h1>Checkpoint Overview</h1>
        <p>
          This map shows current legal checkpoints and community-submitted reports.
          Scroll and zoom to explore various locations. You can click on a map marker
          to read more details or submit a new report by clicking on the map.
        </p>
        <p>
          Below you'll find detailed statistics and stories from people who have encountered
          checkpoints. We encourage users to contribute their own reports to help keep this tool accurate and updated.
        </p>
      </div>
    </div>
  );
}