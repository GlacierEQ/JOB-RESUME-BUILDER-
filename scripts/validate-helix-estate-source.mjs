import fs from "node:fs";

const path = new URL("../helix-estate-source.json", import.meta.url);
const config = JSON.parse(fs.readFileSync(path, "utf8"));

const required = [
  ["authority.repository", config.authority?.repository],
  ["authority.company_mesh_index", config.authority?.company_mesh_index],
  ["authority.estate_compiler", config.authority?.estate_compiler],
  ["compilation.source_fact_ledger_required", config.compilation?.source_fact_ledger_required],
];

for (const [name, value] of required) {
  if (!value) throw new Error(`missing required estate source field: ${name}`);
}

for (const key of ["fixed_repo_cap", "fixed_company_cap", "fixed_relation_cap"]) {
  if (config.compilation?.[key] !== null) {
    throw new Error(`${key} must remain null; ranking cannot define estate membership`);
  }
}

if (config.compilation?.preserve_full_source_membership !== true) {
  throw new Error("resume compiler must preserve full source membership");
}
if (config.compilation?.forbid_affiliation_inference !== true) {
  throw new Error("company relevance must not imply affiliation");
}

console.log("helix estate source: valid");
