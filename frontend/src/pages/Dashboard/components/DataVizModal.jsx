import React, { useMemo } from "react";
import { Button, Form as BForm, Modal } from "@themesberg/react-bootstrap";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      mode: "index",
      intersect: false,
    },
  },
  interaction: { mode: "index", intersect: false },
  scales: {
    x: {
      ticks: { color: "rgba(234,250,245,0.85)" },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      ticks: { color: "rgba(234,250,245,0.85)" },
      grid: { color: "rgba(255,255,255,0.06)" },
      border: { display: false },
    },
  },
};

export default function DataVizModal({
  show,
  onClose,
  title,
  metricOptions,
  selectedMetricId,
  onChangeMetricId,
  labels,
  values,
  isLoading,
}) {
  const chartData = useMemo(() => {
    const safeValues = Array.isArray(values) ? values : [];
    return {
      labels,
      datasets: [
        {
          // Bars (like the white bars in the reference)
          type: "bar",
          label: `${title} (bars)`,
          data: safeValues,
          backgroundColor: "rgba(234,250,245,0.82)",
          borderColor: "rgba(234,250,245,0.92)",
          borderWidth: 0,
          borderRadius: 10,
          maxBarThickness: 26,
          categoryPercentage: 0.55,
          barPercentage: 0.7,
        },
        {
          // Smooth line overlay (like the dark line in the reference)
          type: "line",
          label: `${title} (line)`,
          data: safeValues,
          borderColor: "rgba(255,255,255,0.22)",
          backgroundColor: "rgba(255,255,255,0.00)",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          tension: 0.45,
        },
      ],
    };
  }, [labels, title, values]);

  return (
    <Modal show={show} onHide={onClose} centered className="dashboard-viz-modal">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="dashboard-viz-modal__controls">
          <BForm.Group className="mb-3">
            <BForm.Label>Select metric</BForm.Label>
            <BForm.Select
              value={selectedMetricId}
              onChange={(e) => onChangeMetricId(e.target.value)}
              disabled={isLoading || !metricOptions?.length}
            >
              {metricOptions?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </BForm.Select>
          </BForm.Group>
        </div>

        <div className="dashboard-viz-modal__chart">
          <Chart type="bar" data={chartData} options={defaultOptions} />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}


