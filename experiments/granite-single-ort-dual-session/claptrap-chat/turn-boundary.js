// Helpers for this experiment only. No conversation or model state lives here.
export const CSV_HEADER = "turn,timestamp,speaker,backend,response";

export function csvLine(row) {
  return [row.turn, row.timestamp, row.speaker, row.backend, row.response]
    .map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",") + "\r\n";
}

export function readCsv(text) {
  if (!text) return [];
  const records = [];
  let row = [], field = "", quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === "," || char === "\n" || char === "\r") {
      row.push(field); field = ""; closed = false;
      if (char !== ",") {
        records.push(row); row = [];
        if (char === "\r" && text[i + 1] === "\n") i++;
      }
    } else if (char === '"' && !field && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new Error("Malformed conversation CSV field.");
      field += char;
    }
  }
  if (quoted) throw new Error("Unclosed quoted conversation CSV field.");
  if (row.length || field.length || closed) records.push([...row, field]);
  const [header, ...rows] = records;
  if (!header || header.join(",") !== CSV_HEADER || header.length !== 5) {
    throw new Error("Conversation CSV header does not match this experiment.");
  }
  return rows.map((cells, index) => {
    if (cells.length !== 5 || cells[0] !== String(index + 1)) {
      throw new Error(`Invalid or nonsequential conversation CSV row ${index + 1}.`);
    }
    const [turn, timestamp, speaker, backend, response] = cells;
    if (!((speaker === "cpu_claptrap" && backend === "wasm") ||
          (speaker === "gpu_claptrap" && backend === "webgpu"))) {
      throw new Error(`Invalid speaker/backend in conversation row ${turn}.`);
    }
    return { turn: Number(turn), timestamp, speaker, backend, response };
  });
}

export function searchRows(rows, name, query) {
  const words = typeof query === "string" ? query.trim().split(/\s+/).filter(Boolean) : [];
  let error = null;
  if (name !== "search_conversation") error = `Unknown tool: ${String(name)}.`;
  else if (typeof query !== "string") error = "Search query must be a string.";
  else if (words.length < 3) error = "Query requires at least three words.";
  const lowered = words.map((word) => word.toLowerCase());
  const matches = error ? [] : rows.filter((row) =>
    lowered.every((word) => row.response.toLowerCase().includes(word)));
  return { query, words, valid: !error, error, rows: matches };
}

// Granite's native tool markers are atomic tokens in the pinned tokenizer.
// A generation stops at the requested speech count OR a completed tool call.
export function inspectTokens(ids, speechLimit, openToken, closeToken) {
  const speech = [], tool = [];
  let inTool = false;
  for (let i = 0; i < ids.length; i++) {
    const token = Number(ids[i]);
    if (token === openToken) {
      if (inTool) return { speech, tool, error: "Nested native tool-call marker.", stop: true };
      inTool = true;
    } else if (token === closeToken) {
      if (!inTool || i !== ids.length - 1) {
        return { speech, tool, error: "Unexpected native tool-call boundary.", stop: true };
      }
      return { speech, tool, toolComplete: true, stop: true };
    } else if (inTool) tool.push(token);
    else speech.push(token);
    if (!inTool && speech.length >= speechLimit) {
      return { speech, tool, stop: true };
    }
  }
  return { speech, tool, inTool, stop: false };
}

export function verifyCompleted(rows, turns, firstLane, total = 100) {
  if (rows.length !== total || turns.length !== total) throw new Error("Incomplete conversation/evidence pair.");
  for (let i = 0; i < total; i++) {
    const lane = i % 2 === 0 ? firstLane : firstLane === "cpu" ? "gpu" : "cpu";
    const backend = lane === "cpu" ? "wasm" : "webgpu";
    if (rows[i].turn !== i + 1 || turns[i].turn !== i + 1 ||
        rows[i].speaker !== `${lane}_claptrap` || rows[i].backend !== backend ||
        turns[i].actor.generatedTokenCount !== 100 ||
        rows[i].response !== turns[i].actor.outputText ||
        turns[i].incomingText !== (i ? rows[i - 1].response : "Welcome to the Zoo")) {
      throw new Error(`Conversation/evidence boundary mismatch at turn ${i + 1}.`);
    }
  }
  return { turns: total, cpuTurns: total / 2, gpuTurns: total / 2, strictAlternation: true, seedCounted: false };
}
