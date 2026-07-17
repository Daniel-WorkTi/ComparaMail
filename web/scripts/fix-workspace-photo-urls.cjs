const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "data", "people.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
let fixed = 0;

for (const person of data.people) {
  const u = person.photoUrl || "";
  if (!u.startsWith("http")) continue;
  try {
    const parsed = new URL(u);
    if (parsed.pathname.startsWith("/workspace-photos/")) {
      person.photoUrl = decodeURIComponent(parsed.pathname);
      fixed += 1;
    }
  } catch {
    // ignore
  }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log(`Fixed ${fixed} workspace photo URLs in people.json`);
