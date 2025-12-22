import React, { forwardRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";

// Register once (module init). This is intentionally in a separate lazy-loaded chunk
// so the heavy Chart.js code doesn't block initial dashboard render.
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

const DashboardChartCanvas = forwardRef(function DashboardChartCanvas(
  { type, data, options, plugins },
  ref
) {
  return <Chart ref={ref} type={type} data={data} options={options} plugins={plugins} />;
});

export default DashboardChartCanvas;


