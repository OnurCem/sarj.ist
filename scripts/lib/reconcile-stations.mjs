export function reconcileStations({ current, incoming, state = {}, confirmationRuns = 2, minCount = 1, maxDropRate = 0.15, maxInvalidRate = 0.01, importReport, now = new Date().toISOString() }) {
  const rawCount = importReport.rawCount;
  const invalidRate = rawCount === 0 ? 1 : importReport.rejected.length / rawCount;
  if (incoming.stations.length < minCount) throw new Error(`Import has ${incoming.stations.length} stations; minimum is ${minCount}`);
  if (invalidRate > maxInvalidRate) throw new Error(`Rejected-record rate ${(invalidRate * 100).toFixed(2)}% exceeds ${(maxInvalidRate * 100).toFixed(2)}%`);

  const currentStations = current?.meta?.isSample ? [] : current?.stations ?? [];
  const currentById = new Map(currentStations.map((station) => [station.id, station]));
  const incomingById = new Map(incoming.stations.map((station) => [station.id, station]));
  const rawDropRate = currentStations.length ? Math.max(0, (currentStations.length - incoming.stations.length) / currentStations.length) : 0;
  if (rawDropRate > maxDropRate) throw new Error(`Station count dropped ${(rawDropRate * 100).toFixed(2)}%; maximum is ${(maxDropRate * 100).toFixed(2)}%`);

  const previousMissing = state.missing ?? {};
  const previousSocketDecreases = state.socketDecreases ?? {};
  const missing = {};
  const socketDecreases = {};
  const retained = [];
  const removed = [];
  for (const [id, station] of currentById) {
    if (incomingById.has(id)) continue;
    const consecutive = (previousMissing[id]?.consecutive ?? 0) + 1;
    if (consecutive >= confirmationRuns) {
      removed.push(id);
    } else {
      missing[id] = { consecutive, firstSeenAt: previousMissing[id]?.firstSeenAt ?? now, lastSeenAt: now };
      retained.push(station);
    }
  }

  const retainedSocketCounts = [];
  const confirmedSocketDecreases = [];
  const reconciledIncoming = incoming.stations.map((station) => {
    const previous = currentById.get(station.id);
    if (!previous || station.sockets >= previous.sockets) return station;
    const prior = previousSocketDecreases[station.id];
    const consecutive = prior?.to === station.sockets ? prior.consecutive + 1 : 1;
    if (consecutive >= confirmationRuns) {
      confirmedSocketDecreases.push(station.id);
      return station;
    }
    socketDecreases[station.id] = { from: previous.sockets, to: station.sockets, consecutive, firstSeenAt: prior?.firstSeenAt ?? now, lastSeenAt: now };
    retainedSocketCounts.push(station.id);
    return { ...station, sockets: previous.sockets };
  });

  const added = reconciledIncoming.filter(({ id }) => !currentById.has(id)).map(({ id }) => id);
  const changed = reconciledIncoming.filter((station) => currentById.has(station.id) && JSON.stringify(currentById.get(station.id)) !== JSON.stringify(station)).map(({ id }) => id);
  const dataset = { ...incoming, stations: [...reconciledIncoming, ...retained] };
  const report = { rawCount, acceptedCount: incoming.stations.length, publishedCount: dataset.stations.length, added, changed, retainedMissing: retained.map(({ id }) => id), removed, retainedSocketCounts, confirmedSocketDecreases, rejected: importReport.rejected };
  const nextState = { schemaVersion: 1, updatedAt: now, missing, socketDecreases, lastReport: report };
  return { dataset, state: nextState, report };
}
