export function formatSectionLabel(section, index) {
  const name = String((section && section.name) || "");
  return name ? `${index + 1}. ${name}` : `${index + 1}.`;
}

export function formatSpeedLabel(speed) {
  return `${Number(speed).toFixed(3).replace(/\.?0+$/, "")}×`;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

