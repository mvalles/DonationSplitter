import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

// Tests for DonationSplitter using viem and node:test

describe("DonationSplitter", async function () {
  const { viem } = await network.connect();
  const [owner, alice, bob] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  async function deploySplitter(beneficiaries = [
    { account: alice.account.address, bps: 6000 },
    { account: bob.account.address, bps: 4000 },
  ]) {
    return await viem.deployContract("DonationSplitter", [beneficiaries]);
  }

  it("Should split donations and allow withdrawals", async function () {
    const splitter = await deploySplitter();
    await splitter.write.donateETH({ value: 10n ** 18n });
    assert.equal(await splitter.read.pendingEth([alice.account.address]), 600000000000000000n);
    assert.equal(await splitter.read.pendingEth([bob.account.address]), 400000000000000000n);

    // Alice withdraws
    const aliceBalanceBefore = await publicClient.getBalance({ address: alice.account.address });
    await splitter.write.withdrawETH({ account: alice.account });
    const aliceBalanceAfter = await publicClient.getBalance({ address: alice.account.address });
    assert(aliceBalanceAfter - aliceBalanceBefore >= 590000000000000000n, "Alice should receive ~0.6 ETH");
    assert.equal(await splitter.read.pendingEth([alice.account.address]), 0n);

    // Bob withdraws
    const bobBalanceBefore = await publicClient.getBalance({ address: bob.account.address });
    await splitter.write.withdrawETH({ account: bob.account });
    const bobBalanceAfter = await publicClient.getBalance({ address: bob.account.address });
    assert(bobBalanceAfter - bobBalanceBefore >= 390000000000000000n, "Bob should receive ~0.4 ETH");
    assert.equal(await splitter.read.pendingEth([bob.account.address]), 0n);
  });

  it("Should only allow owner to set beneficiaries", async function () {
    const splitter = await deploySplitter();
    const newBens = [{ account: alice.account.address, bps: 10000 }];
    let failed = false;
    try {
      await splitter.write.setBeneficiaries([newBens], { account: alice.account });
    } catch (e) {
      failed = true;
    }
    assert(failed, "Non-owner should not be able to set beneficiaries");
    await splitter.write.setBeneficiaries([newBens], { account: owner.account });
    const [accounts, bps] = await splitter.read.beneficiariesList();
    assert.deepEqual(accounts.map(a => a.toLowerCase()), [alice.account.address.toLowerCase()]);
    assert.deepEqual(bps, [10000]);
  });

  it("Should revert withdraw if nothing to withdraw", async function () {
    const splitter = await deploySplitter();
    let failed = false;
    try {
      await splitter.write.withdrawETH({ account: alice.account });
    } catch (e) {
      failed = true;
    }
    assert(failed, "Should revert if nothing to withdraw");
  });

  it("Should accept ETH via receive and split", async function () {
    const splitter = await deploySplitter();
    await owner.sendTransaction({ to: splitter.address, value: 2n * 10n ** 18n });
    assert.equal(await splitter.read.pendingEth([alice.account.address]), 1200000000000000000n);
    assert.equal(await splitter.read.pendingEth([bob.account.address]), 800000000000000000n);
  });
});
