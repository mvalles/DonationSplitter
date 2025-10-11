import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DonationSplitterModule", (m) => {
  // --- Previous basic example (kept for reference) ---
  // const alice = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  // const bob   = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  // const beneficiaries = [
  //   { account: alice, bps: 6000 },
  //   { account: bob,   bps: 4000 },
  // ];
  // const donationSplitter = m.contract("DonationSplitter", [beneficiaries]);

  // Humanitarian Basic model (4 beneficiaries @ 25% each = 2500 bps)
  // NOTE: placeholder addresses — replace with verified production wallets and document provenance.
  const HUMANITARIAN_BENEFICIARIES: { account: string; bps: number }[] = [
    { account: "0x1111111111111111111111111111111111111111", bps: 1000 }, // UNICEF (placeholder)
    { account: "0x2222222222222222222222222222222222222222", bps: 2000 }, // MSF / Doctors Without Borders (placeholder)
    { account: "0x3333333333333333333333333333333333333333", bps: 3000 }, // IFRC / Red Cross (placeholder)
    { account: "0x4444444444444444444444444444444444444444", bps: 4000 }, // Save the Children (placeholder)
  ];

  const totalBps = HUMANITARIAN_BENEFICIARIES.reduce((sum, b) => sum + b.bps, 0);
  if (totalBps !== 10000) {
    throw new Error(`Invalid beneficiaries configuration: totalBps=${totalBps} (expected 10000)`);
  }

  const donationSplitter = m.contract("DonationSplitter", [HUMANITARIAN_BENEFICIARIES]);

  return { donationSplitter };
});
