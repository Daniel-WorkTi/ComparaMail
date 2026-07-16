const fs = require("fs");
const html = fs.readFileSync(
  "c:/Users/DEV01/Documents/Assinaturas Eletronica comparaja/drive_folder.html",
  "utf8",
);
console.log("len", html.length);
console.log("contains ENERGIA", html.includes("ENERGIA"));
console.log("AF_initDataCallback", html.includes("AF_initDataCallback"));
console.log("_DRIVE_ivd", html.includes("_DRIVE_ivd"));
console.log("folder mime", html.includes("application/vnd.google-apps.folder"));

const names = ["ENERGIA", "BUSINESS", "HEADS", "PROD&TECH", "SEGUROS", "BB"];
for (const n of names) {
  const idx = html.indexOf(`"${n}"`);
  const idx2 = html.indexOf(n);
  console.log("\n===", n, "quoted at", idx, "plain at", idx2, "===");
  const i = idx >= 0 ? idx : idx2;
  if (i < 0) continue;
  const slice = html.slice(Math.max(0, i - 250), i + 120);
  console.log(slice.replace(/\s+/g, " ").slice(0, 450));
}

// Find all 33-char drive-like ids near "folder"
const folderMimes = [...html.matchAll(/application\/vnd\.google-apps\.folder/g)];
console.log("\nfolder mime count", folderMimes.length);
if (folderMimes[0]) {
  const i = folderMimes[0].index;
  console.log(html.slice(Math.max(0, i - 400), i + 80).replace(/\s+/g, " "));
}

// Dump unique patterns of id,name
const re1 = /\["([a-zA-Z0-9_-]{28,44})"/g;
let c = 0;
const ids = new Set();
let m;
while ((m = re1.exec(html)) && c < 5) {
  ids.add(m[1]);
  console.log("id sample", m[1], "at", m.index);
  console.log(html.slice(m.index, m.index + 120));
  c++;
}
console.log("total [\"id\" matches", [...html.matchAll(/\["([a-zA-Z0-9_-]{28,44})"/g)].length);
