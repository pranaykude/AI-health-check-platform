const net = require('net');

const client = new net.Socket();
console.log("Probing port 27017...");
client.setTimeout(2000);

client.connect(27017, '127.0.0.1', () => {
    console.log("PORT 27017 IS OPEN!");
    client.destroy();
    process.exit(0);
});

client.on('error', (err) => {
    console.error("PORT 27017 IS CLOSED:", err.message);
    process.exit(1);
});

client.on('timeout', () => {
    console.error("PORT 27017 TIMEOUT");
    process.exit(2);
});
