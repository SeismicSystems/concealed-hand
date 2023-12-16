import { EventABIs, contractInterfaceSetup } from "./lib/utils";
import { DEV_PRIVKEY } from "./lib/constants";

/*
 * Prints all DrawContract events to stdout as they come.
 */
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
