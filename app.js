const folders = { character: "characters", object: "objects", system: "systems" };

// The index rows and key/value maps are the active CSV-backed world.
// Values remain strings, including the prompt and JSON schema stored in CSV.
let activeWorld;

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (character === "," || character === "\n" || character === "\r")) {
      row.push(field);
      field = "";
      if (character !== ",") {
        rows.push(row);
        row = [];
        if (character === "\r" && text[i + 1] === "\n") i++;
      }
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("Unclosed quoted CSV field.");
  if (row.length || field.length) rows.push([...row, field]);
  return rows;
}

async function readCSV(path, header) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const [columns, ...rows] = parseCSV(await response.text());
  if (columns?.join(",") !== header || rows.some(row => row.length !== 2)) {
    throw new Error(`${path}: expected ${header} CSV.`);
  }
  return rows;
}

async function loadWorld() {
  const index = await readCSV("world/world.csv", "type,name");
  const records = await Promise.all(index.map(async ([type, name]) => {
    const folder = folders[type];
    if (!folder) throw new Error(`Unknown indexed type: ${type}`);
    const path = `world/${folder}/${encodeURIComponent(name)}.csv`;
    return [`${type}/${name}`, new Map(await readCSV(path, "key,value"))];
  }));
  return { index, records: new Map(records) };
}

function render(world) {
  document.querySelector("#description").textContent = world.records.get("system/world").get("description");
  const characters = document.querySelector("#characters");
  characters.replaceChildren();

  for (const [type, name] of world.index) {
    if (type !== "character") continue;
    const facts = world.records.get(`${type}/${name}`);
    const character = document.createElement("article");
    const heading = document.createElement("h2");
    heading.textContent = name;
    character.append(heading);

    for (const [label, key] of [["Control", "control"], ["Location", "location"]]) {
      const line = document.createElement("p");
      line.textContent = `${label}: ${facts.get(key)}`;
      character.append(line);
    }

    // Possession is a fresh projection of object holder references on each render.
    const holdings = document.createElement("p");
    holdings.append("Holds: ");
    let heldCount = 0;
    for (const [objectType, objectName] of world.index) {
      if (objectType !== "object") continue;
      const object = world.records.get(`${objectType}/${objectName}`);
      if (object.get("holder_type") === type && object.get("holder_name") === name) {
        holdings.append(`${heldCount ? ", " : ""}${objectName}`);
        heldCount++;
      }
    }
    if (!heldCount) holdings.append("nothing");
    character.append(holdings);
    characters.append(character);
  }
}

const status = document.querySelector("#status");
try {
  activeWorld = await loadWorld();
  render(activeWorld);
  document.querySelector("#world").hidden = false;
  status.hidden = true;
} catch (error) {
  status.setAttribute("role", "alert");
  status.textContent = `Could not load world: ${error.message}`;
}
