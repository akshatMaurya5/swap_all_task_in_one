const { mergeData } = require("./processTransactions")
const { runAll } = require("./pnl");
const { processSwaps } = require("./clean")
const { runQuery } = require('./runQuery')

const fs = require('fs');
const path = require('path');
const { log } = require("console");


function moveFilesToNewDirectory(name) {
    const sourceDirectory = './';
    const newDirectoryName = `${name}`;
    const destinationDirectory = path.join(sourceDirectory, newDirectoryName);

    if (!fs.existsSync(destinationDirectory)) {
        fs.mkdirSync(destinationDirectory);
    }

    const filesToMove = [`${name}_input.json`, `${name}_output.json`, `${name}finalSwaps.json`, `${name}_pnl.json`];

    filesToMove.forEach(file => {
        const sourcePath = path.join(sourceDirectory, file);
        const destinationPath = path.join(destinationDirectory, file);

        fs.rename(sourcePath, destinationPath, err => {
            if (err) {
                console.error('Error moving file:', err);
            } else {
                console.log(`Successfully moved ${file} to ${destinationDirectory}`);
            }
        });
    });
}



async function work(token) {

    let name = await runQuery(token.toLowerCase());
    console.log(name);

    // let name = "HOPPY";

    await mergeData(name);
    runAll(name);


    moveFilesToNewDirectory(name);
}




async function mulitiple() {



    let tokens =
        ["0x67965e813a7f10ca4Ea2C0387213cCD01f64DB56", "0x37498d2C39AD84345958E43af725c3039222A067", "0x1a2C865896b74A4b6cAA61b560F62D85ca4f89a2", "0x9A54Cd353b4Ed09A296e3443041e8087E87FfEcC", "0x492615CB4660943C014ee5950b9375912fF683B8", "0x8F43Ee50942E96D84052253AB13f59C1D942fb98", "0xe8e531AA894969759D0D4B207a972A3a97D287f0", "0x52f0Dab9B3fa77C8AC1A0544AD7F4fb9e55d677e", "0xCf4921A78b099182e078B0e0AEB7d7233fC12C49", "0x86669d3308E1998C36d4Fb381ed8Af41F4D638d9", "0x477a3d269266994F15E9C43A8D9C0561C4928088", "0x622984873c958e00aa0f004cbDd2B5301CF0b132", "0xB299751B088336E165dA313c33e3195B8c6663A6"]


    // tokens.forEach(item => {
    //     work(item);
    // })
    for (let i = 0; i < tokens.length; i++) {
        await work(tokens[i]);
        log(`done with ${i} = ${tokens[i]}`)
        // Wait for the processing of the current token to finish before moving to the next one
    }
}
mulitiple();
// work();






