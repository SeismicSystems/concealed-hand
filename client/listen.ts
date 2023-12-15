import { EventABIs, contract, publicClient } from "./utils";

Object.values(EventABIs).forEach((abi) => {
    publicClient.watchEvent({
        address: contract.address,
        event: abi,
        strict: true,
        onLogs: (logs) => {
            logs.forEach((log) =>
                console.log({ eventName: log["eventName"], args: log["args"] })
            );
        },
    });
});
