const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const { getTokenName } = require('./tokenName');
const { log } = require('console');

const bigquery = new BigQuery({
    keyFilename: './applicationKey.json',
});

async function runQuery(tokenAddress) {
    try {
        let name = await getTokenName(tokenAddress);
        // log(name, "in runquery function");

        const query = `
        
        WITH token_data AS (
            SELECT 
                transaction_hash,
                from_address AS sender,
                to_address AS recipient,
                token_address,
                FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S %Z', block_timestamp) AS block_timestamp,
                value,
                log_index
            FROM \`bigquery-public-data.crypto_ethereum.token_transfers\`
            WHERE block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 8 DAY)
        ),
        
        log_data AS (
            SELECT *
            FROM \`bigquery-public-data.crypto_ethereum.logs\`
            WHERE block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 8 DAY)
        ),
        
        txn_data AS (
            SELECT *
            FROM \`bigquery-public-data.crypto_ethereum.transactions\`
            WHERE block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 8 DAY)
        ),
        
        swap_data_final AS (
            SELECT
                d.transaction_hash,
                d.sender,
                d.recipient,
                d.token_address,
                d.block_timestamp,
                d.value,
                d.log_index
            FROM token_data AS d
            INNER JOIN log_data AS l
            ON d.transaction_hash = l.transaction_hash
            WHERE 
                d.sender IN ('0x0000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
                            '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67',
                            '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
                            '0xbeee1e6e7fe307ddcf84b0a16137a4430ad5e2480fc4f4a8e250ab56ccd7630d',
                            '0x62db2e87ad4360c521a990935f97f7c44833c4f99a8f1c09129331715b07f525',
                            '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83',
                            '0x34660fc8af304464529f48a778e03d03e4d34bcd5f9b6f0cfbf3cd238c642f7f')
                OR d.recipient IN ('0x0000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
                                    '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67',
                                    '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
                                    '0xbeee1e6e7fe307ddcf84b0a16137a4430ad5e2480fc4f4a8e250ab56ccd7630d',
                                    '0x62db2e87ad4360c521a990935f97f7c44833c4f99a8f1c09129331715b07f525',
                                    '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83',
                                    '0x34660fc8af304464529f48a778e03d03e4d34bcd5f9b6f0cfbf3cd238c642f7f')
                OR EXISTS (
                    SELECT 1 FROM UNNEST(l.topics) AS topic
                    WHERE topic IN ('0x0000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
                                    '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67',
                                    '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
                                    '0xbeee1e6e7fe307ddcf84b0a16137a4430ad5e2480fc4f4a8e250ab56ccd7630d',
                                    '0x62db2e87ad4360c521a990935f97f7c44833c4f99a8f1c09129331715b07f525',
                                    '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83',
                                    '0x34660fc8af304464529f48a778e03d03e4d34bcd5f9b6f0cfbf3cd238c642f7f')
                )
        ),
        
        query as (
            SELECT
            sdf.*,
            txn_data.from_address AS initial_sender
            FROM swap_data_final sdf
            INNER JOIN txn_data
            ON sdf.transaction_hash = txn_data.hash
        )
        
        SELECT * FROM query WHERE transaction_hash IN (SELECT DISTINCT(transaction_hash) FROM query WHERE token_address = '${tokenAddress}');
        `;

        const [rows] = await bigquery.query(query);

        fs.writeFileSync(`${name}_input.json`, JSON.stringify(rows));
        console.log(`Results written to ${name}_input.json`);
        return name;
    } catch (error) {
        console.error('Error running query:', error);
    }
}

module.exports = { runQuery }
