# Autonolas internal audit
The review has been performed based on the contract code in the following repository:<br>
`https://github.com/valory-xyz/onchain-protocol` <br>
commit: `1947cb00ce26bb24d13110a90b370d8f73d6afd1` <br>
Documentation: [docs](https://github.com/valory-xyz/onchain-protocol/blob/main/docs) folder with updates from 20.05.22 <br>

## Objectives
Verifying that the system has been implemented as intended and does not have unexpected edge cases.
Identifying possible well-known vulnerabilities in smart contracts. 
Particular attention is paid to preventing attacks that can lead to the loss of system / user funds.

## Audit analysis
Audit analysis with various frameworks. [analysis](https://github.com/valory-xyz/onchain-protocol/blob/main/audits/analysis) Update: 20.05.22

### Security issues
Security suggestion and proposal patch: Change `Depository.deposit() / create()` function
so that at the time of bonding program creation the ratio of reserve0 / reserve1 in pairs is stored in a separate variable, plus
there would be an additional parameter of "maximum slippage" and the actual state is checked using the following calculation:
`|actual_reserve0/actual_reserver1 - reserve0/reserve1| < max_slippage` (or another alternative way). 
Tracking TWAP for all possible pair is unrealistic in terms of complexity and gas cost.

The full slither analysis can be found here: [slither](https://github.com/valory-xyz/onchain-protocol/blob/main/audits/analysis/slither).

The major security warnings are listed in the following file, concerns of which we address in more detail below:
[slither-full](https://github.com/valory-xyz/onchain-protocol/blob/main/audits/analysis/slither/slither_full.txt) 

Please note that all the external and audited contracts are not considered.

- https://github.com/crytic/slither/wiki/Detector-Documentation#divide-before-multiply. This is a false positive.
- https://github.com/crytic/slither/wiki/Detector-Documentation#dangerous-strict-equalities. This is a false positive.
However, we can refactor the `if` conditions.
- https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-1.
  - `Tokenomics.allowedNewBond()` - called by `Depository` contract only, that is called by the `create()` function, called by the DAO. Reentrancy does not apply;
  - `ServiceRegistry.createService()` - need to study more on the subject whether it requires reentrancy guard;
  - `ServiceRegistry.deploy()` - need to study more on the subject whether it requires reentrancy guard;
  - `Depository.deposit()` - the used token is approved (audited) by the DAO, so no malicious tokens can call this function. Need to study more.
- https://github.com/crytic/slither/wiki/Detector-Documentation#missing-events-access-control. This is a false positive. However, functions visibility has to be changed to `external`.
- https://github.com/crytic/slither/wiki/Detector-Documentation#missing-events-arithmetic. Need to add / update events.
- https://github.com/crytic/slither/wiki/Detector-Documentation#missing-zero-address-validation. This is a false positive, those addresses can never be zero. However, we will do additional checks.
- https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-2. Repeating mostly.
  - `Treasury.depositETHFromServices()` - false positive.
- https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-3. Mostly false positive due to ignoring modifiers, but we will check additionally.
- https://github.com/crytic/slither/wiki/Detector-Documentation#block-timestamp. Mostly implemented by design, but we will check additionally.
- https://github.com/crytic/slither/wiki/Detector-Documentation#costly-operations-inside-a-loop. These need to be checked additionally.
- https://github.com/crytic/slither/wiki/Detector-Documentation#missing-inheritance. This is a non-issue.

### Needed code design improvements
General considerations for reference:
- https://hackernoon.com/how-much-can-i-do-in-a-block-163q3xp2;
- https://www.npmjs.com/package/hardhat-gas-reporter;
- Consider splitting contracts as some of them are too big to deploy.

### Test coverage
Result of `npx hardhat coverage` (archive): [hardhat-coverage](https://github.com/valory-xyz/onchain-protocol/blob/main/audits/hardhat-coverage.tar.gz).


## Assessment of readiness for external audit
https://blog.trailofbits.com/2018/04/06/how-to-prepare-for-a-security-audit/

#### 1. Enable and address compiler warnings.
All the repository-related (non external) warnings have been addressed except for the contract size warning (see above).

#### 2. Increase unit and feature test coverage.
Add to fill in all coverage tests.

#### 3. Remove dead code, stale branches, unused libraries, and other extraneous weight
Resolved.

#### 4. Describe what your product does, who uses it, and how.
Constantly updated in [docs](https://github.com/valory-xyz/onchain-protocol/blob/main/docs).

#### 5. Add comments in-line with the code.
Make sure all functions have natspec comments. Some in-line comments will be added as well. However, the majority of the code is well commented

#### 6. Label and describe your tests. 
Resolved.

#### 7. Prepare the build environment. 
Resolved.

#### 8. Document the build process. 
Resolved.

