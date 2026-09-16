// Diagnostic fixture probe only. world/world.csv is the current seed search list,
// and the type→folder mapping below is only the current fixture lookup shape.
// Do not generalize it into MochEpoch's final CSV topology before executable
// game assets/mechanics prove what backing structure is required.
//
// This class contains functions only. CSV text and decoded fields are local
// computation for a read; no parsed document or world survives the operation.
class CSV {
  static *rows(text) {
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
          yield row;
          row = [];
          if (character === "\r" && text[i + 1] === "\n") i++;
        }
      } else {
        field += character;
      }
    }

    if (quoted) throw new Error("Unclosed quoted CSV field.");
    if (row.length || field.length) yield [...row, field];
  }

  static async read(path, header, visit) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    let headerSeen = false;
    for (const row of CSV.rows(await response.text())) {
      if (row.length !== 2 || (!headerSeen && row.join(",") !== header)) {
        throw new Error(`${path}: expected ${header} CSV.`);
      }
      if (!headerSeen) {
        headerSeen = true;
        continue;
      }
      await visit?.(row[0], row[1]);
    }
    if (!headerSeen) throw new Error(`${path}: expected ${header} CSV.`);
  }

  static path(type, name) {
    let folder;
    switch (type) {
      case "character": folder = "characters"; break;
      case "object": folder = "objects"; break;
      case "system": folder = "systems"; break;
      default: throw new Error(`Unknown indexed type: ${type}`);
    }
    return `world/${folder}/${encodeURIComponent(name)}.csv`;
  }

  static async checkReferences() {
    await CSV.read("world/world.csv", "type,name", async (type, name) => {
      await CSV.read(CSV.path(type, name), "key,value");
    });
  }

  static async value(type, name, key) {
    let indexed = false;
    let value;
    await CSV.read("world/world.csv", "type,name", async (indexedType, indexedName) => {
      if (indexedType !== type || indexedName !== name) return;
      indexed = true;
      await CSV.read(CSV.path(type, name), "key,value", (field, cell) => {
        if (field === key) value = cell;
      });
    });
    if (!indexed) throw new Error(`Missing indexed reference: ${type}/${name}`);
    return value;
  }
}

async function render() {
  await CSV.checkReferences();
  document.querySelector("#description").textContent = await CSV.value("system", "world", "description");
  const characters = document.querySelector("#characters");
  characters.replaceChildren();

  await CSV.read("world/world.csv", "type,name", async (type, name) => {
    if (type !== "character") return;
    const character = document.createElement("article");
    const heading = document.createElement("h2");
    heading.textContent = name;
    character.append(heading);

    for (const [label, key] of [["Control", "control"], ["Location", "location"]]) {
      const line = document.createElement("p");
      line.textContent = `${label}: ${await CSV.value(type, name, key)}`;
      character.append(line);
    }

    // Holdings are emitted from CSV holder cells, never retained as inventory.
    const holdings = document.createElement("p");
    holdings.append("Holds: ");
    let heldCount = 0;
    await CSV.read("world/world.csv", "type,name", async (objectType, objectName) => {
      if (objectType !== "object") return;
      if (await CSV.value(objectType, objectName, "holder_type") === type &&
          await CSV.value(objectType, objectName, "holder_name") === name) {
        holdings.append(`${heldCount ? ", " : ""}${objectName}`);
        heldCount++;
      }
    });
    if (!heldCount) holdings.append("nothing");
    character.append(holdings);
    characters.append(character);
  });
}

const status = document.querySelector("#status");
try {
  await render();
  document.querySelector("#world").hidden = false;
  status.hidden = true;
} catch (error) {
  status.setAttribute("role", "alert");
  status.textContent = `Could not load world: ${error.message}`;
}
