import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

// Tests para DonationSplitter usando viem y node:test

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
  await splitter.write.donateETH(["test://uri1"], { value: 10n ** 18n });
    assert.equal(await splitter.read.pendingEth([alice.account.address]), 600000000000000000n);
    assert.equal(await splitter.read.pendingEth([bob.account.address]), 400000000000000000n);
    // Antes de retirar withdrawnEth debe ser 0
    const beforeWithdrawnAlice = await splitter.read.withdrawnEth([alice.account.address]);
    assert.equal(beforeWithdrawnAlice, 0n);

    // Alice withdraws
    const aliceBalanceBefore = await publicClient.getBalance({ address: alice.account.address });
    await splitter.write.withdrawETH({ account: alice.account });
    const aliceBalanceAfter = await publicClient.getBalance({ address: alice.account.address });
    assert(aliceBalanceAfter - aliceBalanceBefore >= 590000000000000000n, "Alice should receive ~0.6 ETH");
    assert.equal(await splitter.read.pendingEth([alice.account.address]), 0n);
    // withdrawnEth actualizado
    const withdrawnAlice = await splitter.read.withdrawnEth([alice.account.address]);
    assert(withdrawnAlice >= 590000000000000000n);

    // Bob withdraws
    const bobBalanceBefore = await publicClient.getBalance({ address: bob.account.address });
    await splitter.write.withdrawETH({ account: bob.account });
    const bobBalanceAfter = await publicClient.getBalance({ address: bob.account.address });
    assert(bobBalanceAfter - bobBalanceBefore >= 390000000000000000n, "Bob should receive ~0.4 ETH");
    assert.equal(await splitter.read.pendingEth([bob.account.address]), 0n);
    const withdrawnBob = await splitter.read.withdrawnEth([bob.account.address]);
    assert(withdrawnBob >= 390000000000000000n);
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



  it("Should accumulate withdrawnEth after multiple donations + withdrawals", async function () {
    const splitter = await deploySplitter();
    // Primera donación
  await splitter.write.donateETH(["test://uri2"], { value: 1n * 10n ** 18n });
    // Segunda donación
  await splitter.write.donateETH(["test://uri3"], { value: 2n * 10n ** 18n });
    // Pendiente Alice: 0.6 + 1.2 = 1.8 ETH
    assert.equal(await splitter.read.pendingEth([alice.account.address]), 1800000000000000000n);
    // Alice retira parcial: simulamos retirando todo (no hay parcial en el contrato)
    await splitter.write.withdrawETH({ account: alice.account });
    const withdrawnA1 = await splitter.read.withdrawnEth([alice.account.address]);
    assert(withdrawnA1 >= 1790000000000000000n);
    // Nueva donación
  await splitter.write.donateETH(["test://uri4"], { value: 1n * 10n ** 18n });
    // Pendiente Alice ahora 0.6 ETH otra vez
    assert.equal(await splitter.read.pendingEth([alice.account.address]), 600000000000000000n);
    await splitter.write.withdrawETH({ account: alice.account });
    const withdrawnA2 = await splitter.read.withdrawnEth([alice.account.address]);
    assert(withdrawnA2 > withdrawnA1);
  });
});
