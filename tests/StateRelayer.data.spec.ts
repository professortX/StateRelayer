import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';

import { StateRelayer, StateRelayer__factory } from '../generated';
import { deployContract } from './utils/deployment';

describe('State relayer contract data tests', () => {
  let stateRelayerProxy: StateRelayer;
  let bot: SignerWithAddress;
  let user: SignerWithAddress;
  let admin: SignerWithAddress;

  describe('Test updating individually ', () => {
    describe('Successfully updating individually', () => {
      it('Should successfully set master node data', async () => {
        ({ stateRelayerProxy, bot } = await loadFixture(deployContract));
        const masterNodeData: MasterNode = {
          tvl: 108,
          zeroYearTVL: 101,
          fiveYearTVL: 102,
          tenYearTVL: 103,
          lastUpdated: 101010,
        };
        await expect(stateRelayerProxy.connect(bot).updateMasterNodeInformation(masterNodeData))
          .to.emit(stateRelayerProxy, 'UpdateMasterNodeInformation')
          .withArgs(Object.values(masterNodeData), (await time.latest()) + 1);
        const receivedMasterNodeData = await stateRelayerProxy.masterNodeInformation();
        expect(receivedMasterNodeData.toString()).to.equal(Object.values(masterNodeData).toString());
      });

      it('Should successfully set vault node data', async () => {
        ({ stateRelayerProxy, bot } = await loadFixture(deployContract));
        const vaultInformationData: VaultGeneralInformation = {
          noOfVaults: 2,
          totalLoanValue: 1000,
          totalCollateralValue: 23432,
          totalCollateralizationRatio: 234,
          activeAuctions: 23,
          lastUpdated: 34244,
        };
        await expect(stateRelayerProxy.connect(bot).updateVaultGeneralInformation(vaultInformationData))
          .to.emit(stateRelayerProxy, 'UpdateVaultGeneralInformation')
          .withArgs(Object.values(vaultInformationData), (await time.latest()) + 1);
        const receivedVaultInformationData = await stateRelayerProxy.vaultInfo();
        expect(receivedVaultInformationData.toString()).to.equal(Object.values(vaultInformationData).toString());
      });

      it('Should successfully set dexs data', async () => {
        ({ stateRelayerProxy, bot } = await loadFixture(deployContract));

        const dexDataEth: DexInfo = {
          primaryTokenPrice: 113,
          volume24H: 102021,
          totalLiquidity: 2164,
          APR: 14,
          firstTokenBalance: 31269,
          secondTokenBalance: 2314,
          rewards: 124,
          commissions: 3,
          lastUpdated: 1231,
          decimals: 18,
        };
        const dexDataBtc: DexInfo = {
          primaryTokenPrice: 112,
          volume24H: 102020,
          totalLiquidity: 2163,
          APR: 12,
          firstTokenBalance: 31265,
          secondTokenBalance: 2312,
          rewards: 123,
          commissions: 2,
          lastUpdated: 1233,
          decimals: 18,
        };
        const dexsData: DexInfo[] = [dexDataEth, dexDataBtc];
        const symbols: string[] = ['eth', 'btc'];
        await expect(stateRelayerProxy.connect(bot).updateDEXInfo(symbols, dexsData)).to.emit(
          stateRelayerProxy,
          'UpdateDEXInfo',
        );
        // Getting ETH dex Data
        const receivedEThDexData = await stateRelayerProxy.DEXInfoMapping(symbols[0]);
        // Testing that the received is as expected as dexDataEth
        expect(receivedEThDexData.toString()).to.equal(Object.values(dexDataEth).toString());
        // Getting BTC dex Data
        const receivedBtcDexData = await stateRelayerProxy.DEXInfoMapping(symbols[1]);
        // Testing that the received is as expected as dexDataBtc
        expect(receivedBtcDexData.toString()).to.equal(Object.values(dexDataBtc).toString());
      });
    });

    describe('Unsuccessfully updating individually', () => {
      // These tests should fail as the signer does not have the `BOT_ROLE` assigned.
      // Only addresses with role assigned as `BOT_ROLE` can perform the updates.

      it('`updateMasterNodeInformation` - Should successfully revert if the signer is not `bot`', async () => {
        ({ stateRelayerProxy, user } = await loadFixture(deployContract));
        const masterNodeData: MasterNode = {
          tvl: 108,
          zeroYearTVL: 101,
          fiveYearTVL: 102,
          tenYearTVL: 103,
          lastUpdated: 101010,
        };
        await expect(stateRelayerProxy.connect(user).updateMasterNodeInformation(masterNodeData)).to.be.reverted;
      });

      it('`updateVaultGeneralInformation` - Should successfully revert if the signer is not `bot`', async () => {
        ({ stateRelayerProxy, user } = await loadFixture(deployContract));
        const vaultInformationData: VaultGeneralInformation = {
          noOfVaults: 2,
          totalLoanValue: 1000,
          totalCollateralValue: 23432,
          totalCollateralizationRatio: 234,
          activeAuctions: 23,
          lastUpdated: 34244,
        };
        await expect(stateRelayerProxy.connect(user).updateVaultGeneralInformation(vaultInformationData)).to.be
          .reverted;
      });

      it('`updateDEXInfo` - Should successfully revert if the signer is not `bot`', async () => {
        ({ stateRelayerProxy, user } = await loadFixture(deployContract));

        const dexDataEth: DexInfo = {
          primaryTokenPrice: 113,
          volume24H: 102021,
          totalLiquidity: 2164,
          APR: 14,
          firstTokenBalance: 31269,
          secondTokenBalance: 2314,
          rewards: 124,
          commissions: 3,
          lastUpdated: 1231,
          decimals: 18,
        };
        await expect(stateRelayerProxy.connect(user).updateDEXInfo(['eth'], [dexDataEth])).to.be.reverted;
      });
    });
  });

  describe('Test batch call', () => {
    it('Should be able to update in batch ', async () => {
      ({ stateRelayerProxy, bot } = await loadFixture(deployContract));

      const masterNodeData: MasterNode = {
        tvl: 108,
        zeroYearTVL: 101,
        fiveYearTVL: 102,
        tenYearTVL: 103,
        lastUpdated: 101010,
      };
      const stateRelayerInterface = StateRelayer__factory.createInterface();
      const callDataForUpdatingMasterNodeData = stateRelayerInterface.encodeFunctionData(
        'updateMasterNodeInformation',
        [masterNodeData],
      );
      const vaultInformationData: VaultGeneralInformation = {
        noOfVaults: 2,
        totalLoanValue: 1000,
        totalCollateralValue: 23432,
        totalCollateralizationRatio: 234,
        activeAuctions: 23,
        lastUpdated: 34244,
      };
      const callDataForUpdatingVaultInformation = stateRelayerInterface.encodeFunctionData(
        'updateVaultGeneralInformation',
        [vaultInformationData],
      );

      const dexDataEth: DexInfo = {
        primaryTokenPrice: 113,
        volume24H: 102021,
        totalLiquidity: 2164,
        APR: 14,
        firstTokenBalance: 31269,
        secondTokenBalance: 2314,
        rewards: 124,
        commissions: 3,
        lastUpdated: 1231,
        decimals: 18,
      };
      const dexDataBtc: DexInfo = {
        primaryTokenPrice: 112,
        volume24H: 102020,
        totalLiquidity: 2163,
        APR: 12,
        firstTokenBalance: 31265,
        secondTokenBalance: 2312,
        rewards: 123,
        commissions: 2,
        lastUpdated: 1233,
        decimals: 18,
      };
      const dexsData: DexInfo[] = [dexDataEth, dexDataBtc];
      const symbols: string[] = ['eth', 'btc'];
      const callDataForUpdatingDexInfos = stateRelayerInterface.encodeFunctionData('updateDEXInfo', [
        symbols,
        dexsData,
      ]);
      await stateRelayerProxy
        .connect(bot)
        .batchCallByBot([
          callDataForUpdatingMasterNodeData,
          callDataForUpdatingVaultInformation,
          callDataForUpdatingDexInfos,
        ]);
      const receivedMasterNodeData = await stateRelayerProxy.masterNodeInformation();
      expect(receivedMasterNodeData.toString()).to.equal(Object.values(masterNodeData).toString());
      const receivedVaultInformationData = await stateRelayerProxy.vaultInfo();
      expect(receivedVaultInformationData.toString()).to.equal(Object.values(vaultInformationData).toString());
      // Getting ETH dex Data
      const receivedEThDexData = await stateRelayerProxy.DEXInfoMapping(symbols[0]);
      // Testing that the received is as expected as dexDataEth
      expect(receivedEThDexData.toString()).to.equal(Object.values(dexDataEth).toString());
      // Getting BTC dex Data
      const receivedBtcDexData = await stateRelayerProxy.DEXInfoMapping(symbols[1]);
      // Testing that the received is as expected as dexDataBtc
      expect(receivedBtcDexData.toString()).to.equal(Object.values(dexDataBtc).toString());
    });

    it('Should fail when the caller is not authorized ', async () => {
      ({ stateRelayerProxy, admin } = await loadFixture(deployContract));

      const masterNodeData: MasterNode = {
        tvl: 108,
        zeroYearTVL: 101,
        fiveYearTVL: 102,
        tenYearTVL: 103,
        lastUpdated: 101010,
      };
      const stateRelayerInterface = StateRelayer__factory.createInterface();
      const callDataForUpdatingMasterNodeData = stateRelayerInterface.encodeFunctionData(
        'updateMasterNodeInformation',
        [masterNodeData],
      );
      const botRole = await stateRelayerProxy.BOT_ROLE();

      await expect(
        stateRelayerProxy.connect(admin).batchCallByBot([callDataForUpdatingMasterNodeData]),
      ).to.revertedWith(`AccessControl: account ${admin.address.toLowerCase()} is missing role ${botRole}`);
    });

    it('Should fail when the batch call tries to use authorized function', async () => {
      ({ stateRelayerProxy, bot } = await loadFixture(deployContract));

      const stateRelayerInterface = StateRelayer__factory.createInterface();
      const encodedGrantRole = stateRelayerInterface.encodeFunctionData('grantRole', [
        `0x${'0'.repeat(64)}`,
        bot.address,
      ]);
      await expect(stateRelayerProxy.connect(bot).batchCallByBot([encodedGrantRole])).to.revertedWith(
        `AccessControl: account ${stateRelayerProxy.address.toLowerCase()} is missing role 0x${'0'.repeat(64)}`,
      );
    });

    it('Shuold fail when not granting state relayer the bot_role and then perform recursive batch call', async () => {
      ({ stateRelayerProxy, bot } = await loadFixture(deployContract));

      const stateRelayerInterface = StateRelayer__factory.createInterface();
      const encodedGrantRole = stateRelayerInterface.encodeFunctionData('batchCallByBot', [
        [stateRelayerInterface.encodeFunctionData('BOT_ROLE')],
      ]);
      const botRole = await stateRelayerProxy.BOT_ROLE();
      await expect(stateRelayerProxy.connect(bot).batchCallByBot([encodedGrantRole])).to.revertedWith(
        `AccessControl: account ${stateRelayerProxy.address.toLowerCase()} is missing role ${botRole}`,
      );
    });

    // This is to check whether the sanity works, in reality, NEVER GRANT THE SMART CONTRACT STATE RELAYER PROXY any role
    it('Should fail when granting state relayer the bot_role and then doing recursive batch calls', async () => {
      ({ stateRelayerProxy, bot, admin } = await loadFixture(deployContract));
      const botRole = await stateRelayerProxy.BOT_ROLE();
      await stateRelayerProxy.connect(admin).grantRole(botRole, stateRelayerProxy.address);
      const stateRelayerInterface = StateRelayer__factory.createInterface();
      const encodedGrantRole = stateRelayerInterface.encodeFunctionData('batchCallByBot', [
        [stateRelayerInterface.encodeFunctionData('BOT_ROLE')],
      ]);
      await expect(stateRelayerProxy.connect(bot).batchCallByBot([encodedGrantRole])).to.revertedWithCustomError(
        stateRelayerProxy,
        'ALREADY_IN_BATCH_CALL_BY_BOT',
      );
    });
  });
});

interface MasterNode {
  tvl: number;
  zeroYearTVL: number;
  fiveYearTVL: number;
  tenYearTVL: number;
  lastUpdated: number;
}

interface VaultGeneralInformation {
  noOfVaults: number;
  totalLoanValue: number;
  totalCollateralValue: number;
  totalCollateralizationRatio: number;
  activeAuctions: number;
  lastUpdated: number;
}

interface DexInfo {
  primaryTokenPrice: number;
  volume24H: number;
  totalLiquidity: number;
  APR: number;
  firstTokenBalance: number;
  secondTokenBalance: number;
  rewards: number;
  commissions: number;
  lastUpdated: number;
  decimals: number;
}
