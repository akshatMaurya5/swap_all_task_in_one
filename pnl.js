
const { log } = require('console');
const fs = require('fs');
const { processSwaps } = require('./clean'); // Importing processSwaps function from clean.js

let tokenName;

function step1() {
    let data = JSON.parse(fs.readFileSync(`${tokenName}_output.json`));

    let ans = [];

    data.forEach(item => {
        let copy = item;
        let grouped_logs = item.grouped_logs;

        for (const logNumber in grouped_logs) {
            if (grouped_logs.hasOwnProperty(logNumber)) {
                const logArray = grouped_logs[logNumber];
                let arr = [];
                arr.push(logArray[0]);
                copy.grouped_logs[logNumber] = arr;
            }
        }
        ans.push(copy);
    });

    log("Output processing completed");

    gettingSingle(ans);
}

function gettingSingle(data) {
    let res = [];

    data.forEach(item => {
        let arr = [];
        let grouped_logs = item.grouped_logs;

        for (const logNumber in grouped_logs) {
            arr.push(grouped_logs[logNumber]);
        }

        let singleArray = [];

        arr.forEach(item => {
            item.forEach(subItem => {
                singleArray.push(subItem);
            });
        });

        let obj = {
            "transaction_hash": item.transaction_hash,
            "initial_sender": item.initial_sender,
            "swaps": singleArray
        };
        res.push(obj);
    });

    log("Single processing completed");

    pairingSwaps(res);
}

function pairingSwaps(data) {
    let ans = [];

    data.forEach(item => {
        let swap = item.swaps;
        let newSwaps = [];

        for (let i = 0; i < swap.length - 1; i++) {
            let j = i + 1;

            let sender0 = swap[i].sender;
            let recipient0 = swap[i].recipient;
            let sender1 = swap[j].sender;
            let recipient1 = swap[j].recipient;

            let block_timestamp = swap[i].block_timestamp;

            let token0address = swap[i].token_address;
            let token0symbol = swap[i].symbol;
            let amount0 = swap[i].value;

            let token1address = swap[j].token_address;
            let token1symbol = swap[j].symbol;
            let amount1 = swap[j].value;

            if (token0address == token1address) {
                continue;
            }

            const dateObj = new Date(block_timestamp);
            const formattedDate = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}:${dateObj.getSeconds().toString().padStart(2, '0')}.${dateObj.getMilliseconds().toString().padStart(3, '0')}`;
            const unixTimestamp = dateObj.getTime() / 1000;

            let obj = {
                sender0: sender0,
                recipient0: recipient0,
                sender1: sender1,
                recipient1: recipient1,
                formattedDate: formattedDate,
                block_timestamp: block_timestamp,
                unixTimestamp: unixTimestamp,
                token0_address: token0address,
                token0_symbol: token0symbol,
                amount0: parseFloat(amount0),
                token1_address: token1address,
                token1_symbol: token1symbol,
                amount1: parseFloat(amount1)
            };
            newSwaps.push(obj);
        }

        let finalObj = {
            transaction_hash: item.transaction_hash,
            initial_sender: item.initial_sender,
            swaps: newSwaps
        };
        ans.push(finalObj);
    });

    log("Swaps processing completed");

    pairingSendersAddressWise(ans);
}

function pairingSendersAddressWise(data) {
    let mpp = new Map();

    data.forEach(item => {
        let initial_sender = item.initial_sender;

        if (!mpp.has(initial_sender)) {
            mpp.set(initial_sender, []);
        }
        mpp.get(initial_sender).push(item);
    });

    let ans = [];

    for (let [key, value] of mpp.entries()) {
        let sender = key;
        let transactions = value;

        transactions.forEach(transaction => {
            transaction.swaps.sort((a, b) => a.unixTimestamp - b.unixTimestamp);
        });

        let obj = {
            "initial_sender": sender,
            "transactions": transactions
        };
        ans.push(obj);
    }

    ans = processSwaps(ans, tokenName); // Process swaps using processSwaps function

    fs.writeFileSync(`${tokenName}finalSwaps.json`, JSON.stringify(ans, null, 2));

    log("Final processing completed");
}

function fillMap(map, path) {
    let data = fs.readFileSync(path)
    data = JSON.parse(data);

    data.forEach(item => {
        map.set(item.unixTimestamp, item.price);
    });
}

function findClosestKey(number) {
    let closestKey;
    let minDifference = Infinity;

    for (const key of wethMap.keys()) {
        const difference = Math.abs(key - number);
        if (difference < minDifference) {
            minDifference = difference;
            closestKey = key;
        }
    }

    return closestKey;
}

function pnl(input) {
    let ans = []
    input.forEach(item => {
        let initial_sender = item.initial_sender;
        let transactions = item.transactions;

        let spent = 0;
        let got = 0;

        transactions.forEach(transaction => {
            let swaps = transaction.swaps;

            swaps.forEach(swap => {
                let token0_symbol = swap.token0_symbol;
                let token1_symbol = swap.token1_symbol;
                let token0_amount = swap.amount0;
                let token1_amount = swap.amount1;
                let timestamp = swap.unixTimestamp;

                if (token0_symbol == "WETH" && token1_symbol == tokenName) {
                    // WETH -> CLOSEDAI
                    let priceOfToken0AtThatTime = wethMap.get(findClosestKey(timestamp));
                    let moneySpent = token0_amount * priceOfToken0AtThatTime;
                    spent += moneySpent;
                }
                else if (token0_symbol == tokenName && token1_symbol == "WETH") {
                    // CLOSEDAI -> WETH
                    let priceOfToken1AtThatTime = wethMap.get(findClosestKey(timestamp));
                    let moneyGot = token1_amount * priceOfToken1AtThatTime;
                    got += moneyGot;
                }
            });
        });

        let pnl = got - spent;

        pnl = Math.abs(pnl);

        let obj = {
            "sender": initial_sender,
            "pnl": pnl
        };
        // log(obj);
        ans.push(obj);
    });

    ans.sort((a, b) => b.pnl - a.pnl);

    fs.writeFileSync(`${tokenName}_pnl.json`, JSON.stringify(ans, null, 2))
    log(`done, output in ${tokenName}_pnl.json`)
}

let wethMap = new Map();



function runforPnL() {
    fillMap(wethMap, 'wethPrice.json');
    pnl(JSON.parse(fs.readFileSync(`${tokenName}finalSwaps.json`)));
}

// Function to run all steps
function runAll(token_name) {
    tokenName = token_name;
    step1();
    runforPnL();
}

module.exports = { runAll }; // Exporting runAll function for external use