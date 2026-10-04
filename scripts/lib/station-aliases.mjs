export function retainSlugAliases(current, published, previousAliases = {}) {
  const aliases = { ...previousAliases };
  const byId = new Map(published.map((station) => [station.id, station]));
  for (const station of current) {
    const replacement = byId.get(station.id);
    if (replacement && station.slug !== replacement.slug) aliases[station.slug] = station.id;
  }
  return aliases;
}

export function stationRedirects(stations, aliases) {
  const byId = new Map(stations.map((station) => [station.id, station]));
  const activeSlugs = new Set(stations.map(({ slug }) => slug));
  const redirects = Object.entries(aliases).flatMap(([slug, id]) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid historical station slug: ${slug}`);
    const station = byId.get(id);
    if (!station || activeSlugs.has(slug)) return [];
    return [`/istasyon/${slug}/ /istasyon/${station.slug}/ 301`, `/istasyon/${slug} /istasyon/${station.slug}/ 301`];
  }).sort();
  if (redirects.length > 2000) throw new Error('Station aliases exceed Cloudflare’s 2,000 static redirect limit');
  return redirects;
}
