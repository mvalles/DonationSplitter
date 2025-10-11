import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DonationSplitterModule", (m) => {
  // Beneficiarios de ejemplo: dos cuentas hardhat
  const alice = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const bob = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const beneficiaries = [
    { account: alice, bps: 6000 },
    { account: bob, bps: 4000 },
  ];

  const donationSplitter = m.contract("DonationSplitter", [beneficiaries]);

  return { donationSplitter };
});
