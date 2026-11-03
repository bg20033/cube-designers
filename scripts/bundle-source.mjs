// Reads the bundle list from src/data/bundles.ts without a TypeScript
// toolchain: every bundle's id, its posters and, for gallery sets, each
// poster's size. Shared by the bundle image and print file scripts, and
// checked against the real data by src/data/bundles.test.ts.
export function parseBundles(source) {
  const list = (text) => [...text.matchAll(/"([^"]+)"/g)].map((match) => match[1])
  return [
    ...source.matchAll(
      /id: "([^"]+)",[\s\S]*?includes: \[([^\]]+)\],(?:\s*sizes: \[([^\]]+)\])?/g,
    ),
  ].map(([, id, includes, sizes]) => ({
    id,
    includes: list(includes),
    ...(sizes ? { sizes: list(sizes) } : {}),
  }))
}
