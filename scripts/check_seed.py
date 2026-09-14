#!/usr/bin/env python3
"""Check the initial source fixture. This does not execute the browser game."""

import csv
import json
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
FOLDERS = {"character": "characters", "object": "objects", "system": "systems"}
EXPECTED_REFS = {
    ("system", "world"),
    ("system", "interaction"),
    ("character", "player"),
    ("character", "ada"),
    ("object", "stone"),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def rows(path, header):
    with path.open(encoding="utf-8", newline="") as source:
        parsed = list(csv.reader(source, strict=True))
    require(parsed and parsed[0] == header, f"{path}: expected header {header}")
    require(
        all(len(row) == len(header) and all(row) for row in parsed[1:]),
        f"{path}: empty value or incorrect field count",
    )
    return parsed[1:]


def unique_pairs(pairs):
    values = {}
    for key, value in pairs:
        require(key not in values, f"duplicate key: {key}")
        values[key] = value
    return values


def read_state(path):
    return unique_pairs(rows(path, ["key", "value"]))


def read_json(text):
    return json.loads(text, object_pairs_hook=unique_pairs)


def check(root=ROOT):
    world = root / "world"
    index = rows(world / "world.csv", ["type", "name"])
    refs = [tuple(row) for row in index]
    require(len(refs) == len(set(refs)), "duplicate type/name in world.csv")
    require(set(refs) == EXPECTED_REFS, "world.csv differs from the initial five entries")

    states = {}
    expected_paths = {Path("world.csv")}
    for kind, name in refs:
        require(kind in FOLDERS, f"unknown type: {kind}")
        require(re.fullmatch(r"[a-z0-9_]+", name), f"invalid identifier: {name}")
        relative = Path(FOLDERS[kind]) / f"{name}.csv"
        expected_paths.add(relative)
        states[(kind, name)] = read_state(world / relative)
    actual_paths = {path.relative_to(world) for path in world.rglob("*.csv")}
    require(actual_paths == expected_paths, "seed must contain exactly six indexed CSV files")

    player = states[("character", "player")]
    actor = states[("character", "ada")]
    stone = states[("object", "stone")]
    require(player == {"control": "player", "location": "room"}, "player fixture changed")
    require(
        actor == {"control": "model", "location": "room", "decision_system": "interaction"},
        "Ada fixture changed",
    )
    require(
        stone == {"holder_type": "character", "holder_name": "ada"},
        "initial stone must be held by Ada",
    )
    require(
        (stone["holder_type"], stone["holder_name"]) in states,
        "stone references a missing holder",
    )
    require(
        ("system", actor["decision_system"]) in states,
        "Ada references a missing decision system",
    )

    plan = (root / "docs" / "MOCK_EPOCH_IMPLEMENTATION_PLAN.md").read_text(encoding="utf-8")
    packets = re.findall(r"```json\n(.*?)\n```", plan, re.DOTALL)
    require(len(packets) == 1, "plan must contain one complete example calling packet")
    packet = read_json(packets[0])
    require(
        set(packet) == {
            "world_descriptive_summation", "system_prompt",
            "current_situational_state", "output_json_schema",
        },
        "the complete packet must contain its four specified fields",
    )
    system = states[("system", "interaction")]
    require(set(system) == {"system_prompt", "output_schema"}, "unexpected system keys")
    require(system["system_prompt"] == packet["system_prompt"], "prompt differs from plan")
    schema = read_json(system["output_schema"])
    require(schema == packet["output_json_schema"], "output schema differs from plan")
    require(
        states[("system", "world")] == {"description": packet["world_descriptive_summation"]},
        "world description differs from plan",
    )
    situation = packet["current_situational_state"]
    require(
        situation["actor"]["name"] == "ada"
        and situation["actor"]["location"] == actor["location"]
        and situation["requester"]["name"] == "player"
        and situation["requester"]["location"] == player["location"]
        and situation["object"]["name"] == "stone"
        and situation["object"]["holder_type"] == stone["holder_type"]
        and situation["object"]["holder_name"] == stone["holder_name"],
        "packet facts do not match the initial CSV state",
    )
    require(
        situation["permitted_actions"] == ["hand_over", "wait"]
        and schema == {
            "type": "object",
            "properties": {"action": {"type": "string", "enum": ["hand_over", "wait"]}},
            "required": ["action"],
            "additionalProperties": False,
        },
        "initial action contract changed",
    )
    return len(actual_paths), len(refs)


if __name__ == "__main__":
    try:
        files, references = check()
    except (OSError, UnicodeError, ValueError, csv.Error, KeyError, TypeError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)
    print(f"PASS: {files} seed CSV files, {references} indexed entries, exact prompt/schema.")
    print("Source fixture only. No model, browser, resolver, or persistence test was run.")
