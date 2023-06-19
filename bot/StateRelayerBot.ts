/* eslint-disable no-console */
import { getWhaleClient } from '@waveshq/walletkit-bot';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';

import { StateRelayer, StateRelayer__factory } from '../generated';
import { DataStore, MasterNodesData, PairData, StateRelayerHandlerProps, VaultData } from './types';

const DENOMINATION = 'USDT';
const DECIMALS = 10;

const transformToEthersBigNumber = (str: string, decimals: number): ethers.BigNumber =>
  ethers.BigNumber.from(
    new BigNumber(str).multipliedBy(new BigNumber('10').pow(decimals)).integerValue(BigNumber.ROUND_FLOOR).toString(),
  );

export async function handler(props: StateRelayerHandlerProps): Promise<DFCData | undefined> {
  const { urlNetwork, envNetwork, signer, contractAddress } = props;
  const stateRelayerContract = new ethers.Contract(contractAddress, StateRelayer__factory.abi, signer) as StateRelayer;
  const dataStore = {} as DataStore;
  const dataVault = {} as VaultData;
  const dataMasterNode = {} as MasterNodesData;
  try {
    // TODO: Check if Function should run (blockHeight > 30 from previous)
    // Get Data from OCEAN API
    const client = getWhaleClient(urlNetwork, envNetwork);
    const statsData = await client.stats.get();
    const rawPoolpairData = await client.poolpairs.list(200);
    const dexPriceData = await client.poolpairs.listDexPrices(DENOMINATION);

    // sanitise response data
    const poolpairData = rawPoolpairData.filter((pair: any) => !pair.displaySymbol.includes('/'));

    /* ------------ Data from /dex ----------- */
    // totalValueLockInPoolPair
    dataStore.totalValueLockInPoolPair = statsData.tvl.dex.toString();

    // total24HVolume
    const total24HVolume = poolpairData.reduce((acc, currPair) => acc + (currPair.volume?.h24 ?? 0), 0);
    dataStore.total24HVolume = total24HVolume.toString();

    // pair
    const pair = poolpairData.reduce<PairData>((acc, currPair) => {
      let tokenPrice = new BigNumber(0);
      // price ratio is
      const priceRatio = currPair.priceRatio.ba;
      const { symbol } = currPair.tokenB;
      if (symbol === DENOMINATION || new BigNumber(priceRatio).isZero()) {
        tokenPrice = new BigNumber(priceRatio);
      } else {
        const dexPricePerToken = new BigNumber(dexPriceData.dexPrices[symbol]?.denominationPrice ?? 0);
        tokenPrice = dexPricePerToken.multipliedBy(currPair.priceRatio.ba);
      }
      return {
        ...acc,
        [currPair.displaySymbol]: {
          primaryTokenPrice: transformToEthersBigNumber(tokenPrice.toString(), DECIMALS),
          volume24H: transformToEthersBigNumber(currPair.volume?.h24.toString() ?? '0', DECIMALS),
          totalLiquidity: transformToEthersBigNumber(currPair.totalLiquidity.usd ?? '0', DECIMALS),
          APR: transformToEthersBigNumber(currPair.apr?.total.toString() ?? '0', DECIMALS),
          firstTokenBalance: transformToEthersBigNumber(currPair.tokenA.reserve, DECIMALS),
          secondTokenBalance: transformToEthersBigNumber(currPair.tokenB.reserve, DECIMALS),
          rewards: transformToEthersBigNumber(currPair.apr?.reward.toString() ?? '0', DECIMALS),
          commissions: transformToEthersBigNumber(currPair.commission, DECIMALS),
          // todo later
          lastUpdated: '0',
          decimals: DECIMALS,
        },
      } as PairData;
    }, {} as PairData);
    dataStore.pair = pair;
    // TODO: Get Data from /dex/[pool-pair]
    // Data from vaults
    const totalLoanValue = statsData.loan.value.loan;
    const totalCollateralValue = statsData.loan.value.collateral;
    dataVault.vaults = statsData.loan.count.openVaults.toString();
    dataVault.totalLoanValue = transformToEthersBigNumber(totalLoanValue.toString(), DECIMALS);
    dataVault.totalCollateralValue = transformToEthersBigNumber(totalCollateralValue.toString(), DECIMALS);
    dataVault.totalCollateralizationRatio = ((totalCollateralValue / totalLoanValue) * 100).toFixed(0).toString();
    dataVault.activeAuctions = statsData.loan.count.openAuctions.toString();
    dataVault.lastUpdated = '0';
    // Data from Master Nodes
    dataMasterNode.totalValueLockedInMasterNodes = transformToEthersBigNumber(
      statsData.tvl.masternodes.toString(),
      DECIMALS,
    );
    dataMasterNode.zeroYearLocked = transformToEthersBigNumber(
      statsData.masternodes.locked[0].tvl.toString(),
      DECIMALS,
    );
    dataMasterNode.fiveYearLocked = transformToEthersBigNumber(
      statsData.masternodes.locked[2].tvl.toString(),
      DECIMALS,
    );
    dataMasterNode.tenYearLocked = transformToEthersBigNumber(statsData.masternodes.locked[1].tvl.toString(), DECIMALS);
    dataMasterNode.lastUpdated = '0';

    // TODO: Get Data from all burns in ecosystem
    // Call SC Function to update Data
    // Update Dex information
    await stateRelayerContract.updateDEXInfo(Object.keys(dataStore.pair), Object.values(dataStore.pair) as any);
    // Update Master Node information
    await stateRelayerContract.updateMasterNodeInformation(Object.values(dataMasterNode) as any);
    // Update Vault general information
    await stateRelayerContract.updateVaultGeneralInformation(Object.values(dataVault) as any);

    return { dataStore, dataVault, dataMasterNode };
  } catch (e) {
    console.error((e as Error).message);
    return undefined;
  }
}

interface DFCData {
  dataStore: DataStore;
  dataVault: VaultData;
  dataMasterNode: MasterNodesData;
}
