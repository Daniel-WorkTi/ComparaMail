import { readFileSync } from "fs";
import { renderSignatureHtml } from "../src/lib/template.ts";

const data = JSON.parse(readFileSync("data/people.json", "utf8"));
const p =
  data.people.find((x) => x.email?.includes("daniel.maia")) || data.people[0];
const email = renderSignatureHtml(p, data.settings, {
  origin: "https://comparamailpt.vercel.app",
  mode: "email",
});
const preview = renderSignatureHtml(p, data.settings, {
  origin: "https://comparamailpt.vercel.app",
  mode: "preview",
});
console.log("email chars", email.length, "ok", email.length < 10000);
console.log("preview chars", preview.length);
let max = 0;
for (const person of data.people.slice(0, 20)) {
  const h = renderSignatureHtml(person, data.settings, {
    origin: "https://comparamailpt.vercel.app",
    mode: "email",
  });
  if (h.length > max) max = h.length;
}
console.log("max among 20", max);
