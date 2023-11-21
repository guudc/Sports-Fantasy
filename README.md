# Sport Fantasy Smart Contract Deployment via Hardhat

## Overview

This guide provides step-by-step instructions for deploying a smart contract using Hardhat, a development environment for Ethereum. Hardhat streamlines the process of developing, testing, and deploying Ethereum smart contracts. This readme assumes you have already set up your smart contract project using Hardhat and have a basic understanding of Ethereum and Solidity.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js: [Download and install Node.js](https://nodejs.org/)
- npm (Node Package Manager): Included with Node.js installation
- Hardhat: Install with `npm install --save-dev hardhat`

## Getting Started

1. **Initialize Hardhat Project:**

   If you haven't already initialized your project with Hardhat, run the following command in your project's root directory:

   ```bash
   npx hardhat
   ```

   Follow the prompts to set up your Hardhat project. Select the appropriate options based on your development needs.

2. **Write your Smart Contract:**

   Create or import your Solidity smart contract in the `contracts/` directory of your Hardhat project.

3. **Configure Hardhat Deployment:**

   Edit the `hardhat.config.js` file to configure the network and deployment settings. Specify the target network, account, and other deployment parameters.

   Example:

   ```javascript
   module.exports = {
     networks: {
       hardhat: {},
       rinkeby: {
         url: `https://rinkeby.infura.io/v3/YOUR_INFURA_API_KEY`,
         accounts: [`0xYOUR_PRIVATE_KEY`],
       },
     },
   };
   ```

4. **Deploy Smart Contract:**

   Run the following command to compile and deploy your smart contract:

   ```bash
   npx hardhat run --network rinkeby scripts/deploy.js
   ```

   Replace `rinkeby` with the desired network and adjust the script path accordingly.

5. **Verify Deployment:**

   If you want to verify your contract on Etherscan, use the following command:

   ```bash
   npx hardhat verify --network rinkeby DEPLOYED_CONTRACT_ADDRESS
   ```

   Replace `rinkeby` with the network and `DEPLOYED_CONTRACT_ADDRESS` with the actual address of your deployed contract.

## Conclusion
