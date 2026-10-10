const fs = require("fs");
const path = require("path");

const OUT = "public";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);

for (const item of ["index.html", "robots.txt", "img", "politica-privacidade", "termos", "assets"]) {
  if (fs.existsSync(item)) {
    fs.cpSync(item, path.join(OUT, item), { recursive: true });
    console.log("copiado:", item);
  }
}
