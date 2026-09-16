import { readFile, writeFile } from "node:fs/promises";

const configPath = new URL(
  "../dist/server/wrangler.json",
  import.meta.url,
);

const config = JSON.parse(
  await readFile(configPath, "utf8"),
);

config.keep_vars = true;

await writeFile(
  configPath,
  `${JSON.stringify(config)}\n`,
  "utf8",
);

console.log(
  "Wrangler configurado para preservar as variáveis de runtime.",
);