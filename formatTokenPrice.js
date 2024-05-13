const { log } = require('console');
const fs = require('fs');

let path = "wethPrice.json";
let input = fs.readFileSync(path)
input = JSON.parse(input);

let ans = []

input.forEach(item => {

    let block_timestamp = item.Date;
    const dateObj = new Date(block_timestamp);

    // Format the Date object to match the format of the Date in the first file
    const formattedDate = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}:${dateObj.getSeconds().toString().padStart(2, '0')}.${dateObj.getMilliseconds().toString().padStart(3, '0')}`;

    const unixTimestamp = dateObj.getTime() / 1000;
    let obj = {
        "Date": block_timestamp,
        "unixTimestamp": unixTimestamp,
        "price": item.Price
    }
    ans.push(obj);
})

fs.writeFileSync(path, JSON.stringify(ans, null, 2));

log("done");