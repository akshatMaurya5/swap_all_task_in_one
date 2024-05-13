const fs = require('fs');

function processSwaps(input, otherToken) {
    const st = new Set([otherToken, "WETH"]);

    function good(swap) {
        return st.has(swap.token0_symbol) && st.has(swap.token1_symbol);
    }

    function filterSwaps(input) {
        input.forEach(item => {
            let transactions = item.transactions;
            transactions.forEach(transaction => {
                let swaps = transaction.swaps;
                let newSwaps = [];
                for (let i = 0; i < swaps.length; i++) {
                    if (good(swaps[i])) {
                        newSwaps.push(swaps[i]);
                    } else if (!st.has(swaps[i].token1_symbol)) {
                        let startPoint = swaps[i];
                        let currTokenSymbol = swaps[i].token1_symbol;
                        let j = i + 1;
                        while (j < swaps.length) {
                            if (swaps[j].token0_symbol == currTokenSymbol && !st.has(swaps[j].token1_symbol)) {
                                currTokenSymbol = swaps[j].token1_symbol;
                                j++;
                            } else {
                                break;
                            }
                        }
                        i = j;
                        if (j < swaps.length) {
                            let modifiedSwap = Object.assign({}, startPoint);
                            modifiedSwap.token1_address = swaps[j].token1_address;
                            modifiedSwap.token1_symbol = swaps[j].token1_symbol;
                            modifiedSwap.amount1 = swaps[j].amount1;
                            newSwaps.push(modifiedSwap);
                        }
                    }
                }
                transaction.swaps = newSwaps;
            });
        });

        // input.forEach(item => {
        //     let transactions = item.transactions;
        //     transactions.forEach(transaction => {
        //         let swaps = transaction.swaps;
        //         if (!st.has(swaps[0].token0_symbol) && swaps[0].token1_symbol == "WETH") {
        //             swaps.shift();
        //         }
        //         transaction.swaps = swaps;
        //     });
        // });
    }

    filterSwaps(input);

    input.forEach(item => {
        let txns = item.transactions;
        txns.forEach(txn => {
            let swaps = txn.swaps;
            let newSwaps = [];
            swaps.forEach(swap => {
                if (swap.token1_symbol != swap.token0_symbol) {
                    newSwaps.push(swap);
                }
            });
            txn.swaps = newSwaps;
        });
    });

    return input;
}


module.exports = { processSwaps };