const fs = require("fs");
const path = require("path");

const srcDir = path.join(process.cwd(), "src");

function walk(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!file.endsWith(".jsx")) continue;

    let content = fs.readFileSync(fullPath, "utf8");

    // Kalau sudah ada import React, skip.
    if (/import\s+React\b/.test(content)) {
      console.log("SKIP:", fullPath);
      continue;
    }

    // Kalau ada import hook dari react, ubah jadi import React + hooks.
    if (/import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/.test(content)) {
      content = content.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/,
        "import React, {$1} from 'react';"
      );
    } else {
      // Kalau tidak ada import react sama sekali, tambahkan import React.
      content = `import React from 'react';\n${content}`;
    }

    fs.writeFileSync(fullPath, content, "utf8");
    console.log("FIXED:", fullPath);
  }
}

walk(srcDir);
console.log("Done fixing React imports.");