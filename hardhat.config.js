require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

module.exports = {
  solidity : {
    version : '0.8.28',
    settings : {optimizer : {enabled : true, runs : 200}}
  },

  networks : {
    sepolia : {
      url : process.env.SEPOLIA_RPC_URL,
      chainId : 11155111,
      accounts : process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },

  paths : {
    sources : './contracts',
    tests : './test',
    cache : './cache',
    artifacts : './artifacts'
  }
};