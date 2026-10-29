"""Summarize local samples without equating working sets with exclusive RAM.

Separate uninterrupted observations by file, PID, or gaps over three seconds.
No input logs or private paths are uploaded. Output contains process metrics only.
"""
import argparse
from datetime import datetime
import json
from pathlib import Path
import statistics

def timestamp(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))

def percentile(values, q):
    data = sorted(values)
    position = (len(data) - 1) * q
    lower = int(position)
    return round(data[lower] + (data[min(lower + 1, len(data) - 1)] - data[lower]) * (position - lower), 3)

def metrics(rows):
    result = {"samples": len(rows)}
    for source, label in [("cpuTotalMachinePercent", "cpuMachinePercent"),
                          ("workingSetMiB", "aggregateWorkingSetMiB"),
                          ("privateMiB", "privateCommitMiB")]:
        values = [row["native"][source] for row in rows]
        result[label] = {"median": round(statistics.median(values), 3),
                         "p95": percentile(values, .95), "min": min(values), "max": max(values)}
    result["processCountRange"] = [min(r["native"]["count"] for r in rows), max(r["native"]["count"] for r in rows)]
    result["observedOldProcessCountMax"] = max(r.get("previousNativeProcessesStillAlive", 0) for r in rows)
    return result

def summarize(paths):
    groups, valid, errors, nonlive, malformed = [], [], 0, 0, 0
    for path in paths:
        current, previous = [], None
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            try:
                row = json.loads(line)
                if row.get("sampleError"):
                    errors += 1
                    previous = None
                    continue
                if not row.get("nativePid") or row["native"]["count"] == 0:
                    nonlive += 1
                    previous = None
                    continue
                now = timestamp(row["time"])
                if previous is None or row["nativePid"] != previous["nativePid"] or not 0 < (now - timestamp(previous["time"])).total_seconds() <= 3:
                    current = []
                    groups.append(current)
                current.append(row)
                valid.append(row)
                previous = row
            except (ValueError, TypeError, KeyError):
                malformed += 1
                previous = None
    result = {"schemaVersion": 1, "sampleErrors": errors, "nonliveSamplesExcluded": nonlive,
              "malformedLines": malformed,
              "definitions": {"aggregateWorkingSetMiB": "Sum of resident working sets; shared pages may be counted repeatedly, NOT exclusive RAM.",
                              "privateCommitMiB": "Private committed virtual memory, NOT private resident memory.",
                              "cpuMachinePercent": "Process CPU deltas divided by logical processor count.",
                              "continuity": "Observation continuity only; every input-file boundary, PID change, error or >3 second gap splits it. Not a 24-hour qualification."}}
    if not valid:
        return result
    result["firstUTC"], result["lastUTC"] = valid[0]["time"], valid[-1]["time"]
    result["allLiveObservations"] = metrics(valid)
    result["segments"] = []
    for group in groups:
        start, end = timestamp(group[0]["time"]), timestamp(group[-1]["time"])
        first_window = [r for r in group if (timestamp(r["time"]) - start).total_seconds() < 60]
        last_window = [r for r in group if (end - timestamp(r["time"])).total_seconds() < 60]
        result["segments"].append({"startUTC": group[0]["time"], "endUTC": group[-1]["time"],
            "durationSeconds": round((end - start).total_seconds(), 3), "nativePid": group[0]["nativePid"],
            **metrics(group), "privateCommitFirst60sMedianMiB": round(statistics.median(r["native"]["privateMiB"] for r in first_window), 3),
            "privateCommitLast60sMedianMiB": round(statistics.median(r["native"]["privateMiB"] for r in last_window), 3)})
    result["longestContinuousObservationSeconds"] = max(s["durationSeconds"] for s in result["segments"])
    result["sumSegmentDurationsSeconds"] = round(sum(s["durationSeconds"] for s in result["segments"]), 3)
    result["states"] = {f"{state};visible={visible}": metrics([r for r in valid if r["state"] == state and r["visible"] == visible])
                         for state, visible in sorted({(r["state"], r["visible"]) for r in valid})}
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    args.output.write_text(json.dumps(summarize(args.inputs), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {args.output.name}; working sets are not exclusive memory.")
