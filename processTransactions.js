const fs = require('fs');
const Moralis = require("moralis").default;
const { EvmChain } = require("@moralisweb3/common-evm-utils");
const { log } = require('console');

require('dotenv').config();

const apiKey = process.env.API_KEY;

const chunkSize = 145;

let inputFile;

let processedAddresses = new Set();

let tokenName;

const getTokenData = async () => {

    if (!Moralis.Core.isStarted) {
        await Moralis.start({
            apiKey: apiKey
        });
    }
    // await Moralis.start({
    //     apiKey,
    // });

    inputFile = `${tokenName}_input.json`

    const rawData = fs.readFileSync(inputFile);
    const data = JSON.parse(rawData);

    // const tokenAddresses = data.map(entry => entry.token_address).filter(address => !processedAddresses.has(address));
    // log(tokenAddresses);
    let tokenAddresses = []

    let st = new Set();
    data.forEach(item => {
        st.add(item.token_address)
    })
    // log(st);
    st.forEach(item => {
        tokenAddresses.push(item)
    })

    // log(tokenAddresses);

    const chain = EvmChain.ETHEREUM;

    let outputData = [];

    for (let i = 0; i < tokenAddresses.length; i += chunkSize) {
        const batchAddresses = tokenAddresses.slice(i, i + chunkSize);

        const response = await Moralis.EvmApi.token.getTokenMetadata({
            addresses: batchAddresses,
            chain,
        });

        outputData = outputData.concat(response);

        console.log(`Processed batch ${i / chunkSize + 1}/${Math.ceil(tokenAddresses.length / chunkSize)}`);
    }

    // Add processed addresses to the set
    for (const entry of outputData) {
        processedAddresses.add(entry.address);
    }

    // Write the output to tempOutput.json
    fs.writeFileSync(`${tokenName}_output.json`, JSON.stringify(outputData, null, 2));

    console.log("STEP 1/3 DONE.");
};

const getSingleData = async () => {
    // Wait for getTokenData to complete before reading the tempOutput.json
    await getTokenData();

    const rawData = fs.readFileSync(`${tokenName}_output.json`);
    const dataArray = JSON.parse(rawData);

    clearFile();

    const oDArray = [].concat(...dataArray);

    const jsonData = JSON.stringify(oDArray, null, 2);

    // Write the JSON data to a file
    fs.writeFileSync(`${tokenName}_output.json`, jsonData, 'utf-8');

    console.log('STEP 2/3 DONE');
};

function clearFile() {
    fs.writeFileSync(`${tokenName}_output.json`, '');
}

function groupTransactions(inputFilePath, outputFilePath) {
    try {
        const data = fs.readFileSync(inputFilePath, 'utf8');

        // log("here");
        const transactions = JSON.parse(data);
        fs.writeFileSync(outputFilePath, '');

        const groupedTransactions = transactions.reduce((groups, transaction) => {
            const hash = transaction.transaction_hash;
            if (!groups[hash]) {
                groups[hash] = {
                    transaction_hash: hash,
                    initial_sender: transaction.initial_sender,
                    logs: []
                };
            }
            // Remove transaction_hash and initial_sender from each log
            const { transaction_hash, initial_sender, ...cleanedTransaction } = transaction;
            groups[hash].logs.push(cleanedTransaction);
            groups[hash].logs.sort((a, b) => parseInt(a.log_index) - parseInt(b.log_index));
            return groups;
        }, {});

        // Write grouped transactions to output file
        fs.writeFileSync(outputFilePath, JSON.stringify(Object.values(groupedTransactions), null, 2));
        console.log('Data has been written to', outputFilePath);
        log("STEP 1/3 DONE")
        groupThem();
    } catch (error) {
        console.error('Error:', error);
    }
}


async function groupThem() {
    let input = await JSON.parse(fs.readFileSync(`${tokenName}_output.json`));

    let res = [];

    for (let i = 0; i < input.length; i++) {
        const transactionHash = input[i].transaction_hash;
        const initialSender = input[i].initial_sender;
        const logs = input[i].logs;

        let groupedLogs = {};

        for (const log of logs) {
            const logIndex = log.log_index;
            if (!groupedLogs[logIndex]) {
                groupedLogs[logIndex] = [];
            }
            groupedLogs[logIndex].push(log);
        }

        // Remove the 'undefined' key from groupedLogs
        delete groupedLogs.undefined;

        res.push({
            transaction_hash: transactionHash,
            initial_sender: initialSender,
            grouped_logs: groupedLogs
        });
    }
    fs.writeFileSync(`${tokenName}_output.json`, '');
    fs.writeFileSync(`${tokenName}_output.json`, JSON.stringify(res, null, 2));


    log('STEP 2/3 DONE')

}

async function mergeData(token_name) {

    tokenName = token_name;
    await getSingleData();
    inputFile = `${tokenName}_input.json`;
    const outputData = JSON.parse(fs.readFileSync(`${tokenName}_output.json`, 'utf-8'));
    const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    // const inputData = JSON.parse(fs.readFileSync('inputdata.json', 'utf-8'));
    clearFile();
    const addressMap = new Map();

    for (const obj of outputData) {
        addressMap.set(obj.address, obj);
    }
    // log(addressMap);
    // return;

    alldata = []

    for (const inputTransaction of inputData) {

        const addressFromInput = inputTransaction.token_address;
        const txnHash = inputTransaction.transaction_hash;
        const dataFromMap = addressMap.get(addressFromInput);
        const currValue = inputTransaction.value;
        const decimals = dataFromMap.decimals;


        const newValue = Number(currValue) / Math.pow(10, Number(decimals));
        // log(dataFromMap.decimals)
        const newData = {
            transaction_hash: inputTransaction.transaction_hash,
            initial_sender: inputTransaction.initial_sender,
            sender: inputTransaction.sender,
            recipient: inputTransaction.recipient,
            token_address: inputTransaction.token_address,
            block_timestamp: inputTransaction.block_timestamp,
            symbol: dataFromMap.symbol,
            decimals: decimals,
            //    value:inputTransaction.value,
            value: newValue.toString(),
            log_index: inputTransaction.log_index
        }

        alldata.push(newData);
    }

    const jsonData = JSON.stringify(alldata, null, 2);
    fs.writeFileSync(`${tokenName}_output.json`, jsonData, 'utf-8');


    console.log("STEP 3/3 DONE")

    groupTransactions(`${tokenName}_output.json`, `${tokenName}_output.json`);

}

// mergeData();
module.exports = { mergeData };