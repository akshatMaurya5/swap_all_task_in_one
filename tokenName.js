const fs = require('fs');
const Moralis = require("moralis").default;
const { EvmChain } = require("@moralisweb3/common-evm-utils");
const { log } = require('console');

require('dotenv').config();
const apiKey = process.env.API_KEY1

const getTokenName = async (address) => {
    // await Moralis.start({
    //     apiKey: apiKey
    //     // ...and any other configuration
    // });

    if (!Moralis.Core.isStarted) {
        await Moralis.start({
            apiKey: apiKey
        });
    }

    const addresses = [
        address
    ];

    const chain = EvmChain.ETHEREUM;

    const response = await Moralis.EvmApi.token.getTokenMetadata({
        addresses,
        chain,
    });

    let data = response.toJSON();

    return data[0].symbol;
};

module.exports = { getTokenName };