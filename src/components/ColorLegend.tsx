function ColorLegend() {
  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body py-2 px-3">
        <div className="d-flex flex-wrap align-items-center gap-3 small">
          <span className="fw-semibold text-secondary">Legend:</span>
          <span className="d-flex align-items-center gap-2">
            <span className="legend-swatch legend-reject" />
            Does not meet criteria (REJECT / failed stage)
          </span>
          <span className="d-flex align-items-center gap-2">
            <span className="legend-swatch legend-hiring" />
            Hiring stage (after casual interview)
          </span>
          <span className="d-flex align-items-center gap-2">
            <span className="legend-swatch legend-default" />
            Early stage / in progress
          </span>
        </div>
      </div>
    </div>
  );
}

export default ColorLegend;
