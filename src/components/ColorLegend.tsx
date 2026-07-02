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
          <span className="text-muted ms-md-2">
            Columns = day color; rows alternate every 30 minutes (lighter / darker band).
          </span>
          <span className="d-flex align-items-center gap-2">
            <span className="legend-swatch legend-time-band" />
            30-min time bands
          </span>
        </div>
      </div>
    </div>
  );
}

export default ColorLegend;
