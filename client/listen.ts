import { EventABIs, contractInterfaceSetup } from "./utils";
import { DEV_PRIVKEY } from "./constants";

let [publicClient, contract] = contractInterfaceSetup(DEV_PRIVKEY);
Object.values(EventABIs).forEach((abi) => {
    publicClient.watchEvent({
        address: contract.address,
        event: abi,
        strict: true,
        onLogs: (logs: [any]) => {
            logs.forEach((log) =>
                console.log({ eventName: log["eventName"], args: log["args"] })
            );
        },
    });
});
