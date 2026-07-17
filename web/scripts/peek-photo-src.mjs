import { readFileSync } from "fs";
import { renderSignatureHtml } from "../src/lib/template.ts";

const d = JSON.parse(readFileSync("data/people.json", "utf8"));
const p = d.people[0];
const h = renderSignatureHtml(p, d.settings, {
  origin: "http://localhost:3000",
  mode: "email",
});
const srcs = [...h.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
console.log(srcs.slice(0, 4));
console.log("len", h.length);
