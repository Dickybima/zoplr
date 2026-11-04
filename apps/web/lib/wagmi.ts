// `injected` diimpor dari "wagmi" (bukan "wagmi/connectors") supaya bundle
// tidak ikut menarik semua connector pihak ketiga.
import { createConfig, http, injected } from "wagmi";
import { chain, rpcUrl } from "./chain";

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  transports: { [chain.id]: http(rpcUrl) },
  ssr: true,
});
