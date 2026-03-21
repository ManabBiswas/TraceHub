import algosdk from "algosdk";

const generateFallbackTxId = () => {
  return (
    process.env.DEMO_FALLBACK_TXID ||
    "DEMO_TX_" + Math.random().toString(36).substring(7).toUpperCase()
  );
};

const unwrapSdkResult = async (maybeRequest) => {
  if (maybeRequest && typeof maybeRequest.do === "function") {
    return maybeRequest.do();
  }
  return maybeRequest;
};

const getAlgodClient = () => {
  const token = process.env.ALGOD_TOKEN || "";
  const server =
    process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud";
  const port = Number(process.env.ALGOD_PORT || 443);
  return new algosdk.Algodv2(token, server, port);
};

const getSignerMode = () =>
  String(process.env.ALGORAND_SIGNER_MODE || "mnemonic").toLowerCase();

const isDemoFallbackEnabled = () =>
  String(process.env.ALGORAND_DEMO_FALLBACK || "false").toLowerCase() ===
  "true";

const hasKmdConfig = () => {
  return Boolean(
    process.env.KMD_SERVER &&
    process.env.KMD_PORT &&
    process.env.KMD_TOKEN &&
    process.env.KMD_WALLET_NAME,
  );
};

const getAccountFromMnemonic = () => {
  const mnemonic = process.env.ALGORAND_ADMIN_MNEMONIC;
  if (!mnemonic) {
    throw new Error("ALGORAND_ADMIN_MNEMONIC not set");
  }
  return algosdk.mnemonicToSecretKey(mnemonic);
};

const getAccountFromKmd = async () => {
  if (!hasKmdConfig()) {
    throw new Error(
      "KMD config missing. Set KMD_SERVER, KMD_PORT, KMD_TOKEN, and KMD_WALLET_NAME",
    );
  }

  const kmdClient = new algosdk.Kmd(
    process.env.KMD_TOKEN,
    process.env.KMD_SERVER,
    Number(process.env.KMD_PORT),
  );

  const walletPassword = process.env.KMD_WALLET_PASSWORD || "";
  const walletsResponse = await unwrapSdkResult(kmdClient.listWallets());
  const wallets = walletsResponse.wallets || walletsResponse || [];

  const wallet = wallets.find(
    (item) => item.name === process.env.KMD_WALLET_NAME,
  );

  if (!wallet?.id) {
    throw new Error(`KMD wallet not found: ${process.env.KMD_WALLET_NAME}`);
  }

  const handleResponse = await unwrapSdkResult(
    kmdClient.initWalletHandle(wallet.id, walletPassword),
  );
  const walletHandleToken =
    handleResponse.wallet_handle_token || handleResponse.walletHandleToken;

  if (!walletHandleToken) {
    throw new Error("Unable to initialize KMD wallet handle");
  }

  try {
    const keysResponse = await unwrapSdkResult(
      kmdClient.listKeys(walletHandleToken),
    );
    const addresses = keysResponse.addresses || keysResponse || [];

    const requestedAddress = process.env.KMD_ACCOUNT_ADDRESS;
    const selectedAddress = requestedAddress || addresses[0];

    if (!selectedAddress) {
      throw new Error("No account found in KMD wallet");
    }

    if (requestedAddress && !addresses.includes(requestedAddress)) {
      throw new Error(
        `KMD_ACCOUNT_ADDRESS not found in wallet '${process.env.KMD_WALLET_NAME}': ${requestedAddress}`,
      );
    }

    const keyResponse = await unwrapSdkResult(
      kmdClient.exportKey(walletHandleToken, walletPassword, selectedAddress),
    );

    const privateKey = keyResponse.private_key || keyResponse.privateKey;
    if (!privateKey) {
      throw new Error("KMD returned empty private key");
    }

    return {
      addr: selectedAddress,
      sk: privateKey,
    };
  } finally {
    try {
      await unwrapSdkResult(kmdClient.releaseWalletHandle(walletHandleToken));
    } catch (_error) {
      // Non-fatal cleanup failure
    }
  }
};

const resolveSigningAccount = async () => {
  const mode = getSignerMode();

  if (mode === "kmd") {
    return getAccountFromKmd();
  }

  if (mode === "mnemonic") {
    return getAccountFromMnemonic();
  }

  throw new Error(
    `Unsupported ALGORAND_SIGNER_MODE: ${mode}. Use 'mnemonic' or 'kmd'.`,
  );
};

async function mintVersionProof({
  entityType,
  entityId,
  versionNumber,
  action,
  actor,
  referenceUrl = "",
  payload = {},
}) {
  try {
    const algodClient = getAlgodClient();
    const account = await resolveSigningAccount();
    const suggestedParams = await algodClient.getTransactionParams().do();

    const notePayload = JSON.stringify({
      app: "TraceHub",
      event: "VERSION_SNAPSHOT",
      entityType,
      entityId,
      versionNumber,
      action,
      actor,
      referenceUrl,
      payload,
      timestamp: new Date().toISOString(),
    });

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: account.addr,
      receiver: account.addr,
      amount: 0,
      note: new TextEncoder().encode(notePayload),
      suggestedParams,
    });

    const signedTxn = algosdk.signTransaction(txn, account.sk);
    const { txid } = await algodClient.sendRawTransaction(signedTxn.blob).do();

    await algosdk.waitForConfirmation(algodClient, txid, 4);
    return txid;
  } catch (error) {
    const message = error?.message || String(error);
    console.error("Algorand version mint error:", message);

    if (isDemoFallbackEnabled()) {
      return generateFallbackTxId();
    }

    throw new Error(`Algorand mint failed: ${message}`);
  }
}

async function mintProofOfPublication(dualityUrl, uploaderName) {
  return mintVersionProof({
    entityType: "RESOURCE",
    entityId: "publication",
    versionNumber: 1,
    action: "CREATE",
    actor: uploaderName,
    referenceUrl: dualityUrl || "",
    payload: {
      dualityUrl: dualityUrl || "",
    },
  });
}

export { mintProofOfPublication, mintVersionProof };
