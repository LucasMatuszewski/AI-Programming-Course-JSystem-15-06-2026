const fallbackPolicy =
  "Polityka reklamacji: decyzja AI jest wstępna, a dalsze czynności może prowadzić sprzedawca lub serwis.";

export async function loadClaimsPolicy() {
  const [{ readFile }, path] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
  ]);
  const candidates = [
    path.resolve(
      /*turbopackIgnore: true*/ process.cwd(),
      "..",
      "docs",
      "polityka-reklamacji.md",
    ),
    path.resolve(process.cwd(), "docs", "polityka-reklamacji.md"),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  return fallbackPolicy;
}
