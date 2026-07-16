const fs = require("fs");
const html = fs.readFileSync(
  "c:/Users/DEV01/Documents/Assinaturas Eletronica comparaja/drive_folder.html",
  "utf8",
);

// Pattern: "ID"],null,null,null,"MIME"...[["NAME"
const re =
  /"([a-zA-Z0-9_-]{20,})"],null,null,null,"(application\/vnd\.google-apps\.[a-z]+|image\/[^"]+)"[\s\S]{0,800}?\[\[\["([^"]+)"/g;

const entries = [];
let m;
while ((m = re.exec(html))) {
  entries.push({ id: m[1], mime: m[2], name: m[3] });
}
console.log("entries", entries.length);
for (const e of entries) console.log(`${e.id} | ${e.name} | ${e.mime}`);

// Also try looser pattern for images
const reImg =
  /"([a-zA-Z0-9_-]{25,})"],null,null,null,"(image\/[^"]+)"[\s\S]{0,800}?\[\[\["([^"]+)"/g;
const imgs = [];
while ((m = reImg.exec(html))) imgs.push({ id: m[1], mime: m[2], name: m[3] });
console.log("\nimages only", imgs.length);
for (const e of imgs) console.log(`${e.id} | ${e.name} | ${e.mime}`);
