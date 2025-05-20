import React from "react";
import ReportMap from "../components/ReportMap";

export function Report() {
  return (
    <div
      className="report"
      style={{
        height: '100vh',
        width: '100vw', // full width
        margin: 0,
        padding: 0,
        overflow: 'hidden', // prevents scrollbars from phantom margins
      }}
    >
      <ReportMap />
    </div>
  );
}