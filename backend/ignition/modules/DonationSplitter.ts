import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

interface RawBeneficiaryJson { address: string; bps: number; label?: string }
// Add index signature so each object qualifies for Ignition ArgumentType (struct encoding expects {[k:string]:...})
interface Beneficiary { account: string; bps: number; [key: string]: any }

function loadBeneficiaries(): Beneficiary[] {
  const env = process.env.DS_ENV || "dev"; // dev | sepolia | mainnet
  // __dirname is not available in ESM; derive from import.meta.url
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const file = path.join(moduleDir, "../../beneficiaries", `${env}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Beneficiary config file not found for DS_ENV='${env}': ${file}`);
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as RawBeneficiaryJson[];

  if (env === "mainnet" && raw.length === 0) {
    throw new Error("mainnet.json is empty. Populate verified production beneficiaries before mainnet deploy.");
  }

  const mapped: Beneficiary[] = raw.map((r, i) => {
    if (!r.address || !/^0x[a-fA-F0-9]{40}$/.test(r.address)) {
      throw new Error(`Invalid address at index ${i} in ${file}: '${r.address}'`);
    }
    if (typeof r.bps !== "number" || r.bps <= 0) {
      throw new Error(`Invalid bps at index ${i} in ${file}: '${r.bps}'`);
    }
    return { account: r.address, bps: r.bps };
  });

  // Validation: sum 10000
  const total = mapped.reduce((s, b) => s + b.bps, 0);
  if (total !== 10000) {
    throw new Error(`Beneficiaries bps total=${total} (expected 10000)`);
  }

  // No duplicates
  const lower = mapped.map(b => b.account.toLowerCase());
  const dupes = lower.filter((a, idx) => lower.indexOf(a) !== idx);
  if (dupes.length) {
    throw new Error(`Duplicate beneficiary address(es): ${[...new Set(dupes)].join(", ")}`);
  }

  // Extra guard for mainnet: require explicit opt-in flag
  if (env === "mainnet" && process.env.MAINNET_DEPLOY !== "1") {
    throw new Error("Set MAINNET_DEPLOY=1 to allow mainnet deployment (safety guard).");
  }

  console.log(`Loaded ${mapped.length} beneficiaries from ${file} (env=${env}).`);
  return mapped;
}

export default buildModule("DonationSplitterModule", (m) => {
  const beneficiaries = loadBeneficiaries();
  // Hardhat Ignition wants constructor args as primitive/array/object encodables.
  // Our Solidity constructor is (Beneficiary[] memory) so we just pass the JS array of structs.
  const donationSplitter = m.contract("DonationSplitter", [beneficiaries as any]);
  return { donationSplitter };
});
